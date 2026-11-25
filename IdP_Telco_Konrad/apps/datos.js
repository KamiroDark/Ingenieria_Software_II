'use strict';
// DATOS DE PRUEBA de las aplicaciones. No hay lógica de negocio real: el foco del laboratorio es la autenticación.
const crypto = require('node:crypto');

const clientesCRM = [
  { idCliente: 1001, tipoDoc: 'CC', numeroDoc: '1032456789', nombres: 'Juan', apellidos: 'Pérez Gómez', email: 'juan.perez@example.com', telefono: '300 555 0101', ciudad: 'Bogotá' },
  { idCliente: 1002, tipoDoc: 'CC', numeroDoc: '52123456', nombres: 'María Fernanda', apellidos: 'Torres Díaz', email: 'mafe.torres@example.com', telefono: '310 555 0102', ciudad: 'Medellín' },
  { idCliente: 1003, tipoDoc: 'CE', numeroDoc: '987654', nombres: 'Luis Alberto', apellidos: 'Ramírez', email: 'luis.ramirez@example.com', telefono: '320 555 0103', ciudad: 'Cali' },
  { idCliente: 1004, tipoDoc: 'CC', numeroDoc: '1019876543', nombres: 'Ana Lucía', apellidos: 'Mendoza Ríos', email: 'ana.mendoza@example.com', telefono: '315 555 0104', ciudad: 'Bogotá' },
];

const validacionesIdentidad = [
  { fecha: '2026-11-25 09:12', documento: 'CC 1032456789', nombre: 'Juan Pérez Gómez', escaner: 'AUTÉNTICO', rnec: 'COINCIDE', listas: 'SIN ALERTA', resultado: 'VALIDADO' },
  { fecha: '2026-11-25 09:40', documento: 'CC 52123456', nombre: 'María Fernanda Torres Díaz', escaner: 'AUTÉNTICO', rnec: 'COINCIDE', listas: 'SIN ALERTA', resultado: 'VALIDADO' },
  { fecha: '2026-11-25 10:05', documento: 'CC 80111222', nombre: 'Carlos Ruiz (declarado)', escaner: 'NO CONCLUYENTE', rnec: 'NO COINCIDE', listas: 'CON ALERTA', resultado: 'BACK DE VALIDACIÓN' },
  { fecha: '2026-11-25 10:31', documento: 'CE 987654', nombre: 'Luis Alberto Ramírez', escaner: 'AUTÉNTICO', rnec: 'N/A (extranjero)', listas: 'SIN ALERTA', resultado: 'VALIDADO' },
];

const calificaciones = [
  { idCliente: 1001, central: 'Datacrédito', puntaje: 812, resultado: 'PRE_APROBADO', fecha: '2026-11-25' },
  { idCliente: 1002, central: 'CIFIN', puntaje: 744, resultado: 'PRE_APROBADO', fecha: '2026-11-25' },
  { idCliente: 1003, central: 'Datacrédito', puntaje: 538, resultado: 'RECHAZADO', fecha: '2026-11-24' },
  { idCliente: 1004, central: 'CIFIN', puntaje: 690, resultado: 'PRE_APROBADO', fecha: '2026-11-23' },
];

const solicitudes = [
  { idSolicitud: 'SOL-2026-0412', idCliente: 1001, producto: 'Combo hogar TV + Internet 300 Mb', canal: 'PdV Chapinero', estado: 'DOCUMENTOS PENDIENTES' },
  { idSolicitud: 'SOL-2026-0415', idCliente: 1002, producto: 'Línea pospago 40 GB', canal: 'PdV El Poblado', estado: 'APROBADA' },
  { idSolicitud: 'SOL-2026-0418', idCliente: 1003, producto: 'Equipo móvil financiado', canal: 'Asesor de calle', estado: 'RECHAZADA' },
  { idSolicitud: 'SOL-2026-0421', idCliente: 1004, producto: 'Internet 500 Mb', canal: 'PdV Chapinero', estado: 'EN ESTUDIO' },
];

// DOCUMENTO DIGITAL: expedientes en trabajo. El portal del cliente usa el mismo almacenamiento (canal remoto de DOCUMENTO DIGITAL).
const expedientes = [
  { idSolicitud: 'SOL-2026-0412', idCliente: 1001, documento: 'CC:1032456789', email: 'juan.perez@example.com', cliente: 'Juan Pérez Gómez',
    documentos: [
      { tipo: 'Autorización consulta a centrales', estado: 'FIRMADO EN PAD' },
      { tipo: 'Copia del documento de identidad', estado: 'RECIBIDO' },
      { tipo: 'Recibo de servicio público', estado: 'FALTANTE' },
      { tipo: 'Certificado laboral', estado: 'FALTANTE' },
    ] },
  { idSolicitud: 'SOL-2026-0415', idCliente: 1002, documento: 'CC:52123456', email: 'mafe.torres@example.com', cliente: 'María Fernanda Torres Díaz',
    documentos: [
      { tipo: 'Autorización consulta a centrales', estado: 'FIRMADO EN PAD' },
      { tipo: 'Copia del documento de identidad', estado: 'RECIBIDO' },
      { tipo: 'E-contrato', estado: 'ENVIADO POR CORREO' },
    ] },
];

// Enlaces de carga remota: personales, intransferibles y de un solo uso (vencen en 24 h).
const enlaces = new Map();
function crearEnlace(idSolicitud) {
  const exp = expedientes.find((e) => e.idSolicitud === idSolicitud);
  if (!exp) return null;
  const token = crypto.randomBytes(24).toString('base64url');
  enlaces.set(token, { token, idSolicitud, documento: exp.documento, email: exp.email, expira: Date.now() + 24 * 3600 * 1000, usado: false });
  return enlaces.get(token);
}
function obtenerEnlace(token) {
  const e = enlaces.get(token);
  if (!e || e.usado || e.expira < Date.now()) return null;
  return e;
}

const archivo = [
  { idSolicitud: 'SOL-2026-0377', idCliente: 1002, tipo: 'E-contrato', version: 1, fecha: '2026-11-20', retencion: '10 años', hash: 'sha256:9f2c…a41e' },
  { idSolicitud: 'SOL-2026-0377', idCliente: 1002, tipo: 'Autorización consulta a centrales', version: 1, fecha: '2026-11-20', retencion: '5 años', hash: 'sha256:1b7d…e09c' },
  { idSolicitud: 'SOL-2026-0390', idCliente: 1004, tipo: 'E-contrato', version: 2, fecha: '2026-11-22', retencion: '10 años', hash: 'sha256:c3a0…77f1' },
];

const listasNegativas = [
  { documento: 'CC 80111222', motivo: 'Suplantación de identidad confirmada por dactiloscopista', fuente: 'Back de validación', fecha: '2026-11-25' },
  { documento: 'CC 1098765432', motivo: 'Documento adulterado (escáner 3 luces)', fuente: 'ID-TRUE', fecha: '2026-11-18' },
  { documento: 'PA X1234567', motivo: 'Fraude reportado por operador aliado', fuente: 'Cruce externo', fecha: '2026-10-30' },
];

module.exports = { clientesCRM, validacionesIdentidad, calificaciones, solicitudes, expedientes, crearEnlace, obtenerEnlace, enlaces, archivo, listasNegativas };
