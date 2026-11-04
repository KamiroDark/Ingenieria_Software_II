"""Servidor SMTP falso para la demostración del proceso Banco El Bosque.

Escucha en localhost:2525, NO envía nada a Internet y guarda cada correo
recibido como archivo .eml (legible) dentro de la carpeta "bandeja".

Uso:  python servidor_smtp_falso.py
Detener: Ctrl+C
"""
import asyncio
import email
import os
import sys
import time
from email import policy

# permite usar aiosmtpd instalado en una carpeta temporal
extra = os.environ.get("PYLIB")
if extra:
    sys.path.insert(0, extra)

from aiosmtpd.controller import Controller

CARPETA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bandeja")
os.makedirs(CARPETA, exist_ok=True)
contador = 0


class Guardar:
    async def handle_DATA(self, server, session, envelope):
        global contador
        contador += 1
        msg = email.message_from_bytes(envelope.content, policy=policy.default)
        asunto = msg.get("Subject", "(sin asunto)")
        nombre = time.strftime("%Y%m%d_%H%M%S") + f"_{contador:03d}.eml"
        with open(os.path.join(CARPETA, nombre), "wb") as f:
            f.write(envelope.content)
        print(f"[{time.strftime('%H:%M:%S')}] Correo #{contador} para {envelope.rcpt_tos} | Asunto: {asunto}", flush=True)
        return "250 Mensaje guardado"


if __name__ == "__main__":
    controller = Controller(Guardar(), hostname="127.0.0.1", port=2525)
    controller.start()
    print(f"Servidor SMTP falso escuchando en 127.0.0.1:2525. Correos en: {CARPETA}", flush=True)
    try:
        asyncio.get_event_loop().run_forever()
    except KeyboardInterrupt:
        controller.stop()
