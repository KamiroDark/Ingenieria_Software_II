'use strict';
// JWT firmados con RS256 (RFC 7519 / 7515) y cliente JWKS, solo con node:crypto.
const crypto = require('node:crypto');

const b64uJson = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

function sign(payload, privateKey, kid, typ = 'JWT') {
  const input = `${b64uJson({ alg: 'RS256', typ, kid })}.${b64uJson(payload)}`;
  const sig = crypto.sign('sha256', Buffer.from(input), privateKey);
  return `${input}.${sig.toString('base64url')}`;
}

function decode(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('JWT mal formado');
  try {
    return {
      header: JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')),
      payload: JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')),
      input: `${parts[0]}.${parts[1]}`,
      signature: Buffer.from(parts[2], 'base64url'),
    };
  } catch {
    throw new Error('JWT mal formado');
  }
}

/**
 * Verifica firma y claims. getKey(kid) puede ser síncrona o asíncrona.
 * Opciones: issuer, audience, nonce, ignoreExpiration, leeway (segundos).
 */
async function verify(token, getKey, { issuer, audience, nonce, ignoreExpiration = false, leeway = 30 } = {}) {
  const d = decode(token);
  if (d.header.alg !== 'RS256') throw new Error(`Algoritmo no permitido: ${d.header.alg}`);
  const key = await getKey(d.header.kid);
  if (!key) throw new Error('Llave de firma desconocida (kid)');
  if (!crypto.verify('sha256', Buffer.from(d.input), key, d.signature)) throw new Error('Firma inválida');
  const p = d.payload;
  const now = Math.floor(Date.now() / 1000);
  if (issuer && p.iss !== issuer) throw new Error('Emisor (iss) inválido');
  if (audience) {
    const auds = Array.isArray(p.aud) ? p.aud : [p.aud];
    if (!auds.includes(audience)) throw new Error('Audiencia (aud) inválida');
  }
  if (!ignoreExpiration && (typeof p.exp !== 'number' || p.exp + leeway < now)) throw new Error('Token expirado');
  if (typeof p.nbf === 'number' && p.nbf - leeway > now) throw new Error('Token aún no válido');
  if (nonce !== undefined && p.nonce !== nonce) throw new Error('nonce no coincide');
  return p;
}

/** Cliente JWKS con caché; vuelve a descargar si aparece un kid nuevo (rotación de llaves). */
function jwksClient(jwksUrl) {
  let keys = new Map();
  let ultimaDescarga = 0;
  async function descargar() {
    const r = await fetch(jwksUrl);
    if (!r.ok) throw new Error(`No se pudo leer el JWKS (${r.status})`);
    const { keys: lista } = await r.json();
    keys = new Map(lista.map((k) => [k.kid, crypto.createPublicKey({ key: k, format: 'jwk' })]));
    ultimaDescarga = Date.now();
  }
  return async function getKey(kid) {
    if (!keys.has(kid) && Date.now() - ultimaDescarga > 2000) await descargar();
    return keys.get(kid);
  };
}

module.exports = { sign, decode, verify, jwksClient };
