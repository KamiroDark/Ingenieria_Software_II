'use strict';
// Plantillas HTML compartidas por el IdP y las aplicaciones (sin JavaScript en el navegador).
const { esc } = require('./http');

const CSS = `
:root{
  --bg:#f4f6fb; --panel:#ffffff; --line:#e2e7f0; --fg:#0f172a; --muted:#5b6478; --dim:#8a93a6;
  --ok:#15803d; --ok-bg:#ecfdf3; --warn:#b45309; --warn-bg:#fff7e6; --bad:#b91c1c; --bad-bg:#fef2f2;
  --accent:#0f766e; --radius:14px;
  color-scheme:light;
}
@media (prefers-color-scheme: dark){
  :root{ --bg:#0b1020; --panel:#121a2e; --line:#223052; --fg:#e7edf8; --muted:#9aa6bf; --dim:#6b7895;
    --ok:#4ade80; --ok-bg:#0f2a1c; --warn:#fbbf24; --warn-bg:#2a210c; --bad:#f87171; --bad-bg:#2c1214; color-scheme:dark; }
}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);color:var(--fg);font:15px/1.55 "Segoe UI",system-ui,-apple-system,Roboto,sans-serif;padding:0 16px 48px}
a{color:var(--accent)}
h1{font-size:clamp(24px,3vw,32px);line-height:1.15;margin:.2em 0 .4em}
h2{font-size:19px;margin:0 0 12px}
h3{font-size:15px;margin:0 0 10px}
code,pre,.mono{font-family:ui-monospace,"Cascadia Code",Consolas,monospace;font-size:.86em}
.muted{color:var(--muted)} .small{font-size:13px} .dim{color:var(--dim)}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin:0}
.narrow{max-width:760px;margin:32px auto}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px;margin-bottom:16px;min-width:0}
.btn{display:inline-block;border:0;border-radius:10px;padding:10px 18px;font:600 14px inherit;font-family:inherit;cursor:pointer;background:var(--accent);color:#fff;text-decoration:none}
.btn:hover{filter:brightness(1.08)}
.btn.ghost{background:transparent;color:var(--fg);border:1px solid var(--line)}
.btn.small{padding:6px 12px;font-size:13px}
.btn.danger{background:var(--bad)}
.btn.block{width:100%}
label{display:block;font-weight:600;font-size:13px;margin:14px 0 6px}
input,select{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--fg);font:inherit}
input:focus,select:focus{outline:2px solid var(--accent);outline-offset:1px}
.alert{border-radius:10px;padding:10px 14px;margin:12px 0;font-size:14px}
.alert.bad{background:var(--bad-bg);color:var(--bad)} .alert.ok{background:var(--ok-bg);color:var(--ok)} .alert.warn{background:var(--warn-bg);color:var(--warn)}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim);font-weight:600}
.table-wrap{overflow-x:auto}
.tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;background:var(--bg);border:1px solid var(--line);white-space:nowrap}
.tag.ok{color:var(--ok);background:var(--ok-bg);border-color:transparent}
.tag.bad{color:var(--bad);background:var(--bad-bg);border-color:transparent}
.tag.warn{color:var(--warn);background:var(--warn-bg);border-color:transparent}
dl.kv{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin:0;font-size:13.5px}
dl.kv dt{color:var(--dim)} dl.kv dd{margin:0;word-break:break-all}
details summary{cursor:pointer;font-weight:600}
pre.box{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px;overflow:auto;max-height:340px;white-space:pre-wrap;word-break:break-all}

/* Barra superior de las aplicaciones */
.top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;max-width:1200px;margin:0 auto;padding:16px 0;border-bottom:3px solid var(--accent)}
.brand{display:flex;align-items:center;gap:12px}
.logo{width:40px;height:40px;border-radius:10px;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:700}
.brand strong{display:block;font-size:18px} .brand small{color:var(--muted)}
.user{display:flex;align-items:center;gap:12px;text-align:right}
.user small{display:block;color:var(--muted);font-size:12px}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;max-width:1200px;margin:20px auto 0}
@media (max-width:900px){.layout{grid-template-columns:minmax(0,1fr)}}
.apps{list-style:none;padding:0;margin:0;display:grid;gap:6px}
.apps a{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;text-decoration:none;color:var(--fg);font-size:14px}
.apps a:hover{border-color:var(--accent)}
.apps .actual{border-color:var(--accent);background:var(--bg)}

/* Pantallas del IdP */
.auth{max-width:420px;margin:56px auto 0}
.auth .card{padding:28px}
.idp-brand{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.idp-brand .logo{background:#0f766e}
.otp{letter-spacing:.5em;font-size:22px;text-align:center;font-family:ui-monospace,Consolas,monospace}
.mail-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.mail-body{white-space:pre-wrap;font-family:inherit;margin:10px 0}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.inline{display:inline}
`;

function pagina({ titulo, acento, cuerpo }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><style>${CSS}${acento ? `:root{--accent:${acento}}` : ''}</style></head>
<body>${cuerpo}</body></html>`;
}

function tag(texto, tono = '') {
  return `<span class="tag ${tono}">${esc(texto)}</span>`;
}

function tabla(columnas, filas) {
  const head = columnas.map((c) => `<th>${esc(c)}</th>`).join('');
  const body = filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

module.exports = { pagina, tag, tabla, CSS };
