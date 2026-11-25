'use strict';
/**
 * IdP Telco Konrad: proveedor de identidad web con OpenID Connect.
 *
 * - Authorization Code + PKCE (S256 obligatorio), ID token y access token JWT firmados con RS256.
 * - SSO: una sola sesión en el IdP (cookie HttpOnly) sirve para todas las aplicaciones de empleados.
 * - Empleados: usuario + contraseña (scrypt), bloqueo tras 5 intentos fallidos.
 * - Clientes remotos: documento + código OTP de un solo uso enviado al correo registrado.
 * - Refresh tokens con rotación y detección de reutilización.
 * - Cierre de sesión global con OIDC Back-Channel Logout hacia cada aplicación.
 * - Bitácora de auditoría y API de administración para la consola.
 */
const http = require('node:http');
const crypto = require('node:crypto');
const cfg = require('../config');
const {
  rand, sha256, sha256b64u, safeEqual, esc, parseCookies, setCookie, clearCookie,
  readForm, html, json, redirect, withParams, bearer,
} = require('../lib/http');
const jwt = require('../lib/jwt');
const ui = require('../lib/ui');
const buzon = require('../lib/buzon');
const directorio = require('./directorio');
const auditoria = require('./auditoria');

const ISS = cfg.IDP_URL;
const COOKIE = 'tk_idp_sesion';
const T = { sesion: 8 * 3600, codigo: 60, access: 300, refresh: 8 * 3600, pendiente: 600, otp: 300, bloqueo: 15 * 60 };
const MAX_FALLOS = 5;
const MAX_INTENTOS_OTP = 3;
const ACR = { clave: 'urn:telco-konrad:acr:password', otp: 'urn:telco-konrad:acr:otp' };
const EVENTO_LOGOUT = 'http://schemas.openid.net/event/backchannel-logout';
const ahora = () => Math.floor(Date.now() / 1000);

function crearIdp() {
  // Llave de firma (se rota en cada arranque; las apps la descubren por JWKS).
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const kid = `tk-${rand(6)}`;
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid, use: 'sig', alg: 'RS256' };
  const firmar = (payload, typ) => jwt.sign(payload, privateKey, kid, typ);
  const verificarPropio = (token, opts) => jwt.verify(token, (k) => (k === kid ? publicKey : null), { issuer: ISS, ...opts });
  const secretoCsrf = crypto.randomBytes(32);

  const clientes = new Map(cfg.CLIENTS.map((c) => [c.client_id, { ...c, secretHash: sha256(c.client_secret) }]));
  const pendientes = new Map(); // id → solicitud de autorización en curso
  const sesiones = new Map();   // sha256(cookie) → sesión SSO
  const codigos = new Map();    // código → datos para canjearlo
  const refreshes = new Map();  // sha256(refresh) → datos
  const refreshUsados = new Map(); // sha256(refresh rotado) → familia (detección de reutilización)
  const fallos = new Map();     // usuario → { cuenta, hasta }

  directorio.cargar();

  // ---------- utilidades ----------
  const ip = (req) => req.socket.remoteAddress;
  const leerSesion = (req) => {
    const token = parseCookies(req)[COOKIE];
    if (!token) return null;
    const clave = sha256(token).toString('hex');
    const s = sesiones.get(clave);
    if (!s || s.expira < ahora()) { if (s) sesiones.delete(clave); return null; }
    return { clave, s };
  };
  const csrfDeSesion = (s) => crypto.createHmac('sha256', secretoCsrf).update(s.sid).digest('base64url');

  function paginaIdp(titulo, cuerpo, status = 200, res) {
    html(res, status, ui.pagina({
      titulo: `${titulo} · Telco Konrad ID`,
      acento: '#0f766e',
      cuerpo: `<main class="auth">
        <div class="idp-brand"><span class="logo">TK</span><div><strong>Telco Konrad ID</strong><div class="small muted">Proveedor de identidad · acceso único</div></div></div>
        ${cuerpo}
        <p class="small dim" style="text-align:center;margin-top:18px">Una sola cuenta para todas las aplicaciones de Telco Konrad.</p>
      </main>`,
    }));
  }

  const errorPagina = (res, status, titulo, detalle) =>
    paginaIdp(titulo, `<div class="card"><h2>${esc(titulo)}</h2><p class="muted">${detalle}</p></div>`, status, res);

  async function crearSesion(req, res, datos) {
    // Evita fijación de sesión; si otra persona tenía sesión en este navegador, se cierra en todas sus apps.
    const previa = leerSesion(req);
    if (previa) await terminarSesion(previa.clave, previa.s, 'reemplazada_por_nuevo_ingreso');
    const token = rand(32);
    const s = { sid: rand(12), authTime: ahora(), expira: ahora() + T.sesion, apps: new Set(), ...datos };
    sesiones.set(sha256(token).toString('hex'), s);
    setCookie(res, COOKIE, token, { maxAge: T.sesion });
    return s;
  }

  function emitirCodigo(res, p, s) {
    const code = rand(32);
    codigos.set(code, {
      client_id: p.client.client_id, redirectUri: p.redirectUri, sid: s.sid, nonce: p.nonce,
      challenge: p.challenge, scopes: p.scopes, exp: ahora() + T.codigo, usado: false, familias: [],
    });
    s.apps.add(p.client.client_id);
    redirect(res, withParams(p.redirectUri, { code, state: p.state, iss: ISS }));
  }

  const sesionPorSid = (sid) => {
    for (const [clave, s] of sesiones) if (s.sid === sid && s.expira >= ahora()) return { clave, s };
    return null;
  };

  function emitirTokens(client, s, scopes, nonce, familia = rand(8)) {
    const t = ahora();
    const comunes = { iss: ISS, sub: s.sub, iat: t, auth_time: s.authTime, sid: s.sid, acr: s.acr, amr: s.amr };
    const perfil = { name: s.perfil.nombre, preferred_username: s.perfil.usuario, email: s.perfil.email, roles: s.perfil.roles };
    if (s.perfil.cargo) perfil.cargo = s.perfil.cargo;
    if (s.perfil.documento) { perfil.documento = s.perfil.documento; perfil.id_cliente = s.perfil.idCliente; }
    const idToken = firmar({ ...comunes, aud: client.client_id, azp: client.client_id, exp: t + T.access, ...(nonce ? { nonce } : {}), ...perfil });
    const accessToken = firmar({
      ...comunes, aud: cfg.API_AUDIENCE, client_id: client.client_id, azp: client.client_id, scope: scopes.join(' '),
      exp: t + T.access, jti: rand(12), roles: s.perfil.roles, preferred_username: s.perfil.usuario,
      ...(s.perfil.documento ? { documento: s.perfil.documento } : {}),
    }, 'at+jwt');
    const refresh = rand(32);
    refreshes.set(sha256(refresh).toString('hex'), { client_id: client.client_id, sid: s.sid, scopes, exp: t + T.refresh, familia });
    return { token_type: 'Bearer', expires_in: T.access, access_token: accessToken, id_token: idToken, refresh_token: refresh, scope: scopes.join(' ') };
  }

  function revocarFamilia(familia) {
    for (const [k, r] of refreshes) if (r.familia === familia) refreshes.delete(k);
  }

  async function terminarSesion(clave, s, motivo) {
    sesiones.delete(clave);
    for (const [k, r] of refreshes) if (r.sid === s.sid) refreshes.delete(k);
    auditoria.registrar('sesion.terminada', { usuario: s.perfil.usuario, sid: s.sid, motivo, apps: [...s.apps] });
    // Back-Channel Logout: el IdP avisa servidor a servidor a cada aplicación que usó esta sesión.
    await Promise.allSettled([...s.apps].map(async (clientId) => {
      const c = clientes.get(clientId);
      if (!c?.backchannel_logout_uri) return;
      const logoutToken = firmar({
        iss: ISS, aud: clientId, iat: ahora(), exp: ahora() + 120, jti: rand(12), sub: s.sub, sid: s.sid,
        events: { [EVENTO_LOGOUT]: {} },
      }, 'logout+jwt');
      try {
        const r = await fetch(c.backchannel_logout_uri, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ logout_token: logoutToken }),
          signal: AbortSignal.timeout(3000),
        });
        auditoria.registrar('logout.backchannel', { cliente: clientId, sid: s.sid, estado: r.status });
      } catch (e) {
        auditoria.registrar('logout.backchannel_fallido', { cliente: clientId, sid: s.sid, error: e.message });
      }
    }));
  }

  // ---------- pantallas ----------
  function pantallaLogin(res, p, { error, usuario = '', status = 200 } = {}) {
    paginaIdp('Iniciar sesión', `
      <div class="card">
        <p class="eyebrow">Inicia sesión para continuar a</p>
        <h2 style="margin-top:4px">${esc(p.client.nombre)}</h2>
        ${error ? `<div class="alert bad" role="alert">${esc(error)}</div>` : ''}
        <form method="post" action="/login" autocomplete="on">
          <input type="hidden" name="req" value="${esc(p.id)}">
          <input type="hidden" name="csrf" value="${esc(p.csrf)}">
          <label for="usuario">Usuario corporativo</label>
          <input id="usuario" name="usuario" value="${esc(usuario)}" autocomplete="username" required autofocus>
          <label for="clave">Contraseña</label>
          <input id="clave" name="clave" type="password" autocomplete="current-password" required>
          <p style="margin-top:20px"><button class="btn block" type="submit">Ingresar</button></p>
        </form>
      </div>`, status, res);
  }

  function pantallaDocumento(res, p, { error, status = 200 } = {}) {
    paginaIdp('Verifica tu identidad', `
      <div class="card">
        <p class="eyebrow">Acceso seguro de clientes</p>
        <h2 style="margin-top:4px">Verifica tu identidad</h2>
        <p class="muted small">Para continuar a <b>${esc(p.client.nombre)}</b> escribe tu documento. Te enviaremos un código de un solo uso a tu correo registrado.</p>
        ${error ? `<div class="alert bad" role="alert">${esc(error)}</div>` : ''}
        <form method="post" action="/otp/enviar">
          <input type="hidden" name="req" value="${esc(p.id)}">
          <input type="hidden" name="csrf" value="${esc(p.csrf)}">
          <label for="tipo">Tipo de documento</label>
          <select id="tipo" name="tipo"><option value="CC">Cédula de ciudadanía</option><option value="CE">Cédula de extranjería</option><option value="PA">Pasaporte</option></select>
          <label for="numero">Número de documento</label>
          <input id="numero" name="numero" inputmode="numeric" autocomplete="off" required autofocus>
          <p style="margin-top:20px"><button class="btn block" type="submit">Enviar código</button></p>
        </form>
      </div>`, status, res);
  }

  function pantallaOtp(res, p, { error, status = 200 } = {}) {
    paginaIdp('Código de verificación', `
      <div class="card">
        <p class="eyebrow">Acceso seguro de clientes</p>
        <h2 style="margin-top:4px">Escribe el código</h2>
        <p class="muted small">Si el documento está registrado, enviamos un código de 6 dígitos a <b>${esc(p.otp.destino)}</b>. Vence en 5 minutos.</p>
        ${error ? `<div class="alert bad" role="alert">${esc(error)}</div>` : ''}
        <form method="post" action="/otp/verificar">
          <input type="hidden" name="req" value="${esc(p.id)}">
          <input type="hidden" name="csrf" value="${esc(p.csrf)}">
          <label for="codigo">Código</label>
          <input id="codigo" class="otp" name="codigo" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required autofocus>
          <p style="margin-top:20px"><button class="btn block" type="submit">Verificar</button></p>
        </form>
      </div>`, status, res);
  }

  // ---------- endpoints OIDC ----------
  function discovery(res) {
    json(res, 200, {
      issuer: ISS,
      authorization_endpoint: `${ISS}/authorize`,
      token_endpoint: `${ISS}/token`,
      userinfo_endpoint: `${ISS}/userinfo`,
      jwks_uri: `${ISS}/jwks.json`,
      end_session_endpoint: `${ISS}/logout`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
      scopes_supported: ['openid', 'profile', 'email', 'roles'],
      claims_supported: ['sub', 'name', 'preferred_username', 'email', 'roles', 'cargo', 'documento', 'acr', 'amr', 'sid', 'auth_time'],
      acr_values_supported: [ACR.clave, ACR.otp],
      backchannel_logout_supported: true,
      backchannel_logout_session_supported: true,
      authorization_response_iss_parameter_supported: true,
    });
  }

  function authorize(req, res, q) {
    const client = clientes.get(q.get('client_id'));
    const redirectUri = q.get('redirect_uri');
    // Si la app o el redirect_uri no están registrados NO se redirige (evita open redirect).
    if (!client || !client.redirect_uris.includes(redirectUri)) {
      auditoria.registrar('authorize.rechazado', { cliente: q.get('client_id'), redirect_uri: redirectUri, ip: ip(req) });
      return errorPagina(res, 400, 'Solicitud inválida', 'La aplicación o la dirección de retorno no están registradas en el IdP.');
    }
    const state = q.get('state') || '';
    const falla = (error, desc) => redirect(res, withParams(redirectUri, { error, error_description: desc, state, iss: ISS }));
    if (q.get('response_type') !== 'code') return falla('unsupported_response_type', 'Solo se admite response_type=code');
    const scopes = (q.get('scope') || '').split(' ').filter(Boolean);
    if (!scopes.includes('openid')) return falla('invalid_scope', 'Falta el scope openid');
    if (!q.get('code_challenge') || q.get('code_challenge_method') !== 'S256') return falla('invalid_request', 'PKCE con S256 es obligatorio');

    const p = {
      id: rand(18), csrf: rand(18), client, redirectUri, state, nonce: q.get('nonce') || null,
      challenge: q.get('code_challenge'), scopes, loginHint: q.get('login_hint') || '', prompt: q.get('prompt') || '',
      expira: ahora() + T.pendiente,
    };

    // SSO: si ya hay sesión del mismo tipo de usuario, se emite el código sin pedir credenciales.
    const actual = leerSesion(req);
    const s = actual?.s;
    const mismaPersona = client.audiencia !== 'clientes' || !p.loginHint || s?.perfil.documento === p.loginHint;
    if (s && s.tipo === client.audiencia && mismaPersona && p.prompt !== 'login') {
      auditoria.registrar('sso.reutilizada', { usuario: s.perfil.usuario, cliente: client.client_id, sid: s.sid, ip: ip(req) });
      return emitirCodigo(res, p, s);
    }
    if (p.prompt === 'none') return falla('login_required', 'No hay una sesión activa en el IdP');

    pendientes.set(p.id, p);
    redirect(res, `${client.audiencia === 'clientes' ? '/otp' : '/login'}?req=${encodeURIComponent(p.id)}`);
  }

  function pendienteValido(id) {
    const p = pendientes.get(id);
    if (!p) return null;
    if (p.expira < ahora()) { pendientes.delete(id); return null; }
    return p;
  }

  const solicitudVencida = (res) => errorPagina(res, 400, 'La solicitud venció',
    'El inicio de sesión tardó demasiado o ya se usó. Vuelve a la aplicación e inténtalo de nuevo.');

  async function login(req, res) {
    const f = await readForm(req);
    const p = pendienteValido(f.req);
    if (!p || p.client.audiencia !== 'empleados') return solicitudVencida(res);
    if (!safeEqual(f.csrf, p.csrf)) return errorPagina(res, 400, 'Solicitud inválida', 'El formulario no es válido (CSRF).');
    const usuario = String(f.usuario || '').trim().toLowerCase();

    // El bloqueo se lleva por nombre de usuario exista o no, para no revelar qué cuentas existen.
    const estado = fallos.get(usuario);
    if (estado?.hasta > ahora()) {
      auditoria.registrar('login.bloqueado', { usuario, cliente: p.client.client_id, ip: ip(req) });
      const min = Math.ceil((estado.hasta - ahora()) / 60);
      return pantallaLogin(res, p, { usuario, status: 429, error: `Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en ${min} min o contacta a la mesa de ayuda.` });
    }

    const r = await directorio.verificarClave(usuario, String(f.clave || ''));
    if (!r.ok) {
      const cuenta = (estado?.hasta && estado.hasta <= ahora() ? 0 : estado?.cuenta || 0) + 1;
      const bloquear = cuenta >= MAX_FALLOS;
      fallos.set(usuario, { cuenta, hasta: bloquear ? ahora() + T.bloqueo : 0, ultimo: new Date().toISOString() });
      auditoria.registrar(bloquear ? 'cuenta.bloqueada' : 'login.fallido', { usuario, motivo: r.motivo, intentos: cuenta, cliente: p.client.client_id, ip: ip(req) });
      return pantallaLogin(res, p, { usuario, status: 401, error: 'Usuario o contraseña incorrectos.' });
    }

    fallos.delete(usuario);
    pendientes.delete(p.id);
    const u = r.usuario;
    const s = await crearSesion(req, res, {
      tipo: 'empleados', sub: u.sub, amr: ['pwd'], acr: ACR.clave,
      perfil: { usuario: u.usuario, nombre: u.nombre, email: u.email, roles: u.roles, cargo: u.cargo },
    });
    auditoria.registrar('login.exitoso', { usuario: u.usuario, cliente: p.client.client_id, sid: s.sid, metodo: 'pwd', ip: ip(req) });
    emitirCodigo(res, p, s);
  }

  async function otpEnviar(req, res) {
    const f = await readForm(req);
    const p = pendienteValido(f.req);
    if (!p || p.client.audiencia !== 'clientes') return solicitudVencida(res);
    if (!safeEqual(f.csrf, p.csrf)) return errorPagina(res, 400, 'Solicitud inválida', 'El formulario no es válido (CSRF).');
    const documento = `${f.tipo}:${String(f.numero || '').trim()}`;
    // El enlace es personal e intransferible: si trae login_hint, el documento debe coincidir.
    if (p.loginHint && p.loginHint !== documento) {
      auditoria.registrar('otp.documento_no_coincide', { cliente: p.client.client_id, ip: ip(req) });
      return pantallaDocumento(res, p, { status: 403, error: 'Este enlace es personal e intransferible: el documento no corresponde a la persona a quien se le envió.' });
    }
    const c = directorio.buscarCiudadano(f.tipo, f.numero);
    const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    p.otp = { hash: sha256(`${p.id}:${codigo}`).toString('hex'), exp: ahora() + T.otp, intentos: 0, ciudadano: c, destino: c ? enmascarar(c.email) : 'tu correo registrado' };
    if (c) {
      buzon.enviar({
        de: 'no-responder@id.telcokonrad.example.com', para: c.email, asunto: 'Tu código de acceso a Telco Konrad',
        cuerpo: `Hola ${c.nombres}:\n\nTu código de verificación es ${codigo}\nVence en 5 minutos y sirve una sola vez.\n\nSi no solicitaste este código, ignora este mensaje. Telco Konrad nunca te pedirá este código por teléfono.`,
      });
      auditoria.registrar('otp.enviado', { usuario: c.documento, cliente: p.client.client_id, ip: ip(req) });
    } else {
      auditoria.registrar('otp.documento_desconocido', { cliente: p.client.client_id, ip: ip(req) });
    }
    pantallaOtp(res, p);
  }

  async function otpVerificar(req, res) {
    const f = await readForm(req);
    const p = pendienteValido(f.req);
    if (!p || !p.otp) return solicitudVencida(res);
    if (!safeEqual(f.csrf, p.csrf)) return errorPagina(res, 400, 'Solicitud inválida', 'El formulario no es válido (CSRF).');
    if (p.otp.exp < ahora()) { delete p.otp; return pantallaDocumento(res, p, { status: 401, error: 'El código venció. Solicita uno nuevo.' }); }
    p.otp.intentos += 1;
    const valido = p.otp.ciudadano && safeEqual(sha256(`${p.id}:${String(f.codigo || '').trim()}`).toString('hex'), p.otp.hash);
    if (!valido) {
      const quedan = MAX_INTENTOS_OTP - p.otp.intentos;
      auditoria.registrar('otp.fallido', { usuario: p.otp.ciudadano?.documento, intentos: p.otp.intentos, ip: ip(req) });
      if (quedan <= 0) {
        pendientes.delete(p.id);
        return errorPagina(res, 429, 'Demasiados intentos', 'Por seguridad anulamos este código. Abre de nuevo el enlace que te enviamos para empezar otra vez.');
      }
      return pantallaOtp(res, p, { status: 401, error: `Código incorrecto. Te quedan ${quedan} intento(s).` });
    }
    const c = p.otp.ciudadano;
    pendientes.delete(p.id);
    const s = await crearSesion(req, res, {
      tipo: 'clientes', sub: c.sub, amr: ['otp'], acr: ACR.otp, expira: ahora() + 30 * 60, // sesión corta para clientes
      perfil: { usuario: c.documento, nombre: `${c.nombres} ${c.apellidos}`, email: c.email, roles: ['ROLE_CLIENTE'], documento: c.documento, idCliente: c.idCliente },
    });
    auditoria.registrar('login.exitoso', { usuario: c.documento, cliente: p.client.client_id, sid: s.sid, metodo: 'otp', ip: ip(req) });
    emitirCodigo(res, p, s);
  }

  function autenticarCliente(req, f) {
    let id = f.client_id; let secreto = f.client_secret;
    const h = req.headers.authorization || '';
    if (h.startsWith('Basic ')) {
      const [a, b] = Buffer.from(h.slice(6), 'base64').toString('utf8').split(':');
      id = decodeURIComponent(a || ''); secreto = decodeURIComponent(b || '');
    }
    const c = clientes.get(id);
    if (!c || !secreto) return null;
    return crypto.timingSafeEqual(sha256(secreto), c.secretHash) ? c : null;
  }

  async function token(req, res) {
    const f = await readForm(req);
    const client = autenticarCliente(req, f);
    if (!client) return json(res, 401, { error: 'invalid_client' }, { 'WWW-Authenticate': 'Basic realm="telco-konrad"' });
    const grant = (desc) => json(res, 400, { error: 'invalid_grant', error_description: desc });

    if (f.grant_type === 'authorization_code') {
      const c = codigos.get(f.code);
      if (!c) return grant('Código inválido o vencido');
      if (c.usado) {
        // Un código canjeado dos veces indica robo: se revocan los tokens que se emitieron con él.
        c.familias.forEach(revocarFamilia);
        auditoria.registrar('token.codigo_reutilizado', { cliente: client.client_id, sid: c.sid });
        return grant('El código ya fue usado');
      }
      c.usado = true;
      if (c.client_id !== client.client_id) return grant('El código pertenece a otra aplicación');
      if (c.redirectUri !== f.redirect_uri) return grant('redirect_uri no coincide');
      if (c.exp < ahora()) return grant('Código vencido');
      if (!f.code_verifier || sha256b64u(f.code_verifier) !== c.challenge) {
        auditoria.registrar('token.pkce_invalido', { cliente: client.client_id, sid: c.sid });
        return grant('PKCE: code_verifier no coincide');
      }
      const ses = sesionPorSid(c.sid);
      if (!ses) return grant('La sesión en el IdP terminó');
      const familia = rand(8);
      c.familias.push(familia);
      auditoria.registrar('token.emitido', { usuario: ses.s.perfil.usuario, cliente: client.client_id, sid: c.sid });
      return json(res, 200, emitirTokens(client, ses.s, c.scopes, c.nonce, familia));
    }

    if (f.grant_type === 'refresh_token') {
      const h = sha256(f.refresh_token || '').toString('hex');
      const r = refreshes.get(h);
      if (!r) {
        const familia = refreshUsados.get(h);
        if (familia) {
          revocarFamilia(familia);
          auditoria.registrar('token.refresh_reutilizado', { cliente: client.client_id });
        }
        return grant('Refresh token inválido');
      }
      if (r.client_id !== client.client_id) return grant('El refresh token pertenece a otra aplicación');
      refreshes.delete(h); // rotación: cada refresh token sirve una sola vez
      refreshUsados.set(h, r.familia);
      if (r.exp < ahora()) return grant('Refresh token vencido');
      const ses = sesionPorSid(r.sid);
      if (!ses) return grant('La sesión en el IdP terminó');
      const t = emitirTokens(client, ses.s, r.scopes, null, r.familia);
      delete t.id_token;
      return json(res, 200, t);
    }

    return json(res, 400, { error: 'unsupported_grant_type' });
  }

  async function validarAccessToken(req) {
    const t = bearer(req);
    if (!t) return null;
    try {
      const p = await verificarPropio(t, { audience: cfg.API_AUDIENCE });
      return sesionPorSid(p.sid) ? p : null; // se exige que la sesión siga viva
    } catch { return null; }
  }

  async function userinfo(req, res) {
    const p = await validarAccessToken(req);
    if (!p) return json(res, 401, { error: 'invalid_token' }, { 'WWW-Authenticate': 'Bearer error="invalid_token"' });
    const { s } = sesionPorSid(p.sid);
    json(res, 200, { sub: s.sub, name: s.perfil.nombre, preferred_username: s.perfil.usuario, email: s.perfil.email, roles: s.perfil.roles, ...(s.perfil.documento ? { documento: s.perfil.documento } : {}) });
  }

  async function logout(req, res, q, metodo) {
    const params = metodo === 'POST' ? new URLSearchParams(await readForm(req)) : q;
    const actual = leerSesion(req);
    let client = null;
    let hintValido = false;
    const hint = params.get('id_token_hint');
    if (hint) {
      try {
        const p = await verificarPropio(hint, { ignoreExpiration: true });
        client = clientes.get(p.aud);
        hintValido = !actual || p.sid === actual.s.sid;
      } catch { /* hint inválido: se pide confirmación */ }
    }
    if (!client && params.get('client_id')) client = clientes.get(params.get('client_id'));
    const plr = params.get('post_logout_redirect_uri');
    const destino = client && plr && client.post_logout_redirect_uris.includes(plr) ? withParams(plr, { state: params.get('state') }) : null;

    // Sin id_token_hint válido se pide confirmación para que un tercero no pueda cerrar la sesión (CSRF de logout).
    if (actual && !hintValido && !(metodo === 'POST' && safeEqual(params.get('csrf'), csrfDeSesion(actual.s)))) {
      return paginaIdp('Cerrar sesión', `<div class="card"><h2>¿Cerrar sesión?</h2>
        <p class="muted">Se cerrará tu sesión de <b>${esc(actual.s.perfil.nombre)}</b> en el IdP y en todas las aplicaciones de Telco Konrad.</p>
        <form method="post" action="/logout">
          <input type="hidden" name="csrf" value="${esc(csrfDeSesion(actual.s))}">
          ${destino ? `<input type="hidden" name="post_logout_redirect_uri" value="${esc(plr)}"><input type="hidden" name="client_id" value="${esc(client.client_id)}">` : ''}
          <button class="btn danger block" type="submit">Cerrar sesión en todas las aplicaciones</button>
        </form></div>`, 200, res);
    }

    if (actual) await terminarSesion(actual.clave, actual.s, 'logout_usuario');
    clearCookie(res, COOKIE);
    if (destino) return redirect(res, destino);
    paginaIdp('Sesión cerrada', `<div class="card"><h2>Sesión cerrada</h2><p class="muted">Cerraste sesión en el IdP y en todas las aplicaciones que la usaban.</p><p><a class="btn" href="/">Ir al inicio</a></p></div>`, 200, res);
  }

  function inicio(req, res) {
    const actual = leerSesion(req);
    const apps = cfg.APPS.map((a) => `<li><a href="${esc(cfg.appUrl(a))}/"><span><b>${esc(a.nombre)}</b><br><span class="small muted">${esc(a.descripcion)}</span></span><span class="small dim">${a.audiencia === 'clientes' ? 'OTP' : 'SSO'}</span></a></li>`).join('');
    html(res, 200, ui.pagina({
      titulo: 'Telco Konrad ID',
      acento: '#0f766e',
      cuerpo: `<div class="narrow">
        <div class="idp-brand"><span class="logo">TK</span><div><strong>Telco Konrad ID</strong><div class="small muted">Proveedor de identidad (IdP) · OpenID Connect</div></div></div>
        <div class="card">
          ${actual
            ? `<p>Sesión activa como <b>${esc(actual.s.perfil.nombre)}</b> <span class="tag">${esc(actual.s.perfil.usuario)}</span></p>
               <p class="small muted">Aplicaciones que usan esta sesión: ${[...actual.s.apps].map((a) => `<span class="tag">${esc(a)}</span>`).join(' ') || 'ninguna'}</p>
               <form method="post" action="/logout"><input type="hidden" name="csrf" value="${esc(csrfDeSesion(actual.s))}"><button class="btn danger small">Cerrar sesión en todas las aplicaciones</button></form>`
            : '<p class="muted">No hay sesión activa. Abre cualquier aplicación: te traerá aquí para iniciar sesión una sola vez.</p>'}
        </div>
        <div class="card"><h2>Aplicaciones conectadas</h2><ul class="apps">${apps}</ul></div>
        <div class="card small"><h2>Endpoints</h2>
          <p><a href="/.well-known/openid-configuration">/.well-known/openid-configuration</a> · <a href="/jwks.json">/jwks.json</a> · <a href="${esc(cfg.BUZON_URL)}/">Buzón de correo (simulado)</a></p>
        </div>
      </div>`,
    }));
  }

  // ---------- API de administración (la usa la Consola del IdP con su access token) ----------
  async function admin(req, res, ruta, metodo) {
    const p = await validarAccessToken(req);
    if (!p) return json(res, 401, { error: 'invalid_token' });
    const esAdmin = p.roles?.includes('ROLE_ADMIN_IDP');
    const puedeLeer = esAdmin || p.roles?.includes('ROLE_AUDITOR');
    if (!puedeLeer || (metodo !== 'GET' && !esAdmin)) {
      auditoria.registrar('admin.denegado', { usuario: p.preferred_username, ruta });
      return json(res, 403, { error: 'forbidden' });
    }
    if (metodo === 'GET' && ruta === '/admin/api/sesiones') {
      return json(res, 200, [...sesiones.values()].filter((s) => s.expira >= ahora()).map((s) => ({
        sid: s.sid, usuario: s.perfil.usuario, nombre: s.perfil.nombre, tipo: s.tipo, metodo: s.amr.join(','),
        inicio: new Date(s.authTime * 1000).toISOString(), expira: new Date(s.expira * 1000).toISOString(), apps: [...s.apps],
      })));
    }
    if (metodo === 'GET' && ruta === '/admin/api/auditoria') return json(res, 200, auditoria.listar(150));
    if (metodo === 'GET' && ruta === '/admin/api/usuarios') return json(res, 200, directorio.listarEmpleados());
    if (metodo === 'GET' && ruta === '/admin/api/bloqueos') {
      return json(res, 200, [...fallos.entries()].map(([usuario, f]) => ({ usuario, intentos: f.cuenta, bloqueado: f.hasta > ahora(), hasta: f.hasta ? new Date(f.hasta * 1000).toISOString() : null, ultimo: f.ultimo })));
    }
    let m = ruta.match(/^\/admin\/api\/sesiones\/([\w-]+)\/revocar$/);
    if (metodo === 'POST' && m) {
      const ses = sesionPorSid(m[1]);
      if (!ses) return json(res, 404, { error: 'not_found' });
      await terminarSesion(ses.clave, ses.s, `revocada_por_${p.preferred_username}`);
      return json(res, 200, { ok: true });
    }
    m = ruta.match(/^\/admin\/api\/bloqueos\/([\w.@-]+)\/desbloquear$/);
    if (metodo === 'POST' && m) {
      fallos.delete(m[1]);
      auditoria.registrar('cuenta.desbloqueada', { usuario: m[1], por: p.preferred_username });
      return json(res, 200, { ok: true });
    }
    json(res, 404, { error: 'not_found' });
  }

  // Limpieza periódica de lo vencido.
  const limpieza = setInterval(() => {
    const t = ahora();
    for (const [k, v] of pendientes) if (v.expira < t) pendientes.delete(k);
    for (const [k, v] of codigos) if (v.exp + 600 < t) codigos.delete(k);
    for (const [k, v] of refreshes) if (v.exp < t) refreshes.delete(k);
    for (const [k, v] of sesiones) if (v.expira < t) sesiones.delete(k);
    if (refreshUsados.size > 5000) refreshUsados.clear();
  }, 60_000);
  limpieza.unref();

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, ISS);
    const ruta = u.pathname;
    const m = req.method;
    try {
      if (m === 'GET' && ruta === '/') return inicio(req, res);
      if (m === 'GET' && ruta === '/.well-known/openid-configuration') return discovery(res);
      if (m === 'GET' && ruta === '/jwks.json') return json(res, 200, { keys: [jwk] }, { 'Cache-Control': 'public, max-age=300' });
      if (m === 'GET' && ruta === '/authorize') return authorize(req, res, u.searchParams);
      if (m === 'GET' && ruta === '/login') {
        const p = pendienteValido(u.searchParams.get('req'));
        return p && p.client.audiencia === 'empleados' ? pantallaLogin(res, p) : solicitudVencida(res);
      }
      if (m === 'POST' && ruta === '/login') return await login(req, res);
      if (m === 'GET' && ruta === '/otp') {
        const p = pendienteValido(u.searchParams.get('req'));
        return p && p.client.audiencia === 'clientes' ? pantallaDocumento(res, p) : solicitudVencida(res);
      }
      if (m === 'POST' && ruta === '/otp/enviar') return await otpEnviar(req, res);
      if (m === 'POST' && ruta === '/otp/verificar') return await otpVerificar(req, res);
      if (m === 'POST' && ruta === '/token') return await token(req, res);
      if ((m === 'GET' || m === 'POST') && ruta === '/userinfo') return await userinfo(req, res);
      if ((m === 'GET' || m === 'POST') && ruta === '/logout') return await logout(req, res, u.searchParams, m);
      if (ruta.startsWith('/admin/api/')) return await admin(req, res, ruta, m);
      errorPagina(res, 404, 'No encontrado', 'La ruta no existe en el IdP.');
    } catch (e) {
      console.error('[idp]', e);
      if (!res.headersSent) errorPagina(res, 500, 'Error interno', 'Ocurrió un error inesperado en el IdP.');
    }
  });
  return server;
}

function enmascarar(email) {
  const [u, d] = email.split('@');
  return `${u.slice(0, 2)}${'*'.repeat(Math.max(2, u.length - 2))}@${d}`;
}

module.exports = { crearIdp };
