'use strict';
// Pantallas de cada aplicación del TO-BE. Todas usan el IdP para autenticarse; el contenido son datos de prueba.
const cfg = require('../config');
const { html, json, redirect, esc } = require('../lib/http');
const ui = require('../lib/ui');
const buzon = require('../lib/buzon');
const d = require('./datos');

const app = (id) => cfg.APPS.find((a) => a.id === id);
const nombreCliente = (id) => { const c = d.clientesCRM.find((x) => x.idCliente === id); return c ? `${c.nombres} ${c.apellidos}` : `#${id}`; };
const tono = (v) => (/(RECHAZAD|NO COINCIDE|CON ALERTA|FALTANTE)/.test(v) ? 'bad'
  : /(VALIDADO|COINCIDE|SIN ALERTA|AUTÉNTICO|PRE_APROBADO|APROBADA|FIRMADO|RECIBIDO|ENVIADO|CARGADO)/.test(v) ? 'ok' : 'warn');
const tarjeta = (titulo, cuerpo, eyebrow) => `<div class="card">${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h2>${esc(titulo)}</h2>${cuerpo}</div>`;
const render = (ctx, contenido, status = 200) => html(ctx.res, status, ctx.layout(ctx.sesion, contenido));

const definiciones = [
  {
    ...app('id-true'), sigla: 'ID',
    manejar(ctx) {
      if (ctx.ruta !== '/') return false;
      render(ctx, tarjeta('Validaciones de identidad de hoy', ui.tabla(
        ['Fecha', 'Documento', 'Nombre', 'Escáner 3 luces', 'RNEC (huella)', 'Listas negativas', 'Resultado'],
        d.validacionesIdentidad.map((v) => [esc(v.fecha), esc(v.documento), esc(v.nombre), ui.tag(v.escaner, tono(v.escaner)), ui.tag(v.rnec, tono(v.rnec)), ui.tag(v.listas, tono(v.listas)), ui.tag(v.resultado, tono(v.resultado))]),
      ), 'Datos de prueba'));
    },
  },

  {
    ...app('crm'), sigla: 'CR',
    // API del maestro del cliente: la consumen otras aplicaciones con el access token del usuario.
    async api(ctx) {
      if (ctx.req.method !== 'GET') return false;
      const m = ctx.ruta.match(/^\/api\/clientes(?:\/(\d+))?$/);
      if (!m) return false;
      const v = await ctx.validarBearer(ctx.req, ['ROLE_ASESOR', 'ROLE_ANALISTA_CREDITO', 'ROLE_BACK_VALIDACION', 'ROLE_AUDITOR']);
      if (v.status !== 200) return json(ctx.res, v.status, { error: v.status === 401 ? 'invalid_token' : 'forbidden', detalle: v.error }, v.status === 401 ? { 'WWW-Authenticate': 'Bearer error="invalid_token"' } : {});
      if (m[1]) {
        const c = d.clientesCRM.find((x) => x.idCliente === Number(m[1]));
        return c ? json(ctx.res, 200, c) : json(ctx.res, 404, { error: 'not_found' });
      }
      return json(ctx.res, 200, { consultadoPor: v.claims.preferred_username, aplicacion: v.claims.azp, clientes: d.clientesCRM });
    },
    manejar(ctx) {
      if (ctx.ruta !== '/') return false;
      render(ctx, tarjeta('Clientes (modelo canónico)', ui.tabla(
        ['idCliente', 'Documento', 'Nombre', 'Email', 'Teléfono', 'Ciudad'],
        d.clientesCRM.map((c) => [`<code>${c.idCliente}</code>`, `${esc(c.tipoDoc)} ${esc(c.numeroDoc)}`, esc(`${c.nombres} ${c.apellidos}`), esc(c.email), esc(c.telefono), esc(c.ciudad)]),
      ) + `<p class="small muted">Este maestro también se expone como API en <code>GET /api/clientes</code>, protegida con el access token del IdP.</p>`, 'Datos de prueba'));
    },
  },

  {
    ...app('validacion-crediticia'), sigla: 'VC',
    manejar(ctx) {
      if (ctx.ruta !== '/') return false;
      render(ctx, tarjeta('Calificaciones con centrales de riesgo', ui.tabla(
        ['idCliente', 'Cliente', 'Central', 'Puntaje', 'Resultado', 'Fecha'],
        d.calificaciones.map((c) => [`<code>${c.idCliente}</code>`, esc(nombreCliente(c.idCliente)), esc(c.central), String(c.puntaje), ui.tag(c.resultado, tono(c.resultado)), esc(c.fecha)]),
      ), 'Datos de prueba'));
    },
  },

  {
    ...app('request-manager'), sigla: 'RM',
    async manejar(ctx) {
      if (ctx.ruta !== '/') return false;
      // Propagación del token: RequestManager llama la API del CRM en nombre del usuario.
      let clientes = [];
      let estadoApi;
      try {
        const r = await fetch(`${cfg.appUrl(app('crm'))}/api/clientes`, { headers: { Authorization: `Bearer ${ctx.sesion.accessToken}` } });
        estadoApi = r.status;
        if (r.ok) clientes = (await r.json()).clientes;
      } catch (e) { estadoApi = `error: ${e.message}`; }
      const dato = (id, campo) => esc(clientes.find((c) => c.idCliente === id)?.[campo] ?? '—');
      render(ctx, tarjeta('Solicitudes', ui.tabla(
        ['Solicitud', 'Cliente (desde CRM)', 'Email (desde CRM)', 'Producto', 'Canal', 'Estado'],
        d.solicitudes.map((s) => [`<code>${esc(s.idSolicitud)}</code>`, `${dato(s.idCliente, 'nombres')} ${dato(s.idCliente, 'apellidos')}`, dato(s.idCliente, 'email'), esc(s.producto), esc(s.canal), ui.tag(s.estado, tono(s.estado))]),
      ) + `<div class="alert ${estadoApi === 200 ? 'ok' : 'bad'} small">Llamada <code>GET CRM /api/clientes</code> con el access token del usuario: <b>${esc(estadoApi)}</b>. Los datos del cliente no se guardan aquí: se leen del maestro.</div>`, 'Datos de prueba'));
    },
  },

  {
    ...app('documento-digital'), sigla: 'DD',
    manejar(ctx) {
      if (ctx.req.method === 'POST' && ctx.ruta === '/enlaces') {
        const e = d.crearEnlace(ctx.form.idSolicitud);
        if (!e) return redirect(ctx.res, '/');
        const link = `${cfg.appUrl(app('portal-cliente'))}/carga/${e.token}`;
        buzon.enviar({
          de: 'documentos@telcokonrad.example.com', para: e.email, asunto: `Completa los documentos de tu solicitud ${e.idSolicitud}`,
          cuerpo: `Hola:\n\nPara terminar tu solicitud ${e.idSolicitud} faltan algunos documentos. Puedes adjuntarlos desde este enlace personal e intransferible (vence en 24 horas).\nAl abrirlo te pediremos tu documento y un código de verificación.`,
          enlace: link,
        });
        return redirect(ctx.res, `/?enviado=${encodeURIComponent(e.idSolicitud)}`);
      }
      if (ctx.ruta !== '/') return false;
      const enviado = ctx.url.searchParams.get('enviado');
      const filas = d.expedientes.map((x) => {
        const faltan = x.documentos.filter((doc) => doc.estado === 'FALTANTE').length;
        return [`<code>${esc(x.idSolicitud)}</code>`, esc(x.cliente),
          x.documentos.map((doc) => `${esc(doc.tipo)} ${ui.tag(doc.estado, tono(doc.estado))}`).join('<br>'),
          faltan ? `<form method="post" action="/enlaces"><input type="hidden" name="csrf" value="${esc(ctx.sesion.csrf)}"><input type="hidden" name="idSolicitud" value="${esc(x.idSolicitud)}"><button class="btn small">Enviar enlace de carga</button></form>` : ui.tag('Completo', 'ok')];
      });
      render(ctx, (enviado ? `<div class="alert ok">Enlace de carga enviado al correo del cliente de ${esc(enviado)}. Míralo en el <a href="${esc(cfg.BUZON_URL)}/">buzón simulado</a>.</div>` : '')
        + tarjeta('Expedientes en trabajo', ui.tabla(['Solicitud', 'Cliente', 'Documentos', 'Acción'], filas)
        + '<p class="small muted">El cliente abre el enlace, se autentica en el IdP con documento + OTP y solo puede ver su propio expediente.</p>', 'Datos de prueba'));
    },
  },

  {
    ...app('gestor-documental'), sigla: 'GD',
    manejar(ctx) {
      if (ctx.ruta !== '/') return false;
      render(ctx, tarjeta('Expedientes archivados', ui.tabla(
        ['Solicitud', 'Cliente', 'Tipo documental', 'Versión', 'Archivado', 'Retención', 'Integridad'],
        d.archivo.map((a) => [`<code>${esc(a.idSolicitud)}</code>`, esc(nombreCliente(a.idCliente)), esc(a.tipo), `v${a.version}`, esc(a.fecha), esc(a.retencion), `<code>${esc(a.hash)}</code>`]),
      ), 'Datos de prueba'));
    },
  },

  {
    ...app('listas-negativas'), sigla: 'LN',
    manejar(ctx) {
      if (ctx.ruta !== '/') return false;
      render(ctx, tarjeta('Identidades asociadas a fraude', ui.tabla(
        ['Documento', 'Motivo', 'Fuente', 'Fecha'],
        d.listasNegativas.map((l) => [`<code>${esc(l.documento)}</code>`, esc(l.motivo), esc(l.fuente), esc(l.fecha)]),
      ), 'Datos de prueba · información sensible'));
    },
  },

  {
    ...app('portal-cliente'), sigla: 'PC',
    // El cliente llega por el enlace del correo; el portal pide al IdP autenticación OTP para ese documento.
    rutasPublicas(ctx) {
      const m = ctx.ruta.match(/^\/carga\/([\w-]+)$/);
      if (!m || ctx.req.method !== 'GET') return false;
      const e = d.obtenerEnlace(m[1]);
      if (!e) return ctx.paginaError(ctx.res, 410, 'Enlace inválido o vencido', 'Este enlace ya se usó, venció o no existe. Pide a tu asesor uno nuevo.', '');
      if (ctx.sesion?.claims.documento === e.documento) return redirect(ctx.res, `/carga/${m[1]}/expediente`);
      return ctx.iniciarLogin(ctx.res, { volver: `/carga/${m[1]}/expediente`, extra: { login_hint: e.documento }, contexto: { enlace: m[1] } });
    },
    validarIngreso(claims, contexto) {
      if (claims.acr !== 'urn:telco-konrad:acr:otp') return 'Este portal exige verificación con código OTP.';
      if (contexto.enlace) {
        const e = d.obtenerEnlace(contexto.enlace);
        if (!e) return 'El enlace venció o ya se usó.';
        if (e.documento !== claims.documento) return 'Este enlace es personal e intransferible.';
      }
      return null;
    },
    sinSesion(ctx) {
      ctx.paginaError(ctx.res, 200, 'Portal de carga de documentos', 'Para entrar abre el enlace personal que te enviamos por correo electrónico.', '');
    },
    manejar(ctx) {
      const m = ctx.ruta.match(/^\/carga\/([\w-]+)\/(expediente|adjuntar)$/);
      if (!m) {
        if (ctx.ruta !== '/') return false;
        return render(ctx, tarjeta('Hola, ' + ctx.sesion.claims.name, '<p class="muted">Abre el enlace del correo para ver los documentos pendientes de tu solicitud.</p>'));
      }
      const e = d.obtenerEnlace(m[1]);
      if (!e) return render(ctx, tarjeta('Listo', '<p class="muted">Este enlace ya se usó o venció. Si ya adjuntaste todo, no tienes que hacer nada más.</p>'), 410);
      if (e.documento !== ctx.sesion.claims.documento) return render(ctx, tarjeta('Acceso denegado', '<p class="muted">Este enlace es personal e intransferible.</p>'), 403);
      const exp = d.expedientes.find((x) => x.idSolicitud === e.idSolicitud);
      if (m[2] === 'adjuntar' && ctx.req.method === 'POST') {
        const doc = exp.documentos.find((x) => x.tipo === ctx.form.tipo && x.estado === 'FALTANTE');
        if (doc) doc.estado = 'CARGADO POR EL CLIENTE';
        if (!exp.documentos.some((x) => x.estado === 'FALTANTE')) e.usado = true; // un solo uso: se cierra al completar
        return redirect(ctx.res, e.usado ? '/' : `/carga/${m[1]}/expediente`);
      }
      const filas = exp.documentos.map((doc) => [esc(doc.tipo), ui.tag(doc.estado, tono(doc.estado)),
        doc.estado === 'FALTANTE' ? `<form method="post" action="/carga/${esc(m[1])}/adjuntar"><input type="hidden" name="csrf" value="${esc(ctx.sesion.csrf)}"><input type="hidden" name="tipo" value="${esc(doc.tipo)}"><button class="btn small">Adjuntar (simulado)</button></form>` : '']);
      render(ctx, tarjeta(`Solicitud ${exp.idSolicitud}`, ui.tabla(['Documento', 'Estado', ''], filas)
        + '<p class="small muted">La carga del archivo es simulada; lo que se demuestra es el acceso seguro, personal e intransferible.</p>', 'Tus documentos'));
    },
  },

  {
    ...app('consola-idp'), sigla: 'ID',
    async manejar(ctx) {
      const llamar = async (ruta, metodo = 'GET') => {
        const r = await fetch(`${cfg.IDP_URL}${ruta}`, { method: metodo, headers: { Authorization: `Bearer ${ctx.sesion.accessToken}` } });
        return { status: r.status, datos: await r.json().catch(() => null) };
      };
      if (ctx.req.method === 'POST' && ctx.ruta === '/revocar') {
        await llamar(`/admin/api/sesiones/${encodeURIComponent(ctx.form.sid)}/revocar`, 'POST');
        return redirect(ctx.res, '/');
      }
      if (ctx.req.method === 'POST' && ctx.ruta === '/desbloquear') {
        await llamar(`/admin/api/bloqueos/${encodeURIComponent(ctx.form.usuario)}/desbloquear`, 'POST');
        return redirect(ctx.res, '/');
      }
      if (ctx.ruta !== '/') return false;
      const esAdmin = ctx.sesion.claims.roles.includes('ROLE_ADMIN_IDP');
      const [ses, blq, aud, usr] = await Promise.all(['/admin/api/sesiones', '/admin/api/bloqueos', '/admin/api/auditoria', '/admin/api/usuarios'].map((r) => llamar(r)));
      const csrf = `<input type="hidden" name="csrf" value="${esc(ctx.sesion.csrf)}">`;
      const sesiones = ui.tabla(['Usuario', 'Tipo', 'Método', 'Inicio', 'Aplicaciones', ''], (ses.datos || []).map((s) => [
        `<b>${esc(s.nombre)}</b><br><span class="small dim">${esc(s.usuario)}</span>`, esc(s.tipo), esc(s.metodo), esc(new Date(s.inicio).toLocaleTimeString('es-CO')),
        s.apps.map((a) => ui.tag(a)).join(' '),
        esAdmin ? `<form method="post" action="/revocar">${csrf}<input type="hidden" name="sid" value="${esc(s.sid)}"><button class="btn danger small">Revocar</button></form>` : ''])) ;
      const bloqueos = (blq.datos || []).length ? ui.tabla(['Usuario', 'Intentos', 'Estado', ''], blq.datos.map((b) => [esc(b.usuario), String(b.intentos), b.bloqueado ? ui.tag('BLOQUEADO', 'bad') : ui.tag('intentos fallidos', 'warn'),
        esAdmin ? `<form method="post" action="/desbloquear">${csrf}<input type="hidden" name="usuario" value="${esc(b.usuario)}"><button class="btn small">Desbloquear</button></form>` : ''])) : '<p class="muted small">Sin intentos fallidos.</p>';
      const auditoria = ui.tabla(['Hora', 'Evento', 'Usuario', 'Aplicación', 'Detalle'], (aud.datos || []).slice(0, 40).map((e) => [
        esc(new Date(e.fecha).toLocaleTimeString('es-CO')), ui.tag(e.evento, /fallido|bloque|reutiliz|invalido|denegado|no_coincide/.test(e.evento) ? 'bad' : /exitoso|sso/.test(e.evento) ? 'ok' : ''),
        esc(e.usuario || ''), esc(e.cliente || ''), esc(e.motivo || e.metodo || (e.apps ? e.apps.join(', ') : '') || '')]));
      const usuarios = ui.tabla(['Usuario', 'Nombre', 'Roles', 'Estado', 'Contraseña almacenada como'], (usr.datos || []).map((u) => [
        `<code>${esc(u.usuario)}</code>`, esc(u.nombre), u.roles.map((r) => ui.tag(r)).join(' '), u.activo ? ui.tag('activo', 'ok') : ui.tag('inactivo', 'bad'), esc(u.almacenamiento)]));
      render(ctx, (esAdmin ? '' : '<div class="alert warn small">Modo solo lectura (ROLE_AUDITOR).</div>')
        + tarjeta('Sesiones SSO activas', sesiones, 'Gobierno centralizado')
        + tarjeta('Intentos fallidos y bloqueos', bloqueos)
        + tarjeta('Bitácora de autenticación', auditoria)
        + tarjeta('Directorio de empleados', usuarios));
    },
  },
];

module.exports = definiciones;
