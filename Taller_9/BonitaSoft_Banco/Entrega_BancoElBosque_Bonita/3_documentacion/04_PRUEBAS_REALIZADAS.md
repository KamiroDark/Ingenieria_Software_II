# 04 · Pruebas realizadas

Todas se ejecutaron en el portal local de Bonita (04/11/2026) con datos ficticios. Tras cada prueba se consultó la API de Bonita: **0 tareas fallidas**.

## Caso 1 · Camino feliz — caso 1001, COMPLETADO
Datos de inicio: CC · 1020304050 · Cliente Prueba Uno Dos · monto **2.000.000** · ingresos **10.000.000** · gastos fijos **2.000.000**.

| Tarea | Datos | Resultado |
|---|---|---|
| Registrar solicitud | sin cambios | pasa |
| Estudio de riesgos | APROBADO | compuerta → sigue |
| Estudio interno | APROBADO | sigue |
| Centrales | Datacrédito 80, CIFIN 75, ambos APROBADO | sigue (ambos > 60) |
| DIAN | AL_DIA, APROBADO | sigue |
| Capacidad | calculada **2.800.000** ≥ 2.000.000; APROBADO | sigue |
| Antecedentes | NO_REQUERIDO, APROBADO | sigue |
| Director | APROBADO | sigue |
| Agendar firma | fecha de hoy, 10:00 | llegan fecha/hora a la siguiente tarea |
| Registrar firma | PAG-0001, firmado | sigue |
| Desembolso | monto fijo 2.000.000, medio EFECTIVO | **fin: Crédito desembolsado** |

## Caso 2 · Rechazo por centrales — caso 1002, COMPLETADO
Mismo inicio, con otro cliente. Datacrédito = **50** (RECHAZADO), CIFIN = 75.
La compuerta «¿Calificaciones superiores a 60?» tomó la rama RECHAZADO → «Notificar por correo: solicitud rechazada» → fin «Solicitud rechazada».

## Caso 3 · Exceso de monto — caso 1003, ABIERTO a propósito
Inicio con monto **5.000.000** (capacidad 2.800.000).

| Paso | Resultado |
|---|---|
| Capacidad = 2.800.000 < 5.000.000 | rama «EXCEDE» → «Registrar decisión del cliente» |
| Cliente acepta reducir (casilla marcada) | → «Actualizar monto solicitado» |
| Nuevo monto 2.500.000 | → vuelve a «Calcular capacidad» (el bucle funciona) |
| Capacidad con APROBADO | sale del bucle → «Revisión jurídica y antecedentes» |

El caso se dejó abierto en esa tarea (el resto del flujo ya está probado en el caso 1). Se puede cancelar desde el portal.

## Validaciones de formulario comprobadas
- Las listas desplegables ofrecen exactamente los valores que esperan las condiciones.
- Centrales: dos filas prellenadas y bloqueadas (DATACREDITO, CIFIN); calificación obligatoria entre 0 y 100.
- DIAN y antecedentes: entidad bloqueada; resultado y estado obligatorios.
- Desembolso: cheque / cuenta / banco se muestran u ocultan según el medio.
- Estado de validación del diagrama sin errores rojos.

## No probado
- El cliente **no acepta** reducir el monto (debería ir a rechazo).
- Pagaré **no firmado** (debería volver a «Agendar cita»).
- Estudio de riesgos **DEVUELTO** (debería volver a «Registrar solicitud»).
- Rechazos en DIAN, antecedentes y director (misma lógica que el de centrales).
- Envío de correos (no configurado).
- Formulario de inicio con las nuevas validaciones (obligatorios y lista de identificación): se aplicaron en los archivos pero no se ejecutó un caso nuevo después del cambio.
