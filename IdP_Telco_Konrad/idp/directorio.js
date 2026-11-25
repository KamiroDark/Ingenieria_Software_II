'use strict';
// Directorio de identidades del IdP. Las contraseñas se guardan con scrypt (sal única por usuario),
// que responde al punto 2 del anexo técnico II (AT-GAP-14): ninguna contraseña queda en texto plano.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const util = require('node:util');
const datos = require('./datos-prueba');

const scrypt = util.promisify(crypto.scrypt);
const ARCHIVO = path.join(__dirname, 'data', 'usuarios.json');
const PARAMS = { N: 16384, r: 8, p: 1 };

function hashClave(clave) {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(clave.normalize('NFKC'), sal, 32, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${sal.toString('base64')}$${hash.toString('base64')}`;
}

async function compararClave(clave, almacenado) {
  const [alg, N, r, p, sal, hash] = String(almacenado).split('$');
  if (alg !== 'scrypt') return false;
  const esperado = Buffer.from(hash, 'base64');
  const calculado = await scrypt(String(clave).normalize('NFKC'), Buffer.from(sal, 'base64'), esperado.length, { N: +N, r: +r, p: +p });
  return crypto.timingSafeEqual(calculado, esperado);
}

/** Genera idp/data/usuarios.json a partir de los datos de prueba (solo hashes). */
function generar() {
  const empleados = datos.empleados.map(({ clave, ...e }) => ({
    sub: crypto.createHash('sha256').update(`telco-konrad:${e.usuario}`).digest('hex').slice(0, 32),
    ...e,
    hash: hashClave(clave),
  }));
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, JSON.stringify({ generado: new Date().toISOString(), algoritmo: 'scrypt', empleados }, null, 2));
  return empleados;
}

let empleados = null;
function cargar() {
  if (!fs.existsSync(ARCHIVO)) generar();
  empleados = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')).empleados;
  return empleados;
}

// Hash ficticio para que un usuario inexistente tarde lo mismo que uno real (evita enumerar usuarios por tiempo).
const HASH_FICTICIO = hashClave(crypto.randomBytes(12).toString('hex'));

async function verificarClave(usuario, clave) {
  if (!empleados) cargar();
  const u = empleados.find((e) => e.usuario === usuario);
  const ok = await compararClave(clave, u ? u.hash : HASH_FICTICIO);
  if (!u) return { ok: false, motivo: 'usuario_inexistente' };
  if (!ok) return { ok: false, motivo: 'clave_incorrecta' };
  if (!u.activo) return { ok: false, motivo: 'usuario_inactivo' };
  const { hash, ...publico } = u;
  return { ok: true, usuario: publico };
}

function buscarCiudadano(tipoDoc, numeroDoc) {
  const c = datos.ciudadanos.find((x) => x.tipoDoc === tipoDoc && x.numeroDoc === String(numeroDoc).trim());
  if (!c) return null;
  return { ...c, sub: `cliente-${c.idCliente}`, documento: `${c.tipoDoc}:${c.numeroDoc}` };
}

function listarEmpleados() {
  if (!empleados) cargar();
  return empleados.map(({ hash, ...e }) => ({ ...e, almacenamiento: hash.split('$')[0] + ' (N=' + hash.split('$')[1] + ', sal de 16 bytes)' }));
}

module.exports = { cargar, generar, verificarClave, buscarCiudadano, listarEmpleados, hashClave, compararClave, ARCHIVO };

if (require.main === module) {
  const lista = generar();
  console.log(`Directorio generado en ${ARCHIVO} (${lista.length} empleados, contraseñas con scrypt).`);
}
