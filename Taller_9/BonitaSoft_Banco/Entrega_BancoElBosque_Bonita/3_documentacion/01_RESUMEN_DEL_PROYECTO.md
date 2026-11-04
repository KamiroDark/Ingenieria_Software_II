# 01 · Resumen del proyecto

## Qué es
Implementación ejecutable en Bonita del proceso **Crédito de libre inversión** de Banco El Bosque, a partir del enunciado `2_fuentes_originales/Enunciado_Banco_El_Bosque_INFORMACION.pdf` (historias de usuario) y del diagrama BPMN que preparó el equipo (`Banco_El_Bosque_Credito_v2.bpmn`).

## Roles (actores)
Asesor de oficina · Analista de riesgos · Analista financiero · Abogado · Director · Cajero · (carril «Sistema» para notificaciones automáticas, sin actor).

## Flujo del proceso

| # | Tarea | Actor | Decide |
|---|---|---|---|
| 0 | Inicio de solicitud (formulario de inicio) | Asesor | — |
| 1 | Registrar solicitud y documentos | Asesor | — |
| 2 | Estudio preliminar de riesgos | Riesgos | APROBADO → sigue · DEVUELTO → correo «completar información» y vuelve a 1 · RECHAZADO → rechazo |
| 3 | Estudio interno de anotaciones | Financiero | APROBADO / otro → rechazo |
| 4 | Registrar consultas Datacrédito y CIFIN | Financiero | las **dos** calificaciones > 60 |
| 5 | Registrar estado tributario DIAN | Financiero | resultado = AL_DIA |
| 6 | Calcular capacidad de endeudamiento | Financiero | monto ≤ capacidad → sigue · excede → ver abajo |
| 6a | (excede) Notificar por correo: reducir monto | Sistema | — |
| 6b | Registrar decisión del cliente | Asesor | acepta → 6c · no acepta → rechazo |
| 6c | Actualizar monto solicitado | Asesor | vuelve a 6 |
| 7 | Revisión jurídica y antecedentes | Abogado | NO_REQUERIDO → sigue · otro → rechazo |
| 8 | Aprobación final del director | Director | APROBADO → sigue · otro → rechazo |
| 9 | Agendar cita para firma del pagaré | Asesor | — |
| 10 | Registrar datos y resultado de firma | Asesor | firmado → 11 · no → vuelve a 9 |
| 11 | Realizar desembolso | Cajero | fin «Crédito desembolsado» |
| R | Notificar por correo: solicitud rechazada | Sistema | fin «Solicitud rechazada» |

Elementos: 1 evento de inicio, 2 de fin, 13 tareas humanas, 3 tareas de servicio, 9 compuertas exclusivas, 36 flujos.

## Fórmula de capacidad de endeudamiento (del enunciado)
`CE = (IT − GF) × 0,35`, con IT = ingresos totales mensuales y GF = gastos fijos mensuales.
En el formulario se calcula sola, redondeada a 2 decimales y nunca negativa. Ejemplo: IT = 10.000.000, GF = 2.000.000 → CE = 2.800.000.

## Modelo de datos (BDM) — paquete `com.bancoelbosque`
Objeto raíz **Solicitud** con composición de: `Documento` (lista), `EstudioRiesgo`, `EstudioInterno`, `EstudioCentral` (lista), `EstudioTributario` (lista), `EstudioCapacidad`, `EstudioAntecedentes` (lista), `AprobacionFinal`, `FirmaPagare`, `Desembolso`.

Campos propios de Solicitud: tipoIdentificacion, identificacion, nombres, apellidos, **email** (añadido: lo necesitan los correos), montoSolicitado, ingresosTotales, gastosFijos, **decisionReducirMonto** (añadido: guarda si el cliente acepta reducir el monto).

Variable de negocio del proceso: `solicitud` (tipo Solicitud). Se inicializa con el contrato de inicio **más** un script que crea vacíos los 6 objetos hijos individuales (si no, las tareas posteriores fallarían al escribir en un objeto nulo). Las listas empiezan vacías.

## Condiciones de las compuertas (Groovy)
```groovy
solicitud.estudioRiesgo?.estado == "APROBADO"          // y "DEVUELTO"
solicitud.estudioInterno?.estado == "APROBADO"
solicitud.estudiosCentrales?.size() >= 2 && solicitud.estudiosCentrales.every { it.calificacion != null && it.calificacion > 60 }
solicitud.estudiosTributarios?.size() >= 1 && solicitud.estudiosTributarios.every { it.resultado == "AL_DIA" }
solicitud.montoSolicitado <= solicitud.estudioCapacidad?.capacidadEndeudamiento
solicitud.decisionReducirMonto == true
solicitud.estudiosAntecedentes?.size() >= 1 && solicitud.estudiosAntecedentes.every { it.resultado == "NO_REQUERIDO" }
solicitud.aprobacionFinal?.estado == "APROBADO"
solicitud.firmaPagare?.firmado == true
```
La flecha por defecto de cada compuerta es la de rechazo (o «NO»).

## Formularios (UI Designer)
| Formulario | Tarea |
|---|---|
| `newForm` | Inicio de solicitud |
| `newForm2` | Registrar solicitud y documentos |
| `newForm1` | Estudio preliminar de riesgos |
| `newForm3` | Estudio interno |
| `newForm4` | Centrales (2 filas prellenadas: DATACREDITO y CIFIN) |
| `newForm5` | DIAN (entidad fija «DIAN») |
| `newForm6` | Capacidad (valor calculado) |
| `newForm7` | Decisión del cliente |
| `newForm8` | Actualizar monto |
| `newForm9` | Antecedentes (entidad fija «Policía») |
| `newForm10` | Aprobación del director |
| `newForm11` | Agendar firma |
| `newForm12` | Registrar firma |
| `newForm13` | Desembolso (monto fijo = monto solicitado; cheque/cuenta/banco según el medio) |

Valores de las listas: estados `APROBADO/DEVUELTO/RECHAZADO` · identificación `CC/TI/CE/PASAPORTE` · DIAN `AL_DIA/ATRASADO` · antecedentes `REQUERIDO/NO_REQUERIDO` · medio `EFECTIVO/CHEQUE/TRANSFERENCIA` · 5 tipos de documento. **Deben escribirse exactamente así**: las condiciones comparan texto.

## Supuestos que tomamos (el enunciado no los define)
- Si el cliente **no acepta reducir** el monto, la solicitud se rechaza.
- «Devuelto» solo se trata como devolución en el estudio de riesgos; en los demás estudios y en el director cualquier valor distinto de aprobado lleva a rechazo.
- Estudio tributario y antecedentes se modelaron como **listas** (el enunciado dice «listado»), con una sola fila en el formulario.
- Se agregó el campo `email` a la solicitud.
