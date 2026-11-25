'use strict';
// Utilidades HTTP mínimas (sin dependencias externas).
const crypto = require('node:crypto');

const rand = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest();
const sha256b64u = (s) => sha256(s).toString('base64url');

function safeEqual(a, b) {
  const ba = Buffer.from(String(a ?? ''));
  const bb = Buffer.from(String(b ?? ''));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) {
      try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* cookie malformada */ }
    }
  }
  return out;
}

function appendHeader(res, name, value) {
  const prev = res.getHeader(name);
  res.setHeader(name, prev ? [].concat(prev, value) : [value]);
}

function setCookie(res, name, value, { maxAge, httpOnly = true, sameSite = 'Lax', path = '/' } = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=${sameSite}`;
  if (httpOnly) c += '; HttpOnly';
  if (maxAge !== undefined) c += `; Max-Age=${maxAge}`;
  if (process.env.COOKIE_SECURE === '1') c += '; Secure';
  appendHeader(res, 'Set-Cookie', c);
}

const clearCookie = (res, name) => setCookie(res, name, '', { maxAge: 0 });

function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('Cuerpo demasiado grande')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readForm(req) {
  return Object.fromEntries(new URLSearchParams(await readBody(req)));
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
};

function send(res, status, body, type, headers = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': type, ...headers });
  res.end(body);
}

const html = (res, status, body, headers) => send(res, status, body, 'text/html; charset=utf-8', headers);
const json = (res, status, obj, headers) => send(res, status, JSON.stringify(obj, null, 2), 'application/json; charset=utf-8', headers);

function redirect(res, location, status = 302) {
  res.writeHead(status, { ...SECURITY_HEADERS, Location: location });
  res.end();
}

function withParams(base, params) {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
  return u.toString();
}

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

module.exports = {
  rand, sha256, sha256b64u, safeEqual, esc, parseCookies, setCookie, clearCookie,
  readBody, readForm, send, html, json, redirect, withParams, bearer,
};
