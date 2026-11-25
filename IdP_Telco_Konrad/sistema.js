'use strict';
// Arranca el IdP, las aplicaciones y el buzón simulado en un solo proceso.
const cfg = require('./config');
const { crearIdp } = require('./idp/server');
const { crearApp } = require('./apps/app-oidc');
const buzon = require('./lib/buzon');
const catalogo = require('./apps/catalogo');

function escuchar(server, puerto) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(puerto, '127.0.0.1', () => resolve(server));
  });
}

async function iniciarTodo() {
  const servidores = [];
  servidores.push(await escuchar(crearIdp(), cfg.BASE));
  servidores.push(await escuchar(buzon.crearServidor(), cfg.BASE + 90));
  for (const def of catalogo) servidores.push(await escuchar(crearApp(def), cfg.BASE + def.offset));
  return {
    cerrar: () => Promise.all(servidores.map((s) => new Promise((r) => { s.closeAllConnections?.(); s.close(() => r()); }))),
  };
}

module.exports = { iniciarTodo };
