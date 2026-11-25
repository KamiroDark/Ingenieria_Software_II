'use strict';
// DATOS DE PRUEBA. Las claves en texto plano solo existen aquí para poder generar el directorio;
// el IdP nunca las guarda ni las lee: en ejecución solo usa idp/data/usuarios.json con el hash scrypt.
// Personas ficticias; los correos usan el dominio reservado example.com.

const empleados = [
  { usuario: 'camila.rojas', nombre: 'Camila Rojas', cargo: 'Asesora comercial · PdV Chapinero', email: 'camila.rojas@telcokonrad.example.com',
    roles: ['ROLE_ASESOR'], activo: true, clave: 'Asesor#2026' },
  { usuario: 'andres.molina', nombre: 'Andrés Molina', cargo: 'Documentólogo · Back de validación', email: 'andres.molina@telcokonrad.example.com',
    roles: ['ROLE_BACK_VALIDACION'], activo: true, clave: 'Back#2026' },
  { usuario: 'laura.gomez', nombre: 'Laura Gómez', cargo: 'Analista de riesgo y fraude', email: 'laura.gomez@telcokonrad.example.com',
    roles: ['ROLE_FRAUDE'], activo: true, clave: 'Fraude#2026' },
  { usuario: 'diana.castro', nombre: 'Diana Castro', cargo: 'Analista de crédito', email: 'diana.castro@telcokonrad.example.com',
    roles: ['ROLE_ANALISTA_CREDITO'], activo: true, clave: 'Credito#2026' },
  { usuario: 'mario.ruiz', nombre: 'Mario Ruiz', cargo: 'Gestión documental · Archivo central', email: 'mario.ruiz@telcokonrad.example.com',
    roles: ['ROLE_GESTION_DOCUMENTAL'], activo: true, clave: 'Archivo#2026' },
  { usuario: 'sofia.herrera', nombre: 'Sofía Herrera', cargo: 'Auditoría interna', email: 'sofia.herrera@telcokonrad.example.com',
    roles: ['ROLE_AUDITOR'], activo: true, clave: 'Auditor#2026' },
  { usuario: 'admin.idp', nombre: 'Administrador IdP', cargo: 'Seguridad de la información', email: 'seguridad@telcokonrad.example.com',
    roles: ['ROLE_ADMIN_IDP'], activo: true, clave: 'Admin#2026' },
  { usuario: 'pedro.lopez', nombre: 'Pedro López', cargo: 'Ex asesor (retirado)', email: 'pedro.lopez@telcokonrad.example.com',
    roles: ['ROLE_ASESOR'], activo: false, clave: 'Retirado#2026' },
];

// Clientes (ciudadanos). En el TO-BE el CRM es su maestro; el IdP los conoce para autenticarlos con OTP.
// No tienen contraseña: prueban su identidad con el documento y un código enviado a su correo registrado.
const ciudadanos = [
  { idCliente: 1001, tipoDoc: 'CC', numeroDoc: '1032456789', nombres: 'Juan', apellidos: 'Pérez Gómez', email: 'juan.perez@example.com' },
  { idCliente: 1002, tipoDoc: 'CC', numeroDoc: '52123456', nombres: 'María Fernanda', apellidos: 'Torres Díaz', email: 'mafe.torres@example.com' },
  { idCliente: 1003, tipoDoc: 'CE', numeroDoc: '987654', nombres: 'Luis Alberto', apellidos: 'Ramírez', email: 'luis.ramirez@example.com' },
  { idCliente: 1004, tipoDoc: 'CC', numeroDoc: '1019876543', nombres: 'Ana Lucía', apellidos: 'Mendoza Ríos', email: 'ana.mendoza@example.com' },
];

module.exports = { empleados, ciudadanos };
