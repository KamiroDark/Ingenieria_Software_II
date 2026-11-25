'use strict';
// Servidor de correo SIMULADO (en el TO-BE es Microsoft 365 por SMTP, integración I10).
// Guarda los mensajes en memoria para poder verlos en http://localhost:4090 durante la demo.
const http = require('node:http');
const { html, json, esc } = require('./http');
const ui = require('./ui');

const mensajes = [];
let secuencia = 0;

function enviar({ de, para, asunto, cuerpo, enlace }) {
  const m = { id: ++secuencia, fecha: new Date().toISOString(), de, para, asunto, cuerpo, enlace: enlace || null };
  mensajes.unshift(m);
  if (mensajes.length > 200) mensajes.pop();
  if (!process.env.SILENCIO) console.log(`  [correo] ${para} · ${asunto}`);
  return m;
}

const listar = () => mensajes.slice();
const ultimoPara = (para) => mensajes.find((m) => m.para === para) || null;

function crearServidor() {
  return http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/api/mensajes') return json(res, 200, mensajes);
    if (u.pathname !== '/') return html(res, 404, ui.pagina({ titulo: 'No encontrado', cuerpo: '<p>Ruta no encontrada.</p>' }));
    const filas = mensajes.map((m) => `
      <article class="card mail">
        <div class="mail-head"><strong>${esc(m.asunto)}</strong><time>${esc(new Date(m.fecha).toLocaleString('es-CO'))}</time></div>
        <div class="muted small">De: ${esc(m.de)} · Para: <b>${esc(m.para)}</b></div>
        <pre class="mail-body">${esc(m.cuerpo)}</pre>
        ${m.enlace ? `<p><a class="btn" href="${esc(m.enlace)}">Abrir enlace</a></p>` : ''}
      </article>`).join('');
    html(res, 200, ui.pagina({
      titulo: 'Buzón de correo (simulado)',
      acento: '#475569',
      cuerpo: `
        <div class="narrow">
          <p class="eyebrow">Solo para pruebas</p>
          <h1>Buzón de correo simulado</h1>
          <p class="muted">Aquí llegan los correos que en producción enviaría el servidor SMTP: códigos OTP del IdP y enlaces de carga de DOCUMENTO DIGITAL. Recarga la página para ver mensajes nuevos.</p>
          ${filas || '<div class="card muted">Todavía no hay mensajes.</div>'}
        </div>`,
    }));
  });
}

module.exports = { enviar, listar, ultimoPara, crearServidor };
