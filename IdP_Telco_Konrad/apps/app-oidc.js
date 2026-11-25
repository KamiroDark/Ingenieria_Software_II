'use strict';
/**
 * Plantilla de aplicación web que delega la autenticación en el IdP (cliente OIDC confidencial).
 * Cada aplicación del TO-BE se crea con esta función; solo cambian sus pantallas y datos de prueba.
 *
 * Lo que hace por la aplicación:
 *  - /login: redirige al IdP con state, nonce y PKCE (S256).
 *  - /callback: canjea el código servidor a servidor y valida el ID token (firma JWKS, iss, aud, exp, nonce).
 *  - Sesión local con cookie HttpOnly; renueva el access token con el refresh token antes de que venza.
 *  - /logout: cierra la sesión local y la del IdP (RP-Initiated Logout).
 *  - /backchannel-logout: el IdP avisa que la sesión terminó en otra aplicación.
 *  - Autorización por roles (claim "roles" del token).
 */
const http = require('node:http');
const cfg = require('../config');
const {
  rand, sha256, sha256b64u, safeEqual, esc, parseCookies, setCookie, clearCookie,
  readForm, html, json, redirect, withParams, bearer,
} = require('../lib/http');
const jwt = require('../lib/jwt');
const ui = require('../lib/ui');

const ahora = () => Math.floor(Date.now() / 1000);
const getKey = jwt.jwksClient(`${cfg.IDP_URL}/jwks.json`);
const EVENTO_LOGOUT = 'http://schemas.openid.net/event/backchannel-logout';

/** Valida un access token recibido por una API (Bearer). Lo usan las APIs de las aplicaciones. */
async function validarBearer(req, rolesPermitidos) {
  const t = bearer(req);
  if (!t) return { status: 401, error: 'Falta el header Authorization: Bearer' };
  try {
    const p = await jwt.verify(t, getKey, { issuer: cfg.IDP_URL, audience: cfg.API_AUDIENCE });
    if (rolesPermitidos && !p.roles?.some((r) => rolesPermitidos.includes(r))) return { status: 403, error: 'El token es válido pero no tiene un rol autorizado' };
    return { status: 200, claims: p };
  } catch (e) {
    return { status: 401, error: e.message };
  }
}

function crearApp(def) {
  const client = cfg.CLIENTS.find((c) => c.client_id === def.id);
  const URL_APP = cfg.appUrl(def);
  const prefijo = `tk_${def.id.replace(/-/g, '_')}`;
  const COOKIE = `${prefijo}_sesion`;
  const COOKIE_TX = `${prefijo}_tx`;
  const sesiones = new Map();      // sha256(cookie) → sesión local
  const transacciones = new Map(); // state → { verifier, nonce, volver, extra }

  async function llamarToken(params) {
    const r = await fetch(`${cfg.IDP_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${encodeURIComponent(client.client_id)}:${encodeURIComponent(client.client_secret)}`).toString('base64'),
      },
      body: new URLSearchParams(params),
    });
    const cuerpo = await r.json().catch(() => ({}));
    return { ok: r.ok, cuerpo };
  }

  function leerSesion(req) {
    const token = parseCookies(req)[COOKIE];
    if (!token) return null;
    const clave = sha256(token).toString('hex');
    const s = sesiones.get(clave);
    return s ? { clave, s } : null;
  }

  /** Devuelve la sesión con un access token vigente; si el IdP ya no la reconoce, la elimina. */
  async function sesionVigente(req) {
    const actual = leerSesion(req);
    if (!actual) return null;
    const { s, clave } = actual;
    if (s.atExp - 30 > ahora()) return s;
    const r = await llamarToken({ grant_type: 'refresh_token', refresh_token: s.refreshToken });
    if (!r.ok) { sesiones.delete(clave); return null; }
    s.accessToken = r.cuerpo.access_token;
    s.refreshToken = r.cuerpo.refresh_token;
    s.atExp = ahora() + r.cuerpo.expires_in;
    return s;
  }

  function iniciarLogin(res, { volver = '/', extra = {}, contexto = {} } = {}) {
    const state = rand(24);
    const nonce = rand(24);
    const verifier = rand(48);
    transacciones.set(state, { verifier, nonce, volver, contexto, creado: ahora() });
    setCookie(res, COOKIE_TX, state, { maxAge: 600 });
    redirect(res, withParams(`${cfg.IDP_URL}/authorize`, {
      response_type: 'code', client_id: client.client_id, redirect_uri: client.redirect_uris[0],
      scope: 'openid profile email roles', state, nonce,
      code_challenge: sha256b64u(verifier), code_challenge_method: 'S256', ...extra,
    }));
  }

  function paginaError(res, status, titulo, detalle, accion = '<a class="btn" href="/login">Intentar de nuevo</a>') {
    html(res, status, ui.pagina({
      titulo: `${titulo} · ${def.nombre}`, acento: def.color,
      cuerpo: `<div class="narrow"><p class="eyebrow">${esc(def.nombre)}</p><div class="card"><h2>${esc(titulo)}</h2><p class="muted">${detalle}</p><p>${accion}</p></div></div>`,
    }));
  }

  async function callback(req, res, q) {
    const state = q.get('state') || '';
    const tx = transacciones.get(state);
    const cookieTx = parseCookies(req)[COOKIE_TX];
    clearCookie(res, COOKIE_TX);
    // state debe existir y estar ligado a este navegador (cookie): evita CSRF de login.
    if (!tx || !safeEqual(cookieTx, state) || tx.creado + 600 < ahora()) {
      return paginaError(res, 400, 'Inicio de sesión inválido', 'La respuesta del IdP no corresponde a un inicio de sesión de este navegador.');
    }
    transacciones.delete(state);
    if (q.get('iss') && q.get('iss') !== cfg.IDP_URL) return paginaError(res, 400, 'Emisor inesperado', 'La respuesta no viene del IdP de Telco Konrad.');
    if (q.get('error')) return paginaError(res, 401, 'El IdP no autorizó el ingreso', esc(q.get('error_description') || q.get('error')));

    const r = await llamarToken({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: client.redirect_uris[0], code_verifier: tx.verifier });
    if (!r.ok) return paginaError(res, 401, 'No se pudo completar el inicio de sesión', esc(r.cuerpo.error_description || r.cuerpo.error || 'Error al canjear el código'));

    let claims;
    try {
      claims = await jwt.verify(r.cuerpo.id_token, getKey, { issuer: cfg.IDP_URL, audience: client.client_id, nonce: tx.nonce });
    } catch (e) {
      return paginaError(res, 401, 'ID token inválido', esc(e.message));
    }
    if (def.validarIngreso) {
      const motivo = def.validarIngreso(claims, tx.contexto);
      if (motivo) return paginaError(res, 403, 'Acceso denegado', esc(motivo), '');
    }

    const token = rand(32);
    sesiones.set(sha256(token).toString('hex'), {
      claims, sid: claims.sid, idToken: r.cuerpo.id_token, accessToken: r.cuerpo.access_token,
      refreshToken: r.cuerpo.refresh_token, atExp: ahora() + r.cuerpo.expires_in, csrf: rand(18), creada: ahora(),
    });
    setCookie(res, COOKIE, token, { maxAge: 8 * 3600 });
    redirect(res, tx.volver || '/');
  }

  async function logout(req, res) {
    const f = await readForm(req);
    const actual = leerSesion(req);
    if (!actual || !safeEqual(f.csrf, actual.s.csrf)) return redirect(res, '/');
    sesiones.delete(actual.clave);
    clearCookie(res, COOKIE);
    redirect(res, withParams(`${cfg.IDP_URL}/logout`, { id_token_hint: actual.s.idToken, post_logout_redirect_uri: client.post_logout_redirect_uris[0], client_id: client.client_id }));
  }

  async function backchannel(req, res) {
    const f = await readForm(req);
    try {
      const p = await jwt.verify(f.logout_token, getKey, { issuer: cfg.IDP_URL, audience: client.client_id });
      if (!p.events?.[EVENTO_LOGOUT] || p.nonce !== undefined || (!p.sid && !p.sub)) throw new Error('logout_token inválido');
      let cerradas = 0;
      for (const [k, s] of sesiones) {
        if ((p.sid && s.sid === p.sid) || (!p.sid && s.claims.sub === p.sub)) { sesiones.delete(k); cerradas++; }
      }
      if (!process.env.SILENCIO) console.log(`  [${def.id}] back-channel logout: ${cerradas} sesión(es) cerrada(s)`);
      json(res, 200, { ok: true });
    } catch (e) {
      json(res, 400, { error: 'invalid_request', error_description: e.message });
    }
  }

  // ---------- presentación común ----------
  const tieneAcceso = (claims, app = def) => claims.roles?.some((r) => app.roles.includes(r));

  function layout(s, contenido) {
    const c = s.claims;
    const otras = cfg.APPS.filter((a) => a.audiencia === def.audiencia).map((a) => {
      const acceso = tieneAcceso(c, a);
      return `<li><a class="${a.id === def.id ? 'actual' : ''}" href="${esc(cfg.appUrl(a))}/"><span>${esc(a.nombre)}</span>${a.id === def.id ? '<span class="small dim">actual</span>' : acceso ? ui.tag('con acceso', 'ok') : ui.tag('sin rol', 'warn')}</a></li>`;
    }).join('');
    const fecha = (t) => new Date(t * 1000).toLocaleString('es-CO');
    return ui.pagina({
      titulo: `${def.nombre} · Telco Konrad`,
      acento: def.color,
      cuerpo: `
      <header class="top">
        <div class="brand"><span class="logo">${esc(def.sigla || def.nombre.slice(0, 2).toUpperCase())}</span><div><strong>${esc(def.nombre)}</strong><small>Telco Konrad · ${esc(def.descripcion)}</small></div></div>
        <div class="user"><div><b>${esc(c.name)}</b><small>${esc(c.cargo || c.documento || '')}</small></div>
          <form method="post" action="/logout" class="inline"><input type="hidden" name="csrf" value="${esc(s.csrf)}"><button class="btn ghost small" type="submit">Cerrar sesión</button></form></div>
      </header>
      <div class="layout">
        <main>${contenido}</main>
        <aside>
          <div class="card"><h3>Sesión SSO</h3>
            <dl class="kv">
              <dt>Usuario</dt><dd>${esc(c.preferred_username)}</dd>
              <dt>Roles</dt><dd>${(c.roles || []).map((r) => ui.tag(r)).join(' ')}</dd>
              <dt>Método</dt><dd>${esc((c.amr || []).join(', '))} · <span class="small dim">${esc(c.acr)}</span></dd>
              <dt>Autenticado</dt><dd>${esc(fecha(c.auth_time))}</dd>
              <dt>Sesión IdP</dt><dd class="mono">${esc(c.sid)}</dd>
              <dt>Access token</dt><dd>vence ${esc(new Date(s.atExp * 1000).toLocaleTimeString('es-CO'))}</dd>
            </dl>
          </div>
          ${def.audiencia === 'empleados' ? `<div class="card"><h3>Otras aplicaciones</h3><ul class="apps">${otras}</ul><p class="small muted">Con la misma sesión entras sin volver a escribir la contraseña.</p></div>` : ''}
          <div class="card"><details><summary>ID token (claims)</summary><pre class="box">${esc(JSON.stringify(c, null, 2))}</pre></details></div>
        </aside>
      </div>`,
    });
  }

  const ctxBase = { def, esc, ui, cfg, validarBearer, iniciarLogin, paginaError, layout };

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, URL_APP);
    const ruta = u.pathname;
    try {
      if (req.method === 'GET' && ruta === '/callback') return await callback(req, res, u.searchParams);
      if (req.method === 'GET' && ruta === '/login') return iniciarLogin(res);
      if (req.method === 'POST' && ruta === '/logout') return await logout(req, res);
      if (req.method === 'POST' && ruta === '/backchannel-logout') return await backchannel(req, res);
      if (req.method === 'GET' && ruta === '/salida') {
        return paginaError(res, 200, 'Sesión cerrada', 'Cerraste sesión en esta aplicación y en el IdP. Las demás aplicaciones también fueron notificadas.', def.audiencia === 'clientes' ? '' : '<a class="btn" href="/login">Iniciar sesión de nuevo</a>');
      }
      if (req.method === 'GET' && ruta === '/salud') return json(res, 200, { ok: true, app: def.id });

      // APIs propias de la aplicación (protegidas con Bearer token, sin sesión de navegador).
      if (ruta.startsWith('/api/') && def.api) {
        const atendido = await def.api({ ...ctxBase, req, res, ruta, url: u });
        if (atendido !== false) return;
      }

      const s = await sesionVigente(req);
      const ctx = { ...ctxBase, req, res, ruta, url: u, sesion: s };

      // Rutas públicas de la app (p. ej. el enlace de carga del cliente).
      if (def.rutasPublicas) {
        const atendido = await def.rutasPublicas(ctx);
        if (atendido !== false) return;
      }

      if (!s) {
        if (def.sinSesion) return def.sinSesion(ctx);
        return iniciarLogin(res, { volver: req.method === 'GET' ? u.pathname + u.search : '/' });
      }
      if (!tieneAcceso(s.claims)) {
        return html(res, 403, layout(s, `<div class="card"><p class="eyebrow">403 · Sin autorización</p><h2>Autenticado, pero sin acceso a ${esc(def.nombre)}</h2>
          <p class="muted">El IdP confirmó quién eres, pero tu rol (${(s.claims.roles || []).map((r) => `<code>${esc(r)}</code>`).join(', ')}) no está autorizado aquí. Roles permitidos: ${def.roles.map((r) => `<code>${esc(r)}</code>`).join(', ')}.</p></div>`));
      }
      if (req.method === 'POST') {
        const f = await readForm(req);
        if (!safeEqual(f.csrf, s.csrf)) return paginaError(res, 400, 'Solicitud inválida', 'El formulario no es válido (CSRF).', '<a class="btn" href="/">Volver</a>');
        ctx.form = f;
      }
      const resultado = await def.manejar(ctx);
      if (resultado === false) paginaError(res, 404, 'No encontrado', 'La página no existe.', '<a class="btn" href="/">Ir al inicio</a>');
    } catch (e) {
      console.error(`[${def.id}]`, e);
      if (!res.headersSent) paginaError(res, 500, 'Error interno', 'Ocurrió un error inesperado.', '<a class="btn" href="/">Ir al inicio</a>');
    }
  });
  return server;
}

module.exports = { crearApp, validarBearer };
