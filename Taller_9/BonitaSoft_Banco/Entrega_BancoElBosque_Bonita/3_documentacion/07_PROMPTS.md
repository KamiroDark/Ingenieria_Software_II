# 07 · Prompts

Plantillas para continuar o reproducir este trabajo con un asistente de IA (se hizo con Claude Code). Son **reconstrucciones y plantillas**, no una transcripción literal de la conversación.

## A. Prompt de contexto (pegar al inicio de una sesión nueva)
```
Estoy trabajando en un proyecto de Bonita Studio Community 2025.2 (Windows).
Proceso: "Banco El Bosque - Crédito de libre inversión", ya construido y probado
(camino feliz, rechazo y exceso de monto funcionan). Repositorio: Entrega_BancoElBosque_Bonita.
Lee primero README.md y 3_documentacion/01_RESUMEN_DEL_PROYECTO.md y 05_PROBLEMAS_Y_SOLUCIONES.md.

Reglas importantes:
- Los formularios están ajustados a mano. NO regeneres formularios con el lápiz de Studio.
- Las condiciones de las compuertas comparan texto exacto (APROBADO, AL_DIA, NO_REQUERIDO…).
- No edites archivos del proyecto con Studio o el UI Designer abiertos; haz copia antes.
- Antes de ejecutar acciones que cambien algo, dime qué vas a hacer.
Mi objetivo ahora: <describir>.
```

## B. Prompts del trabajo realizado (reconstruidos)
1. «Necesito poner a funcionar el diagrama `Banco_El_Bosque_Credito` en BonitaSoft y que sea funcional, no solo un diagrama. No manejo bien el software; analicemos cómo hacerlo.»
2. «Lee el PDF del ejercicio y dime si todo está en orden con lo que hicimos.»
3. «Convierte tributario y antecedentes en listas, como pide el enunciado.»
4. «Ya hice los contratos y generé los formularios de las tareas; te paso los links para que los ajustes con cuidado y perfección.»
5. «Ejecuta con el navegador el camino feliz y luego el rechazo y el exceso de monto, y dime qué falla.»
6. «Organiza una carpeta con una copia del proyecto, documentación y prompts para subirla al repositorio del equipo; que nada se dañe.»

## C. Prompts útiles para lo que falta
**Correos (pendiente 1):**
```
Configura el conector Email (SMTP) en las 3 tareas de servicio del proceso. Servidor 127.0.0.1:2525,
sin autenticación, destinatario solicitud.email. Usa el servidor de 4_utilidades/smtp_falso.
Después prueba un rechazo y muéstrame el .eml recibido.
```
**Archivo adjunto (pendiente 2):**
```
Añade a cada documento de la solicitud un archivo adjunto (entrada de contrato tipo FILE) en el
formulario de inicio y en "Registrar solicitud y documentos", sin romper el flujo ya probado. Haz copia antes.
```
**Pruebas faltantes (pendiente 3):**
```
Prueba con el portal: (a) cliente no acepta reducir el monto, (b) pagaré no firmado, (c) riesgos DEVUELTO.
Reporta por cada caso en qué tarea terminó y si hubo tareas fallidas.
```
**Separar roles:**
```
Crea usuarios distintos para los 6 actores, mapea cada actor a su usuario y repite el camino feliz
cambiando de usuario en cada tarea.
```

## D. Diagnóstico rápido si un caso se detiene
```
El caso X no avanza. Consulta /bonita/API/bpm/flowNode?f=state=failed y el archivo
<Studio>\workspace\tomcat\server\logs\bonita.log y dime la causa exacta antes de cambiar nada.
```
