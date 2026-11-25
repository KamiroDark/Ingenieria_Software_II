'use strict';
// Bitácora de autenticación: cada evento queda en memoria (para la consola) y en idp/data/auditoria.log (JSON Lines).
const fs = require('node:fs');
const path = require('node:path');

const ARCHIVO = path.join(__dirname, 'data', 'auditoria.log');
const eventos = [];

function registrar(evento, datos = {}) {
  const e = { fecha: new Date().toISOString(), evento, ...datos };
  eventos.unshift(e);
  if (eventos.length > 1000) eventos.pop();
  try {
    fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
    fs.appendFileSync(ARCHIVO, JSON.stringify(e) + '\n');
  } catch { /* la bitácora en disco es complementaria */ }
  return e;
}

const listar = (limite = 200) => eventos.slice(0, limite);

module.exports = { registrar, listar };
