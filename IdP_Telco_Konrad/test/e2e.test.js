'use strict';
// Pruebas de extremo a extremo: un "navegador" mínimo (cookies + redirecciones) recorre los flujos reales.
process.env.BASE_PORT = process.env.BASE_PORT || '5400';
process.env.SILENCIO = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const cfg = require('../config');
const { iniciarTodo } = require('../sistema');
const buzon = require('../lib/buzon');
const directorio = require('../idp/directorio');

const APP = Object.fromEntries(cfg.APPS.map((a) => [a.id, cfg.appUrl(a)]));
const IDP = cfg.IDP_URL;
const secreto = (id) => cfg.CLIENTS.find((c) => c.client_id === id).client_secret;
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

class Navegador {
  constructor() { this.cookies = new Map(); }
  guardar(res) {
    for (const c of res.headers.getSetCookie()) {
      const par = c.split(';')[0];
      const i = par.indexOf('=');
      const nombre = par.slice(0, i).trim();
      if (/max-age=0/i.test(c)) this.cookies.delete(nombre);
      else this.cookies.set(nombre, decodeURIComponent(par.slice(i + 1)));
    }
  }
  async pedir(url, { method = 'GET', form } = {}) {
    const headers = { cookie: [...this.cookies].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ') };
    let body;
    if (form) { headers['content-type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(form).toString(); }
    const res = await fetch(url, { method, headers, body, redirect: 'manual' });
    this.guardar(res);
    return res;
  }
  /** Sigue las redirecciones como un navegador. Devuelve la última respuesta, su URL, el texto y las URLs visitadas. */
  async ir(url, opciones = {}) {
    const visitadas = [];
    let res = await this.pedir(url, opciones);
    visitadas.push(url);
    for (let i = 0; i < 20 && res.status >= 300 && res.status < 400; i++) {
      url = new URL(res.headers.get('location'), url).toString();
      visitadas.push(url);
      res = await this.pedir(url);
    }
    return { status: res.status, url, texto: await res.text(), visitadas };
  }
  /** Envía el formulario de la página cuyo action coincide, con los campos ocultos más los dados. */
  async enviar(pagina, action, campos = {}) {
    const forms = [...pagina.texto.matchAll(/<form[^>]*action="([^"]*)"[^>]*>([\s\S]*?)<\/form>/g)];
    const f = forms.find((m) => unescape(m[1]) === action);
    assert.ok(f, `No se encontró el formulario ${action} en ${pagina.url}`);
    const ocultos = Object.fromEntries([...f[2].matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)">/g)].map((m) => [m[1], unescape(m[2])]));
    return this.ir(new URL(action, pagina.url).toString(), { method: 'POST', form: { ...ocultos, ...campos } });
  }
}

async function loginEmpleado(nav, appUrl, usuario, clave) {
  const p = await nav.ir(`${appUrl}/`);
  assert.match(p.url, /\/login\?req=/, 'debe llegar a la pantalla de login del IdP');
  return nav.enviar(p, '/login', { usuario, clave });
}

let sistema;
test.before(async () => {
  fs.rmSync(directorio.ARCHIVO, { force: true });
  sistema = await iniciarTodo();
});
test.after(() => sistema.cerrar());

test('discovery y JWKS publican la configuración OIDC', async () => {
  const d = await (await fetch(`${IDP}/.well-known/openid-configuration`)).json();
  assert.equal(d.issuer, IDP);
  assert.deepEqual(d.code_challenge_methods_supported, ['S256']);
  assert.equal(d.backchannel_logout_supported, true);
  const { keys } = await (await fetch(d.jwks_uri)).json();
  assert.equal(keys[0].kty, 'RSA');
  assert.equal(keys[0].alg, 'RS256');
  assert.equal(keys[0].d, undefined, 'el JWKS no debe exponer la llave privada');
});

test('las contraseñas se guardan con scrypt, nunca en texto plano', () => {
  const contenido = fs.readFileSync(directorio.ARCHIVO, 'utf8');
  assert.match(contenido, /"hash": "scrypt\$16384\$8\$1\$/);
  for (const clave of ['Asesor#2026', 'Admin#2026', 'Fraude#2026']) assert.ok(!contenido.includes(clave));
  const hashes = JSON.parse(contenido).empleados.map((e) => e.hash);
  assert.equal(new Set(hashes).size, hashes.length, 'cada hash tiene su propia sal');
});

test('login + SSO: la segunda aplicación entra sin pedir contraseña', async () => {
  const nav = new Navegador();
  const idtrue = await loginEmpleado(nav, APP['id-true'], 'camila.rojas', 'Asesor#2026');
  assert.equal(idtrue.status, 200);
  assert.equal(idtrue.url, `${APP['id-true']}/`);
  assert.match(idtrue.texto, /Validaciones de identidad de hoy/);
  assert.match(idtrue.texto, /Camila Rojas/);

  const crm = await nav.ir(`${APP.crm}/`);
  assert.equal(crm.status, 200);
  assert.match(crm.texto, /Clientes \(modelo canónico\)/);
  assert.ok(!crm.visitadas.some((u) => u.includes('/login?req=')), 'no debe mostrar el formulario de login otra vez');
  assert.ok(crm.visitadas.some((u) => u.startsWith(`${IDP}/authorize`)), 'pasa por el IdP de forma transparente');
});

test('el token se propaga: RequestManager lee el cliente desde la API del CRM', async () => {
  const nav = new Navegador();
  const rm = await loginEmpleado(nav, APP['request-manager'], 'camila.rojas', 'Asesor#2026');
  assert.match(rm.texto, /GET CRM \/api\/clientes<\/code> con el access token del usuario: <b>200<\/b>/);
  assert.match(rm.texto, /juan\.perez@example\.com/);
});

test('autenticado pero sin rol: 403 en la aplicación', async () => {
  const nav = new Navegador();
  await loginEmpleado(nav, APP['id-true'], 'camila.rojas', 'Asesor#2026');
  const ln = await nav.ir(`${APP['listas-negativas']}/`);
  assert.equal(ln.status, 403);
  assert.match(ln.texto, /Autenticado, pero sin acceso/);
});

test('contraseña incorrecta, usuario inactivo y usuario inexistente dan el mismo mensaje', async () => {
  for (const [u, c] of [['camila.rojas', 'mala'], ['pedro.lopez', 'Retirado#2026'], ['no.existe', 'x']]) {
    const r = await loginEmpleado(new Navegador(), APP.crm, u, c);
    assert.equal(r.status, 401);
    assert.match(r.texto, /Usuario o contraseña incorrectos/);
  }
});

test('bloqueo tras 5 intentos fallidos y desbloqueo desde la consola', async () => {
  const nav = new Navegador();
  let r;
  for (let i = 0; i < 5; i++) r = await loginEmpleado(nav, APP.crm, 'diana.castro', 'equivocada');
  assert.equal(r.status, 401);
  r = await loginEmpleado(nav, APP.crm, 'diana.castro', 'Credito#2026');
  assert.equal(r.status, 429, 'con la clave correcta sigue bloqueada');
  assert.match(r.texto, /bloqueada temporalmente/);

  const admin = new Navegador();
  const consola = await loginEmpleado(admin, APP['consola-idp'], 'admin.idp', 'Admin#2026');
  assert.match(consola.texto, /diana\.castro/);
  await admin.enviar(consola, '/desbloquear', { usuario: 'diana.castro' });

  r = await loginEmpleado(new Navegador(), APP.crm, 'diana.castro', 'Credito#2026');
  assert.equal(r.status, 200);
});

test('logout global: cerrar sesión en una app cierra todas (back-channel)', async () => {
  const nav = new Navegador();
  await loginEmpleado(nav, APP['id-true'], 'camila.rojas', 'Asesor#2026');
  const crm = await nav.ir(`${APP.crm}/`);
  assert.equal(crm.status, 200);

  const salida = await nav.enviar(crm, '/logout');
  assert.equal(salida.url, `${APP.crm}/salida`);
  assert.match(salida.texto, /Sesión cerrada/);

  // ID-TRUE ya fue notificado por el IdP: vuelve a pedir credenciales.
  const otra = await nav.ir(`${APP['id-true']}/`);
  assert.match(otra.url, /\/login\?req=/);
});

test('el administrador revoca una sesión y el usuario queda fuera de todas las apps', async () => {
  const usuario = new Navegador();
  const vc = await loginEmpleado(usuario, APP['validacion-crediticia'], 'diana.castro', 'Credito#2026');
  const sid = vc.texto.match(/<dt>Sesión IdP<\/dt><dd class="mono">([^<]+)</)[1];
  const admin = new Navegador();
  const consola = await loginEmpleado(admin, APP['consola-idp'], 'admin.idp', 'Admin#2026');
  assert.ok(consola.texto.includes(`name="sid" value="${sid}"`), 'la sesión aparece en la consola');
  await admin.enviar(consola, '/revocar', { sid });
  const r = await usuario.ir(`${APP['validacion-crediticia']}/`);
  assert.match(r.url, /\/login\?req=/);
});

test('si otra persona inicia sesión en el mismo navegador, la sesión anterior se cierra en sus apps', async () => {
  const nav = new Navegador();
  await loginEmpleado(nav, APP['id-true'], 'camila.rojas', 'Asesor#2026');
  // Otra persona fuerza un login nuevo (prompt=login) desde otra app en el mismo navegador.
  const r = await nav.ir(`${IDP}/authorize?response_type=code&client_id=crm&redirect_uri=${encodeURIComponent(APP.crm + '/callback')}&scope=openid&state=s&prompt=login&code_challenge=${'a'.repeat(43)}&code_challenge_method=S256`);
  await nav.enviar(r, '/login', { usuario: 'andres.molina', clave: 'Back#2026' });
  const idtrue = await nav.ir(`${APP['id-true']}/`);
  assert.match(idtrue.texto, /Andrés Molina/, 'ID-TRUE ya no muestra la sesión de Camila');
  assert.doesNotMatch(idtrue.texto, /Camila Rojas/);
});

test('el auditor ve la consola en solo lectura y no puede revocar', async () => {
  const nav = new Navegador();
  const consola = await loginEmpleado(nav, APP['consola-idp'], 'sofia.herrera', 'Auditor#2026');
  assert.match(consola.texto, /Modo solo lectura/);
  assert.ok(!consola.texto.includes('action="/revocar"'));
});

// ---------- Protocolo: ataques que el IdP debe rechazar ----------

async function obtenerCodigo(nav, clientId, verifier, extra = {}) {
  const redirectUri = `${APP[clientId]}/callback`;
  const url = new URL(`${IDP}/authorize`);
  Object.entries({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: 'openid', state: 'xyz', code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', ...extra })
    .forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await nav.pedir(url.toString());
  const loc = new URL(res.headers.get('location'), IDP);
  return { code: loc.searchParams.get('code'), redirectUri, loc };
}

const canjear = (clientId, form, secret = secreto(clientId)) => fetch(`${IDP}/token`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64') },
  body: new URLSearchParams(form),
});

test('PKCE obligatorio, verifier correcto y código de un solo uso', async () => {
  const nav = new Navegador();
  await loginEmpleado(nav, APP.crm, 'camila.rojas', 'Asesor#2026');

  const sinPkce = await nav.pedir(`${IDP}/authorize?response_type=code&client_id=crm&redirect_uri=${encodeURIComponent(APP.crm + '/callback')}&scope=openid&state=s`);
  assert.match(sinPkce.headers.get('location'), /error=invalid_request/);

  const verifier = 'v'.repeat(50);
  const { code, redirectUri } = await obtenerCodigo(nav, 'crm', verifier);
  let r = await canjear('crm', { grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: 'otro'.repeat(12) });
  assert.equal(r.status, 400);
  assert.match((await r.json()).error_description, /PKCE/);

  const { code: code2 } = await obtenerCodigo(nav, 'crm', verifier);
  r = await canjear('crm', { grant_type: 'authorization_code', code: code2, redirect_uri: redirectUri, code_verifier: verifier });
  assert.equal(r.status, 200);
  const tokens = await r.json();
  assert.ok(tokens.id_token && tokens.access_token && tokens.refresh_token);

  r = await canjear('crm', { grant_type: 'authorization_code', code: code2, redirect_uri: redirectUri, code_verifier: verifier });
  assert.equal(r.status, 400, 'un código no se puede canjear dos veces');
  r = await canjear('crm', { grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
  assert.equal(r.status, 400, 'la reutilización del código revoca los tokens emitidos con él');
});

test('secreto de cliente incorrecto y redirect_uri no registrado', async () => {
  const r = await canjear('crm', { grant_type: 'authorization_code', code: 'x' }, 'secreto-falso');
  assert.equal(r.status, 401);
  const res = await fetch(`${IDP}/authorize?response_type=code&client_id=crm&redirect_uri=${encodeURIComponent('https://atacante.example.com/cb')}&scope=openid`, { redirect: 'manual' });
  assert.equal(res.status, 400, 'no redirige a un destino no registrado');
});

test('refresh token rota y su reutilización revoca la familia', async () => {
  const nav = new Navegador();
  await loginEmpleado(nav, APP.crm, 'camila.rojas', 'Asesor#2026');
  const verifier = 'w'.repeat(50);
  const { code, redirectUri } = await obtenerCodigo(nav, 'crm', verifier);
  const t1 = await (await canjear('crm', { grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: verifier })).json();
  const r2 = await canjear('crm', { grant_type: 'refresh_token', refresh_token: t1.refresh_token });
  assert.equal(r2.status, 200);
  const t2 = await r2.json();
  assert.notEqual(t2.refresh_token, t1.refresh_token);
  assert.equal((await canjear('crm', { grant_type: 'refresh_token', refresh_token: t1.refresh_token })).status, 400);
  assert.equal((await canjear('crm', { grant_type: 'refresh_token', refresh_token: t2.refresh_token })).status, 400, 'la familia quedó revocada');
});

test('un access token alterado es rechazado por la API (firma)', async () => {
  const nav = new Navegador();
  await loginEmpleado(nav, APP.crm, 'laura.gomez', 'Fraude#2026');
  const verifier = 'z'.repeat(50);
  const { code, redirectUri } = await obtenerCodigo(nav, 'listas-negativas', verifier);
  const t = await (await canjear('listas-negativas', { grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: verifier })).json();

  // Laura (ROLE_FRAUDE) no tiene rol para la API del CRM: 403.
  let r = await fetch(`${APP.crm}/api/clientes`, { headers: { authorization: `Bearer ${t.access_token}` } });
  assert.equal(r.status, 403);

  // Se cambia el rol en el payload sin poder recalcular la firma: 401.
  const [h, p, s] = t.access_token.split('.');
  const payload = JSON.parse(Buffer.from(p, 'base64url'));
  payload.roles = ['ROLE_ASESOR'];
  const alterado = `${h}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${s}`;
  r = await fetch(`${APP.crm}/api/clientes`, { headers: { authorization: `Bearer ${alterado}` } });
  assert.equal(r.status, 401);
  assert.match((await r.json()).detalle, /Firma inválida/);

  r = await fetch(`${APP.crm}/api/clientes`);
  assert.equal(r.status, 401);
});

// ---------- Cliente remoto: enlace + OTP ----------

async function enviarEnlace() {
  const asesor = new Navegador();
  const dd = await loginEmpleado(asesor, APP['documento-digital'], 'camila.rojas', 'Asesor#2026');
  const form = dd.texto.match(/<form method="post" action="\/enlaces">[\s\S]*?<\/form>/)[0];
  await asesor.enviar({ ...dd, texto: form }, '/enlaces');
  const correo = buzon.ultimoPara('juan.perez@example.com');
  assert.ok(correo?.enlace, 'el correo trae el enlace de carga');
  return correo.enlace;
}

test('cliente remoto: enlace + documento + OTP da acceso solo a su expediente', async () => {
  const enlace = await enviarEnlace();
  const cliente = new Navegador();
  const docForm = await cliente.ir(enlace);
  assert.match(docForm.url, /\/otp\?req=/);

  const otpForm = await cliente.enviar(docForm, '/otp/enviar', { tipo: 'CC', numero: '1032456789' });
  assert.match(otpForm.texto, /ju\*+@example\.com/);
  const codigo = buzon.ultimoPara('juan.perez@example.com').cuerpo.match(/\b(\d{6})\b/)[1];

  const errado = await cliente.enviar(otpForm, '/otp/verificar', { codigo: codigo === '000000' ? '111111' : '000000' });
  assert.equal(errado.status, 401);
  assert.match(errado.texto, /Te quedan 2 intento/);

  const portal = await cliente.enviar(errado, '/otp/verificar', { codigo });
  assert.equal(portal.status, 200);
  assert.match(portal.texto, /Solicitud SOL-2026-0412/);
  assert.match(portal.texto, /Recibo de servicio público/);

  // La sesión de cliente no sirve para aplicaciones de empleados.
  const crm = await cliente.ir(`${APP.crm}/`);
  assert.match(crm.url, /\/login\?req=/);
});

test('el enlace es intransferible: otro documento no recibe código', async () => {
  const enlace = await enviarEnlace();
  const intruso = new Navegador();
  const docForm = await intruso.ir(enlace);
  const antes = buzon.listar().length;
  const r = await intruso.enviar(docForm, '/otp/enviar', { tipo: 'CC', numero: '52123456' });
  assert.equal(r.status, 403);
  assert.match(r.texto, /personal e intransferible/);
  assert.equal(buzon.listar().length, antes, 'no se envía ningún correo');
});

test('tres códigos OTP errados anulan el intento', async () => {
  const enlace = await enviarEnlace();
  const nav = new Navegador();
  let p = await nav.enviar(await nav.ir(enlace), '/otp/enviar', { tipo: 'CC', numero: '1032456789' });
  const real = buzon.ultimoPara('juan.perez@example.com').cuerpo.match(/\b(\d{6})\b/)[1];
  const malo = real === '999999' ? '888888' : '999999';
  p = await nav.enviar(p, '/otp/verificar', { codigo: malo });
  p = await nav.enviar(p, '/otp/verificar', { codigo: malo });
  const ultimo = await nav.enviar(p, '/otp/verificar', { codigo: malo });
  assert.equal(ultimo.status, 429);
  const tarde = await nav.enviar(p, '/otp/verificar', { codigo: real });
  assert.equal(tarde.status, 400, 'el código real ya no sirve');
});

test('la bitácora registra los eventos de autenticación', async () => {
  const admin = new Navegador();
  const consola = await loginEmpleado(admin, APP['consola-idp'], 'admin.idp', 'Admin#2026');
  assert.match(consola.texto, /Bitácora de autenticación/);
  const eventos = new Set(require('../idp/auditoria').listar(1000).map((e) => e.evento));
  for (const evento of ['login.exitoso', 'login.fallido', 'cuenta.bloqueada', 'cuenta.desbloqueada', 'sso.reutilizada', 'logout.backchannel',
    'sesion.terminada', 'otp.enviado', 'otp.fallido', 'otp.documento_no_coincide', 'token.pkce_invalido', 'token.codigo_reutilizado', 'token.refresh_reutilizado']) {
    assert.ok(eventos.has(evento), `falta el evento ${evento}`);
  }
});
