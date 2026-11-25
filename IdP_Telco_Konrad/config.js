'use strict';
// Configuración compartida del laboratorio: puertos, URLs y registro de aplicaciones (clientes OIDC).
// Todo corre en localhost; cada aplicación es un origen distinto (puerto distinto).

const BASE = Number(process.env.BASE_PORT || 4000);
const HOST = process.env.HOST_URL || 'http://localhost';
const url = (offset) => `${HOST}:${BASE + offset}`;

const IDP_URL = url(0);
const BUZON_URL = url(90);
const API_AUDIENCE = 'telco-konrad-api';

// Aplicaciones del inventario TO-BE (hoja 3.0) más la consola del IdP.
// audiencia: "empleados" entra con usuario y contraseña (SSO); "clientes" entra con OTP.
const APPS = [
  { id: 'id-true', nombre: 'ID-TRUE', offset: 1, color: '#2563eb', audiencia: 'empleados',
    descripcion: 'Validación de identidad y enrolamiento',
    roles: ['ROLE_ASESOR', 'ROLE_BACK_VALIDACION'] },
  { id: 'crm', nombre: 'CRM', offset: 2, color: '#0d9488', audiencia: 'empleados',
    descripcion: 'Maestro del cliente',
    roles: ['ROLE_ASESOR', 'ROLE_BACK_VALIDACION', 'ROLE_ANALISTA_CREDITO', 'ROLE_AUDITOR'] },
  { id: 'validacion-crediticia', nombre: 'Validación Crediticia', offset: 3, color: '#7c3aed', audiencia: 'empleados',
    descripcion: 'Calificación con centrales de riesgo',
    roles: ['ROLE_ASESOR', 'ROLE_ANALISTA_CREDITO'] },
  { id: 'request-manager', nombre: 'RequestManager', offset: 4, color: '#ea580c', audiencia: 'empleados',
    descripcion: 'Solicitudes de productos y servicios',
    roles: ['ROLE_ASESOR', 'ROLE_ANALISTA_CREDITO'] },
  { id: 'documento-digital', nombre: 'DOCUMENTO DIGITAL', offset: 5, color: '#db2777', audiencia: 'empleados',
    descripcion: 'Formularios, firma en PAD y e-contrato',
    roles: ['ROLE_ASESOR'] },
  { id: 'gestor-documental', nombre: 'Gestor Documental', offset: 6, color: '#4d7c0f', audiencia: 'empleados',
    descripcion: 'Archivo oficial (ECM)',
    roles: ['ROLE_GESTION_DOCUMENTAL', 'ROLE_AUDITOR'] },
  { id: 'listas-negativas', nombre: 'Listas Negativas', offset: 7, color: '#dc2626', audiencia: 'empleados',
    descripcion: 'Identidades asociadas a fraude',
    roles: ['ROLE_FRAUDE', 'ROLE_BACK_VALIDACION'] },
  { id: 'portal-cliente', nombre: 'Portal de carga del cliente', offset: 8, color: '#0891b2', audiencia: 'clientes',
    descripcion: 'Carga remota de documentos faltantes',
    roles: ['ROLE_CLIENTE'] },
  { id: 'consola-idp', nombre: 'Consola del IdP', offset: 9, color: '#0f766e', audiencia: 'empleados',
    descripcion: 'Sesiones, bloqueos y auditoría del IdP',
    roles: ['ROLE_ADMIN_IDP', 'ROLE_AUDITOR'] },
];

const appUrl = (app) => url(app.offset);

// Registro de clientes OIDC en el IdP. Los secretos son datos de prueba del laboratorio.
const CLIENTS = APPS.map((a) => ({
  client_id: a.id,
  client_secret: process.env[`SECRET_${a.id.toUpperCase().replace(/-/g, '_')}`] || `secreto-${a.id}-2026`,
  nombre: a.nombre,
  audiencia: a.audiencia,
  redirect_uris: [`${appUrl(a)}/callback`],
  post_logout_redirect_uris: [`${appUrl(a)}/salida`],
  backchannel_logout_uri: `${appUrl(a)}/backchannel-logout`,
}));

module.exports = { BASE, HOST, IDP_URL, BUZON_URL, API_AUDIENCE, APPS, CLIENTS, appUrl };
