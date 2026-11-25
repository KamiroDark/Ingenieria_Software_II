'use strict';
const cfg = require('./config');
const { iniciarTodo } = require('./sistema');

iniciarTodo().then(() => {
  const filas = [
    ['IdP (Telco Konrad ID)', cfg.IDP_URL],
    ...cfg.APPS.map((a) => [a.nombre, cfg.appUrl(a)]),
    ['Buzón de correo (simulado)', cfg.BUZON_URL],
  ];
  console.log('\nIdP Telco Konrad en ejecución:\n');
  for (const [n, u] of filas) console.log(`  ${n.padEnd(30)} ${u}`);
  console.log('\nUsuarios de prueba en README.md. Ctrl+C para detener.\n');
}).catch((e) => {
  console.error(e.code === 'EADDRINUSE' ? `El puerto ${e.port} está ocupado. Usa otro rango, por ejemplo: $env:BASE_PORT=5000; npm start` : e);
  process.exit(1);
});
