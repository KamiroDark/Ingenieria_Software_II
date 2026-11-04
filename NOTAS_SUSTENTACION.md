# Notas para la sustentación · Grupo 2

Decisiones del Proyecto #1 (Telco Konrad, matriz EA-XPress) y cómo defenderlas. Es un documento vivo: se actualiza con cada taller.

Fuentes: `docs/telco-konrad/` (AS-IS, TO-BE, Anexo técnico y Anexo técnico II) y la plantilla `Plantilla EA/EA-XPress.xls`. Diagramas de integración en `docs/diagramas/`.

| Taller | Hojas |
|---|---|
| T6 | 0.0, 1.0, 2.0, 2.1 |
| T7 | 3.0, 4.0 |
| T8 | 5.0, 7.0, 8.0, 9.0 |
| Todos | 6.0 (inventario, se actualiza en cada taller) |

---

## Nomenclatura de GAPs

Cada prefijo son las iniciales del análisis que lo produce, en mayúsculas:

| Prefijo | Significado completo | Hoja | Ejemplo |
|---|---|---|---|
| AP-GAP | **A**nálisis de **P**rocesos · brecha | 1.0 | AP-GAP-21: validación contra listas negativas |
| AINF-GAP | **A**nálisis de **Inf**ormación · brecha (antes D-GAP) | 2.0 | AINF-GAP-01: CRM como maestro del cliente |
| AA-GAP | **A**nálisis de **A**plicaciones · brecha | 3.0 | AA-GAP-03: RequestManager deja de adjuntar documentos |
| AINT-GAP | **A**nálisis de **Int**egración · brecha | 4.0 | AINT-GAP-05: ID-TRUE → RNEC por Web Service |
| AT-GAP | **A**nálisis de **T**ecnología · brecha | 5.0 | AT-GAP-09: Single Sign On |

### Otros identificadores y siglas

| ID / sigla | Significado completo |
|---|---|
| Meta 1, 2, 3 | Metas de negocio de la hoja 0.0: 1 Unificación de los datos de clientes, 2 Eliminar procesos manuales, 3 Integración de sistemas |
| SN-1, SN-2, SN-3 | Estrategia de negocio habilitadora 1, 2 o 3 de cada meta (hoja 0.0). "Meta 3 · SN-1" = estrategia 1 de la meta 3 |
| O1.1 … O3.3 | Objetivo SMART: el primer número es la meta y el segundo la fase (O2.3 = meta 2, fase 3) |
| AT-1 … AT-92 | Fila del modelo de referencia técnico (TRM) de la hoja 5.0; no es una brecha |
| ABB-ID | Architecture Building Block: número del proyecto de solución en la hoja 7.0 |
| NEW / MODIFY / DELETE / KEEP | Algo que se crea / se cambia / se elimina / se mantiene igual |
| AS-IS / TO-BE | Estado actual / estado futuro deseado |
| RNEC | Registraduría Nacional del Estado Civil |
| CRM | Customer Relationship Management: gestión de clientes |
| ECM | Enterprise Content Management: gestión documental |
| IdP / SSO | Proveedor de identidad / inicio de sesión único (Single Sign On) |
| OCR | Reconocimiento óptico de caracteres |
| PAD | Tableta de captura de firma |
| WS / RMI / SMTP | Web Service / invocación remota de métodos Java / protocolo de envío de correo |
| TRM | Technical Reference Model: catálogo de servicios técnicos de TOGAF que usa la hoja 5.0 |

Las instrucciones originales de la plantilla piden los prefijos "D", "App" e "INT". Se dejaron sin modificar, pero los IDs siguen la nomenclatura del grupo.

---

## Aplicaciones del caso: qué hace cada una

> Diagramas de cómo se comunican (métodos, medio y qué dato viaja en cada llamada): [`docs/diagramas/INTEGRACIONES_TO-BE.md`](docs/diagramas/INTEGRACIONES_TO-BE.md).

### Aplicaciones internas

| Aplicación | Estado | Qué hace específicamente | Para qué |
|---|---|---|---|
| **ID-TRUE** | AS-IS y TO-BE (cambia) | AS-IS: con el número de identificación consulta la base de datos y muestra los datos y la foto del cliente; el asesor compara a ojo con el documento físico. Si el cliente no existe, lo enrola (datos biográficos, adicionales y foto). TO-BE: captura la huella y la valida con la RNEC, lee el documento con el escáner 3 luces (OCR por RMI), consulta las listas negativas y crea el cliente en el CRM. | Confirmar que el cliente es quien dice ser y frenar el fraude de identidad. |
| **CRM** | AS-IS y TO-BE (cambia) | Consulta, crea y actualiza el cliente. Según el anexo, es "la aplicación en donde los clientes se crean y es el punto centralizado de donde se toma la información". TO-BE: es el **maestro del cliente** y expone un único servicio de cliente con el modelo canónico (hoja 2.1). | Tener una sola versión del cliente para todas las aplicaciones. |
| **VALIDACIÓN CREDITICIA** | AS-IS y TO-BE | Consulta por tipo y número de identificación la historia del cliente en las centrales de riesgo y guarda una calificación: TRUE pre-aprobado o FALSE rechazado. Crea la calificación la primera vez y la actualiza en las siguientes. TO-BE: RequestManager le pide la calificación por Web Service. | Decidir si se pre-aprueba la obligación que va a adquirir el cliente. |
| **RequestManager** | AS-IS y TO-BE (cambia) | Registra la **solicitud** de producto o servicio, crea o actualiza el cliente de la solicitud, adjunta los documentos escaneados y guarda la forma de envío (1 email, 2 físico). TO-BE: crea la solicitud dentro del flujo único, obtiene la calificación y entrega los **metadatos** del expediente aprobado al gestor documental; deja de adjuntar documentos (AA-GAP-03) y de guardar la forma de envío (AA-GAP-04). | Llevar el expediente de cada venta. No es un ERP. |
| **DOCUMENTO DIGITAL** | Nueva (TO-BE) | Crear documentos (formularios web, autorización de centrales y e-contrato firmados en el PAD), adjuntar documentos (en el punto de venta y de forma remota con acceso seguro) e imprimir documentos. Además envía el contrato por correo y genera el archivo plano diario para el gestor documental. | Que la venta se haga sin papel: es donde los documentos **nacen, se firman y se completan**. |
| **Gestor Documental** | Nuevo (TO-BE) | Lee cada 24 h el archivo plano de DOCUMENTO DIGITAL (documentos) y consume el Web Service de RequestManager (metadatos). Une ambos por idSolicitud, indexa, clasifica y conserva con reglas de retención. | Ser el **archivo oficial y definitivo** de la compañía; reemplaza el archivo físico de Bogotá. |
| **Listas negativas** | Nuevo componente (TO-BE) | Guarda las identidades asociadas a fraude. ID-TRUE la consulta antes de seguir con la venta y registra los casos que el back de validación no confirma. | Bloquear a tiempo a quienes ya intentaron un fraude. |

### DOCUMENTO DIGITAL vs. Gestor Documental

| | DOCUMENTO DIGITAL | Gestor Documental |
|---|---|---|
| Rol | Aplicación operativa de la venta | Repositorio de archivo (ECM) |
| Momento | Durante la venta | Después de aprobada la solicitud |
| Qué hace | Crea, firma, completa, imprime y envía documentos | Guarda, indexa, busca y conserva documentos |
| Usuarios | Asesor y cliente | Back office, auditoría, cumplimiento |
| Documentos | En trabajo, pueden cambiar | Definitivos, con versión y retención |
| Analogía | El escritorio donde se arma y firma el expediente | La bodega oficial donde queda archivado |

Comparación corta: DOCUMENTO DIGITAL produce los documentos; el gestor documental los custodia.

### Sistemas y dispositivos externos

| Sistema | Qué hace | Cómo se integra (TO-BE) |
|---|---|---|
| RNEC (Registraduría Nacional del Estado Civil) | Confirma la identidad y la huella del ciudadano | ID-TRUE consume su Web Service |
| Escáner 3 luces | Verifica la autenticidad del documento y lee sus datos por OCR | ID-TRUE ejecuta un método del software del escáner por RMI |
| Captor de huella | Captura la huella del cliente en el punto de venta | Dispositivo conectado a ID-TRUE |
| PAD de firma | Captura la firma electrónica del cliente | Dispositivo usado desde DOCUMENTO DIGITAL |
| Centrales de riesgo | Entregan la historia crediticia del cliente | Validación Crediticia las consulta |
| Servidor de correo | Envía el contrato y los anexos al cliente | DOCUMENTO DIGITAL por SMTP |

---

## Hoja 0.0 · Intención estratégica

- **Meta 1 · SN-1:** "Consolidar en el CRM **existente**…". Antes decía "hacia un nuevo CRM", lo que contradecía AINF-GAP-01: el CRM ya existe y pasa a ser el maestro del cliente.

---

## Hoja 2.0 · Análisis de Información (AINF-GAP)

### CRM en el AS-IS (AINF-GAP-01)
- El CRM **sí existe** en el AS-IS. El anexo lo presenta entre las entidades "que influyen en los procesos AS-IS" y dice que es "la aplicación en donde los clientes se crean y es el punto centralizado de donde se toma la información". El TO-BE habla de "los datos existentes en el CRM".
- Ninguna actividad del proceso de venta AS-IS lo usa directamente, por eso no aparece en el BPMN ni en el Canvas AS-IS. La brecha es AINF-GAP-01: MODIFY, el CRM pasa a ser el maestro del cliente.

### Mapa CRUD
"Cliente" es la **entidad de datos**, no la persona. Cada celda indica qué operaciones hace la aplicación sobre ese registro. En el AS-IS tenemos ID-TRUE CR, Validación Crediticia CRU, RequestManager CRU y CRM CRU: cuatro sistemas crean el mismo cliente, que es la duplicidad que describe el anexo.

---

## Hoja 2.1 · Modelo canónico

Es un **modelo o contrato de datos** (un artefacto de diseño), no un sistema. Define nombres, tipos, formatos y catálogos comunes del Cliente. Se implementa en las integraciones: cada sistema traduce desde y hacia el canónico. Ejemplo: el tipo de documento "CEDULA CIUDADANIA" (ID-TRUE) y "CC" (CRM) quedan en el canónico como `tipoDocumento` = CC.

### Atributos que no están en el anexo (se mantienen a propósito)

| Atributo | Por qué existe | Fuente |
|---|---|---|
| `plantillaHuella` (BLOB) | El TO-BE exige validar la identidad con el captor de huella contra la Registraduría. Hoy ningún sistema guarda esa huella; si no está en el canónico, cada sistema la manejaría por su cuenta y se repite la duplicidad. | TO-BE: "Validación mediante captor de huella electrónica" y "Validación de la huella directamente con la Registraduría" |
| `rutaFirma` (VARCHAR 255) | El TO-BE captura la firma electrónica en el PAD y con ella se firma el e-contrato. Debe quedar en un solo lugar: el CRM, dueño del dato. | TO-BE: "Captura de la firma electrónica mediante PAD de firma" |
| `idCliente` (BIGINT) | Llave técnica única. Hoy cada sistema identifica al cliente de forma distinta (INT, VARCHAR(30), tipo + número); la llave la asigna el CRM como maestro. | Anexo: "El CRM es la aplicación en donde los clientes se crean…" |

Argumento corto: el canónico no solo unifica lo que existe; también incorpora los datos nuevos del TO-BE (biometría y firma) para que nazcan unificados.

---

## Hoja 3.0 · Análisis de Aplicaciones (AA-GAP)

- **Sección 1:** fiel a la plantilla, solo lleva "x". Usa las mismas 20 actividades AS-IS y 20 TO-BE de la hoja 1.0.
  - Aplicaciones AS-IS: ID-TRUE, Validación Crediticia, RequestManager y CRM.
  - Aplicaciones TO-BE: ID-TRUE, Listas negativas, CRM, Validación Crediticia, RequestManager, DOCUMENTO DIGITAL y Gestor Documental.
- **Listas negativas como componente nuevo.** Se sustenta en la Meta 3 · SN-1 y O3.1: "integrar ID-TRUE con la Registraduría Nacional **y las listas negativas**".
- **Sección 2 (GAP unificado):** función (aplicación) AS-IS × función (aplicación) TO-BE, como en el ejemplo de la plantilla ("Enviar Correos(CRM)").
  - Las funciones del CRM y de Validación Crediticia, y la creación de solicitud y cliente en RequestManager, quedan en KEEP. Lo que cambia en ellas se registra como AINF-GAP o AINT-GAP, para no contar dos veces la misma brecha.
  - AA-GAP-01 a 13: 2 MODIFY, 2 DELETE y 9 NEW.

### RequestManager
Es el gestor de **solicitudes de venta**: crea la solicitud y guarda el expediente de cada venta. **No es un ERP**: no maneja finanzas, inventario, facturación ni recursos humanos. En el TO-BE deja de adjuntar documentos (AA-GAP-03, DELETE); ver "Gestor documental".

---

## Hoja 4.0 · Análisis de Integración (AINT-GAP)

- **Lectura:** fila contra columna. Las aplicaciones de la izquierda consumen los servicios que exponen las aplicaciones de arriba.
- **AS-IS:**
  - El CRM es el "punto centralizado de donde se toma la información" del cliente (anexo técnico, aspecto 1). ID-TRUE, Validación Crediticia y RequestManager lo consultan, cada una con su propio modelo de datos: la duplicación de métodos.
  - Validación Crediticia consulta las centrales de riesgo.
- **TO-BE:**
  - Una sola integración por funcionalidad. El CRM expone un único servicio de cliente (consultar, crear y actualizar) con el modelo canónico, y todas las aplicaciones usan ese mismo servicio.
  - Validación Crediticia no es una caja aislada: RequestManager le pide la calificación, y ella consulta el cliente en el CRM y el historial en las centrales de riesgo.
- AINT-GAP-01 a 11: 3 MODIFY (las consultas al CRM pasan a un único servicio canónico) y 8 NEW. La consulta a centrales de riesgo queda en KEEP.

### Origen de cada integración TO-BE

| Origen | Integraciones |
|---|---|
| Textual del anexo técnico | ID-TRUE→CRM (crear cliente, WS) · ID-TRUE→RNEC (WS) · ID-TRUE→Escáner 3 luces (RMI) · Gestor Documental→RequestManager (WS) · Gestor Documental→DOCUMENTO DIGITAL (archivo plano, batch 24 h) |
| Texto del AS-IS | Validación Crediticia→Centrales de riesgo |
| Inferidas por el grupo | RequestManager→Validación Crediticia · ID-TRUE→Listas negativas · DOCUMENTO DIGITAL→CRM · DOCUMENTO DIGITAL→Servidor de correo (SMTP) · consulta y actualización del cliente en el CRM |

Las inferidas se sustentan en AINF-GAP-03, 04 y 05 (el CRM como maestro), AP-GAP-17 (envío solo por correo), AP-GAP-21/22 (listas negativas) y la Meta 3 · SN-2 (orquestar RequestManager, Validación Crediticia y CRM).

---

## Gestor documental

**Qué es:** el repositorio oficial (ECM) donde la empresa archiva, clasifica, indexa y conserva sus documentos con reglas de conservación. En el TO-BE reemplaza al archivo físico de Bogotá.

**Problema detectado:** el anexo dice que el gestor recibe "toda su documentación" por dos vías: el WS de RequestManager y el archivo plano de DOCUMENTO DIGITAL. Pero en nuestro TO-BE (hojas 1.0 y 3.0) todos los documentos nacen o se cargan en DOCUMENTO DIGITAL. Si las dos vías envían archivos, se duplican.

**Decisión: un solo dueño por tipo de contenido.**

| Vía | Qué lleva |
|---|---|
| DOCUMENTO DIGITAL → archivo plano (batch 24 h) | **Solo documentos:** autorización de centrales firmada en el PAD, soportes cargados en el formulario web, documentos faltantes cargados de forma remota, e-contrato firmado y anexos. Cada uno con idSolicitud y tipo de documento. |
| RequestManager → Web Service | **Solo metadatos** del expediente aprobado: número de solicitud, estado, idCliente y producto. No lleva archivos. |

**Flujo:**
1. RequestManager aprueba la solicitud y crea el expediente en el gestor.
2. DOCUMENTO DIGITAL envía los documentos en el batch de 24 h.
3. El gestor une los dos envíos por idSolicitud.

**Controles contra duplicados:**
- Clave única idSolicitud + tipo de documento + versión.
- Carga idempotente: si un documento llega dos veces, se reemplaza en lugar de duplicarse.
- Hash de cada archivo.
- Solo se archiva de forma definitiva lo que pertenece a solicitudes aprobadas.

**Efecto en la matriz:**
- AA-GAP-03 pasa a DELETE: RequestManager deja de adjuntar documentos. Se aparta del inventario TO-BE del anexo, que todavía le asigna esa función a RequestManager; se defiende con el TO-BE ("una aplicación que gestione todos los documentos de manera digital").
- AINT-GAP-10 queda solo para metadatos.

**Datos que no son documentos** y se quedan en su aplicación maestra: la huella y la firma en el CRM (canónico), la calificación en Validación Crediticia y los datos de la solicitud en RequestManager.

---

## Hoja 5.0 · Análisis de Tecnología (AT-GAP)

- **Columnas:** ¿Considerado? y ¿Se debe considerar? solo llevan Sí o No; la razón del AS-IS está en el **comentario** de cada celda de la columna E. Plataforma = producto o tecnología concreta; ¿Cómo? = cómo se usa o se implementa. Las filas 1 a 9 están fijas.
- **Lectura:** cada fila es un servicio del modelo de referencia técnico (TRM). Se diligenciaron todas: "No" en ¿Considerado? y ¿Se debe considerar? cuando el servicio está fuera del alcance de la venta. Se eliminó el ejemplo de la plantilla (auditoría de pagos a bancos, AT-72).
- **Fuentes:** los 6 puntos del anexo técnico II y las herramientas que exige el TO-BE (escáner 3 luces, captor de huella, PAD, gestor documental, correo, batch de 24 h).
- AT-GAP-01 a 16: **8 MODIFY y 8 NEW**. Dos filas quedan consideradas sin brecha: DBMS (los cambios de datos ya son AINF-GAP) e impresión (se mantienen las impresoras de los puntos de venta).

| Punto del anexo técnico II | Fila TRM | GAP |
|---|---|---|
| 1. Autenticación y autorización por aplicación → SSO | AT-70 / AT-73 | AT-GAP-09 / AT-GAP-12 (MODIFY) |
| 2. Contraseñas sin cifrar en algunos sistemas | AT-77 | AT-GAP-14 (MODIFY) |
| 3. Históricos en BD relacionales | AT-24 | AT-GAP-03 (NEW) |
| 4. Correo que falla y buzones insuficientes | AT-38 | AT-GAP-05 (MODIFY) |
| 5. Sin política de backups, copias en la misma sede | AT-87 | AT-GAP-16 (MODIFY) |
| 6. Windows, Linux y Solaris | AT-50 | AT-GAP-07 (MODIFY) |

Los demás AT-GAP salen del TO-BE: generación del e-contrato (01), gestor documental (02), escáner 3 luces y huella (04), bus de servicios ESB (06, Meta 3 · SN-1), batch de 24 h (08), acceso remoto del cliente (10), auditoría antifraude (11), firma con no repudio en el PAD (13) y TLS (15).

**Plataformas TO-BE:** se nombra un producto concreto (Keycloak, Alfresco, WSO2, etc.) para que la propuesta sea específica. Lo que se defiende es el tipo de solución (IdP, ECM, capa de API, data warehouse con ETL, backups 3-2-1); cada producto se puede cambiar por un equivalente sin cambiar la brecha.

**Sin doble conteo:** el AT-GAP es la plataforma; la función ya está en AA-GAP y la integración en AINT-GAP. Ejemplo: el gestor documental es AA-GAP-13 (función), AINT-GAP-10/11 (integraciones) y AT-GAP-02 (producto ECM).

### ¿Por qué ESB y no API Management? (AT-GAP-06 y AT-GAP-08)

| Necesidad del caso | ESB | API Management |
|---|---|---|
| Traducir cada aplicación al modelo canónico (p. ej. "CEDULA CIUDADANIA" → CC) | Sí: transformación es su función principal | No: publica APIs, no transforma datos |
| Mezclar protocolos: SOAP/REST, archivo plano, SMTP | Sí: adaptadores para cada uno | Solo HTTP |
| Batch de 24 h hacia el gestor documental | Sí: tarea programada + adaptador de archivos | No |
| Exponer APIs a terceros con portal, llaves y cuotas | Parcial | Sí: es su fuerte |

Nuestros consumidores son **aplicaciones internas**: los terceros (RNEC, centrales de riesgo) nos exponen servicios a nosotros, no al revés. Por eso necesitamos **mediación** (ESB) y no un portal de APIs. El ESB publica sus servicios como APIs, así que cumple la Meta 3 · SN-1 ("capa de integración por API").
- **ESB + BPMS no se pisan:** el BPMS (Bonita) orquesta los **pasos del negocio** de la venta (incluye tareas humanas); el ESB resuelve **cada llamada técnica** que esos pasos necesitan.
- Producto: WSO2 Micro Integrator. Para un volumen diario, su adaptador de archivos cubre el batch; un MFT solo haría falta si los archivos crecieran mucho o se intercambiaran con terceros.

### Huella en "Imaging" (AT-27) y validación con la RNEC: por qué es discutible

El TRM clasifica por la **función técnica** que cumple el componente, no por el **propósito de negocio**. Ahí está la discusión:

| Lectura | Clasificación | Argumento |
|---|---|---|
| Por propósito | AT-70 Identification and authentication | La huella sirve para identificar a una persona |
| Por función técnica (la nuestra) | AT-27 Imaging functions | El captor produce una **imagen** de la huella (estándares WSQ / ISO 19794-4), igual que el escáner 3 luces produce la imagen del documento. Imaging cubre escanear, crear y comprimir imágenes según estándares reconocidos |

**Por qué no AT-70:** en el TRM, AT-70 habla de los **usuarios del sistema** (contraseñas, cuentas, registro de acciones), o sea el asesor, no el cliente. Ya la usamos para el SSO (AT-GAP-09). Meter ahí la huella del cliente mezclaría dos identidades distintas: el login del empleado y la identidad del ciudadano.

**Validación con la RNEC:** quien compara la huella es la **Registraduría**, no un sistema nuestro. Nosotros solo la consumimos por Web Service, así que es una **integración** (AINT-GAP-05), no una plataforma de tecnología. Las piezas técnicas que la soportan ya están en la hoja 5.0: el ESB (AT-GAP-06) y TLS (AT-GAP-15).

**Frase para la sustentación:** "Clasificamos por lo que hace el componente en nuestra plataforma: capturar una imagen. Quien decide si la huella coincide es la RNEC, y eso es una integración, no tecnología propia."

### Norma de soporte
- **Ley 527 de 1999:** valida en Colombia los mensajes de datos y la firma electrónica; sustenta el e-contrato firmado en el PAD (AT-GAP-13).

---

## Hoja 6.0 · Inventario (actualización T8)

Se agregaron AT-GAP-01 a 16. Total: 25 AP-GAP, 5 AINF-GAP, 13 AA-GAP, 11 AINT-GAP y 16 AT-GAP = **70 brechas**.

---

## Hoja 7.0 · Iniciativas (soluciones)

- **14 soluciones**, ordenadas por la tabla de valoración consolidada de la hoja 8.0 (ABB-ID 1 = la primera en ejecutarse). El color del ABB-ID es la fase: rojo Fase-1, azul Fase-2, verde Fase-3.
- **Cada uno de los 70 GAPs lo cierra exactamente una solución** (verificado: ninguno suelto ni repetido).
- **Requisitos del taller:**

| Tipo | Mínimo | Soluciones |
|---|---|---|
| Temas de exposición | 3 | idP, ECM, Calidad de datos, BPMS, CRM, ETL y ESB (7) |
| Tecnológicas fuera de la lista | 2 | Validación biométrica, DOCUMENTO DIGITAL con firma en el PAD, Listas negativas con auditoría, Correo en la nube, Backups 3-2-1 y Estandarización en Linux (6) |
| No tecnológicas | 1 | Capacitación y gestión del cambio de asesores (1) |

- **Unidades:** Duración (F) en semanas; Esfuerzo (G) en meses de trabajo (meses-persona); Costo (H) en COP. Son estimaciones de orden de magnitud: esfuerzo × una tarifa promedio de 12 millones COP por mes, más hardware o licencias cuando aplica.

| # | Solución | Tipo | Cierra | Sem | Meses | M COP |
|---|---|---|---|---|---|---|
| 1 | Backups 3-2-1 | Tecnológica | AT-GAP-16 | 6 | 3 | 80 |
| 2 | Correo en la nube | Tecnológica | AP-GAP-04, 17, 19 · AA-GAP-04, 11 · AINT-GAP-09 · AT-GAP-05 | 6 | 3 | 120 |
| 3 | Listas negativas con auditoría | Tecnológica | AP-GAP-21, 22 · AA-GAP-06, 07 · AINT-GAP-07 · AT-GAP-11 | 10 | 8 | 100 |
| 4 | Capacitación y gestión del cambio | No tecnológica | AP-GAP-23 | 8 | 4 | 60 |
| 5 | CRM como maestro del cliente | CRM | AP-GAP-14, 24 · AINF-GAP-01 | 16 | 12 | 200 |
| 6 | Calidad de datos del cliente | Calidad de datos | AINF-GAP-02, 03, 04 | 12 | 8 | 140 |
| 7 | Validación biométrica de identidad | Tecnológica | AP-GAP-01, 05, 06, 07, 13 · AA-GAP-01, 02, 05 · AINT-GAP-05, 06 · AT-GAP-04 | 16 | 14 | 420 |
| 8 | Proveedor de identidad y SSO | idP | AT-GAP-09, 10, 12, 14 | 10 | 8 | 130 |
| 9 | Bus de servicios empresarial | ESB | AINT-GAP-01, 02, 03, 08, 10, 11 · AT-GAP-06, 08, 15 | 20 | 18 | 300 |
| 10 | Flujo único de venta | BPMS | AP-GAP-15, 16 · AINT-GAP-04 | 16 | 14 | 220 |
| 11 | DOCUMENTO DIGITAL con firma en el PAD | Tecnológica | AP-GAP-02, 03, 08, 09, 10, 11, 18, 25 · AINF-GAP-05 · AA-GAP-03, 08, 09, 10, 12 · AT-GAP-01, 13 | 24 | 24 | 430 |
| 12 | Gestor documental | ECM | AP-GAP-12, 20 · AA-GAP-13 · AT-GAP-02 | 16 | 14 | 320 |
| 13 | ETL y data warehouse de históricos | ETL | AT-GAP-03 | 16 | 14 | 250 |
| 14 | Estandarización de servidores en Linux | Tecnológica | AT-GAP-07 | 16 | 10 | 150 |

**Por qué cada tema de exposición:**
- **idP:** el anexo técnico II, punto 1, pide literalmente SSO.
- **ECM:** es el gestor documental del anexo técnico; reemplaza el archivo físico (O2.2).
- **Calidad de datos:** sin estandarizar y deduplicar no hay cliente maestro, y O1.2 exige bajar 90 % los duplicados.
- **BPMS:** O3.2 pide un flujo único sin doble digitación; ya modelamos el proceso en Bonita en el T6.
- **CRM:** no se compra uno nuevo; el que existe pasa a ser el maestro (O1.1).
- **ETL:** alimenta el data warehouse que pide el anexo técnico II, punto 3, y permite medir O2.3.
- **ESB:** ver la sección "¿Por qué ESB y no API Management?".

---

## Hoja 8.0 · Priorización

**Criterios y pesos (suman 100 %):**

| Criterio | Peso | Escala |
|---|---|---|
| Beneficio | 25 % | 1 bajo · 5 alto |
| Tiempo de implementación (criterio nuevo) | 25 % | 1 más de 5 meses · 5 menos de 2 meses |
| Criticidad | 20 % | 1 baja · 5 alta |
| Riesgo | 15 % | **Invertida:** 1 riesgo alto · 5 riesgo bajo |
| Capacidad | 15 % | 1 baja · 5 alta |

- **Por qué Tiempo de implementación:** la velocidad con la que una solución entrega valor pesa tanto como el beneficio. Una solución rápida empieza a devolver la inversión antes y le muestra resultados tempranos al negocio. Se descartó "Dependencia" porque se cruza con Criticidad.
- Riesgo, Capacidad y Tiempo están planteados para que **un puntaje alto siempre signifique "hacerla primero"**.
- **Corrección a la plantilla:** la fórmula original multiplicaba Criticidad por el peso de Riesgo (y así con las demás). Las filas de criterios ahora están en el mismo orden que las columnas de la tabla. También se quitaron tres números sueltos de la plantilla (J8, K8 y K9).

**Roles (asignados al azar, 2 por estudiante):**

| Estudiante | Roles |
|---|---|
| Erick Peña | Gerente General (CEO) · Director Financiero (CFO) |
| Brian Vargas | Director de TI (CIO) · Gerente de Operaciones |
| Nicoll Durán | Arquitecto Empresarial · Gerente de Riesgo y Fraude |
| Rodrigo Muñoz | Gerente Comercial · Director de la PMO |
| Juan Camilo Prieto | Oficial de Seguridad de la Información (CISO) · Gerente de Servicio al Cliente |

- Debajo de la consolidada hay **una tabla por rol**. Cada rol califica según lo que le importa: el CFO castiga la Capacidad de las soluciones costosas, el CISO sube la Criticidad del idP y de Linux, Riesgo y Fraude sube la de listas negativas, etc.
- **La consolidada promedia los 10 roles** (fórmula PROMEDIO) y el total aplica los pesos. Si un integrante cambia una nota en su tabla, todo se recalcula solo.

**Resultado y fases:**

| Fase | Soluciones (total) |
|---|---|
| Fase-1 (rojo) | 1 Backups 4,38 · 2 Correo 4,34 · 3 Listas negativas 4,29 · 4 Capacitación 4,00 · 5 CRM 3,90 · 6 Calidad de datos 3,88 · 7 Validación biométrica 3,85 |
| Fase-2 (azul) | 8 idP 3,84 · 9 ESB 3,69 · 10 BPMS 3,50 · 11 DOCUMENTO DIGITAL 3,27 · 12 ECM 3,26 |
| Fase-3 (verde) | 13 ETL y DW 2,81 · 14 Linux 2,00 |

- Los **quick wins** salen primero (backups, correo, capacitación): son baratos, rápidos y de bajo riesgo.
- Los 4 que exigen los objetivos al mes 4 (CRM y Calidad de datos para O1.1; Biometría y Listas negativas para O3.1) quedan en la Fase-1.
- **Ojo en la sustentación:** idP (3,84) quedó a 0,01 de Validación biométrica (3,85). El corte entre fases lo define el puntaje, pero si el profesor pregunta, idP podría adelantarse sin romper nada.
- La gráfica de la hoja 10.0 muestra las 14 soluciones con los 5 criterios.

---

## Hoja 9.0 · Roadmap (especificación)

- **3 fases = las 3 columnas de objetivos SMART de la hoja 0.0.** Siguiendo el ejemplo de clase, en la hoja 9.0 los objetivos van **parafraseados en una línea** (acción + meta + plazo) y las metas con **nombre corto** (Unificación de datos, Eliminar procesos manuales, Integración de sistemas). Las capacidades de TI van con el nombre de la solución en mayúsculas, igual que en la hoja 7.0.

| Hoja 0.0 | Hoja 9.0 (parafraseado) |
|---|---|
| O1.1 | Consolidar en el CRM el 100% de los clientes activos al finalizar el mes 4 |
| O2.1 | Identificar y priorizar el 100% de los procesos manuales de la venta al finalizar el mes 3 |
| O3.1 | Validar en línea el 100% de las identidades (RNEC y listas negativas) al finalizar el mes 4 |
| O1.2 | Reducir en un 90% los clientes duplicados entre aplicaciones al finalizar el mes 10 |
| O2.2 | Automatizar el 100% de la captura biométrica, la firma y los documentos al finalizar el mes 10 |
| O3.2 | Integrar RequestManager, Validación Crediticia y CRM en un flujo único al finalizar el mes 10 |
| O1.3 | Lograr que el 100% de los asesores consulte una vista única del cliente al finalizar el mes 14 |
| O2.3 | Reducir en un 60% el tiempo promedio de la venta al finalizar el mes 14 |
| O3.3 | Eliminar el 100% de las interfaces manuales entre sistemas al finalizar el mes 14 |

| Fase | Duración | Costo | Objetivos que cumple |
|---|---|---|---|
| Fase-1 | 16 semanas (meses 1 a 4) | 1.120 M COP | O1.1 · O2.1 · O3.1 |
| Fase-2 | 24 semanas (meses 5 a 10) | 1.400 M COP | O1.2 · O2.2 · O3.2 |
| Fase-3 | 16 semanas (meses 11 a 14) | 400 M COP | O1.3 · O2.3 · O3.3 |

- **Total: 56 semanas ≈ 14 meses y 2.920 M COP.** El costo de cada fase es una fórmula que suma la hoja 7.0. Dentro de una fase las soluciones arrancan juntas y la fase dura lo que dura su solución más larga.
- **O2.1** (identificar los procesos manuales) se apoya en este mismo levantamiento: la hoja 6.0 es la línea base.
- **O2.3** (60 % menos tiempo de venta) se mide con el data warehouse (#13).
- La columna de **capacidades transitorias se dejó vacía** por decisión del grupo.

### Roadmap visual (PPTX)
`Taller_8/T8_ROADMAP_…pptx` tiene 2 diapositivas editables:
1. **Roadmap escalonado** (como el del ejemplo de clase): una flecha por fase con sus soluciones y semanas, y un recuadro amarillo con las metas logradas al cierre de cada fase.
2. **Cronograma por semanas:** una barra por solución y rombos en los meses 4, 10 y 14 con los objetivos que se cumplen.

Todo son formas editables: para iterar, se cambia el texto o se arrastra la barra.

## Riesgos y pendientes

- **Copia del documento de identidad:** la lee el escáner 3 luces desde ID-TRUE, pero ninguna integración del anexo la lleva al gestor documental. Falta definir la vía; la opción coherente con lo anterior es que llegue como adjunto de DOCUMENTO DIGITAL.
- **Envío por correo:** dependía de corregir el servidor de correo (anexo técnico II, punto 4). Resuelto con AT-GAP-05 y la solución #2 (Correo en la nube), que queda en la Fase-1, antes de que DOCUMENTO DIGITAL empiece a enviar contratos.
- **Estrategias de la hoja 0.0:** ninguna estrategia nombra los puntos del anexo técnico II (SSO, backups, data warehouse, sistema operativo). Se asociaron a la estrategia más cercana (p. ej. SSO y cifrado → Meta 3 · SN-1, capa de integración que ahora es el ESB). Si el profesor lo cuestiona, la salida es agregar una estrategia de plataforma tecnológica en la hoja 0.0.
- **Costos:** son estimaciones de orden de magnitud; el número de puntos de venta no está en el caso y define el costo del hardware (#7 captores y escáneres, #11 PAD).
- **Interpretación del AS-IS:** "consulta la base de datos de la entidad" se tomó como la base propia de ID-TRUE. Por eso la integración con la RNEC queda como NEW.
