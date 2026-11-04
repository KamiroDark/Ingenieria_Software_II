# 03 · Instalación y ejecución

## Requisitos
- **Bonita Studio Community 2025.2** (probado con `2025.2-u0`, Windows 11). Otra versión puede pedir migrar el proyecto.
- Java incluido con Studio (no hace falta instalarlo aparte).
- Puerto 8080 libre (portal embebido).

## Opción A — Copiar el proyecto al workspace (la más fiable)
1. Cierra Bonita Studio.
2. Copia `1_proyecto_bonita/bancoelbosque` a la carpeta `workspace` de tu instalación de Studio  
   (ej.: `C:\BonitaStudioCommunity-2025.2-u0\workspace\`).
3. Abre Studio → **Archivo → Cambiar proyecto…** → elige `bancoelbosque`.
   - Si no aparece, usa **Importar un proyecto** apuntando a la carpeta.
4. Espera a que Studio termine de construir el proyecto (barra de progreso).

## Opción B — Importar el `.bos` exportado por Studio (la oficial, recomendada)
En la carpeta `RespaldoOficial(es)/` está `bancoelbosque_20261104_1800.bos`, generado con **Archivo → Exportar un proyecto**. Para usarlo: **Archivo → Importar un proyecto** y elegir ese archivo (si el diálogo solo muestra `.zip`, cambiar el filtro a «todos los archivos»; `.bos` es un zip con otra extensión).  
Si se hace un cambio en Studio, volver a exportar y reemplazar el `.bos` (y regenerar `MANIFIESTO_SHA256.txt`).

> **Aviso:** ninguna de las dos opciones se probó todavía en un equipo distinto al original. Pruébenlo una vez en otro computador **antes** de la clase y, si falla, usen el `.zip` exportado desde Studio como respaldo.

## Primera ejecución
1. Doble clic en **Modelo de Datos de Negocio → bom.xml** → **Validar** → **Desplegar**.
   - Si da error de `getLength()`, ver `05_PROBLEMAS_Y_SOLUCIONES.md` (problema 3).
2. Abre el diagrama `Banco_El_Bosque_Credito_v3`. La pestaña **Estado de validación** no debe mostrar errores en rojo (un aviso amarillo sobre la «página de resumen» es normal).
3. **Configurar → Mapeo de actores**: comprueba que los 6 actores estén mapeados (ya vienen mapeados a un usuario de ejemplo de la organización ACME; si tu organización es otra, vuelve a mapearlos).
4. **Ejecutar** (▶). Se abre el portal en el navegador.
5. Inicia sesión con el usuario de ejemplo de la organización ACME. Las credenciales están en la documentación de Bonita para la organización de demostración; **no se escriben aquí a propósito**. Ojo: `app/organizations/ACME.xml` (la organización de demostración que trae Bonita) incluye esas contraseñas de ejemplo en texto plano; son las de demostración públicas de Bonita, no datos reales, pero tampoco la usen en producción.
6. Portal → **Procesos** → «Banco El Bosque – Crédito de libre inversión» → ▶ para iniciar un caso.

## Cómo avanzar un caso en el portal
- Bandeja **Tareas**: marca la casilla de la tarea y pulsa **Tomar**. Sin «Tomar», el formulario se ve pero no se puede enviar.
- Llena el formulario y pulsa **Enviar**.
- Pulsa el icono de actualizar de la lista para ver la siguiente tarea (puede tardar un par de segundos).
- Como los seis actores están mapeados al mismo usuario, una sola sesión completa todo el proceso.

## Datos de prueba
Ver `04_PRUEBAS_REALIZADAS.md`.

## Servidor de correo (opcional, no necesario)
`4_utilidades/smtp_falso/servidor_smtp_falso.py` recibe correos en `127.0.0.1:2525` y los guarda como `.eml`. Requiere `pip install aiosmtpd`. **Hoy no se usa**: los conectores de correo no están configurados (ver pendientes).

## Qué NO se sube al repositorio
`app/h2_database/` (base de datos local, ~58 MB), `target/` (código generado) y `.flattened-pom.xml`. El `.gitignore` ya los excluye. Studio los regenera solo.
