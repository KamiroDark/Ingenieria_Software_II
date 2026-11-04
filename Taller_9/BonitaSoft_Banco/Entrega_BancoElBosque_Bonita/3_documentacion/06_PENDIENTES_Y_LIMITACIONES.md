# 06 · Pendientes y limitaciones

Dicho con claridad, para no tener sorpresas en la presentación.

## Pendiente 1 · Correos electrónicos (el más importante)
El enunciado pide que se envíe un correo al cliente cuando: el estudio de riesgos devuelve la solicitud, en cada rechazo y cuando el monto excede la capacidad.
**Estado:** las 3 tareas de servicio existen en el diagrama y el flujo pasa por ellas, pero **no tienen conector de correo**, así que no se envía nada.
- Notificar por correo: completar información
- Notificar por correo: reducir monto
- Notificar por correo: solicitud rechazada

**Cómo terminarlo (≈ 10 min):** en cada tarea → **Ejecución → Conectores de salida → Añadir → Email (SMTP)**. Para demostración: servidor `127.0.0.1`, puerto `2525`, sin SSL ni autenticación, y `4_utilidades/smtp_falso/servidor_smtp_falso.py` corriendo. Destinatario: expresión Groovy `solicitud.email`. Mensaje de ejemplo:
```groovy
"Estimado(a) " + solicitud.nombres + " " + solicitud.apellidos + ": lamentamos informarle que su solicitud de crédito ha sido rechazada."
```
Para correos reales hay que configurar el SMTP de una cuenta (p. ej. contraseña de aplicación); no se probó.

## Pendiente 2 · Archivo adjunto de los documentos
El enunciado lista «archivo adjunto» por documento. No está implementado: en Bonita los archivos se manejan como documentos del proceso (entrada de contrato tipo FILE), lo que cambia el contrato y las operaciones. Hoy solo se registra tipo y nombre.

## Pendiente 3 · Caminos sin probar
Ver el final de `04_PRUEBAS_REALIZADAS.md` (cliente no acepta reducir, pagaré no firmado, riesgos DEVUELTO, rechazos en DIAN / antecedentes / director).

## Limitaciones conocidas
- **Un solo usuario** mapeado a los 6 actores (para facilitar la prueba). No se demostró separación real de roles.
- El estado del estudio de capacidad conserva el valor de la vuelta anterior al repetir la tarea; el analista debe actualizarlo (no afecta el flujo, porque la compuerta compara monto contra capacidad).
- El monto del desembolso es fijo (= monto solicitado) por decisión de diseño; si se pide editable, se cambia en `newForm13`.
- «Devuelto» solo se maneja en el estudio de riesgos.
- Los formularios usan etiquetas genéricas de Studio en algunos botones («Add Documento», «Submit»…).
- Aviso amarillo en el diagrama: no hay formulario para la «página de resumen» del proceso. No afecta la ejecución.
- Probado únicamente en un equipo (Windows 11, Studio 2025.2-u0). La importación en otro equipo no se probó.
- El campo email del formulario valida formato, no existencia.
