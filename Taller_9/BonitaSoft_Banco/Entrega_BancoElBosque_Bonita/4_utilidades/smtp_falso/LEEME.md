# Servidor SMTP falso (opcional)

Recibe correos en `127.0.0.1:2525` y los guarda en `bandeja/` como `.eml`. No envía nada a Internet.

    pip install aiosmtpd
    python servidor_smtp_falso.py

**Estado:** probado enviándole un correo de prueba; **no se usa aún** porque los conectores de correo de Bonita no están configurados (ver `3_documentacion/06_PENDIENTES_Y_LIMITACIONES.md`).
