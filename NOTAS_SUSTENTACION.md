# Notas para la sustentación · Grupo 2

Decisiones del Proyecto #1 (Telco Konrad, matriz EA-XPress) y cómo defenderlas. Es un documento vivo: se actualiza con cada taller.

Fuentes: `docs/telco-konrad/` (AS-IS, TO-BE, Anexo técnico y Anexo técnico II) y la plantilla `Plantilla EA/EA-XPress.xls`.

| Taller | Hojas |
|---|---|
| T6 | 0.0, 1.0, 2.0, 2.1 |
| T7 | 3.0, 4.0 |
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

## Riesgos y pendientes

- **Copia del documento de identidad:** la lee el escáner 3 luces desde ID-TRUE, pero ninguna integración del anexo la lleva al gestor documental. Falta definir la vía; la opción coherente con lo anterior es que llegue como adjunto de DOCUMENTO DIGITAL.
- **Envío por correo:** depende de corregir el servidor de correo (anexo técnico II, punto 4). Va en la hoja 5.0.
- **Interpretación del AS-IS:** "consulta la base de datos de la entidad" se tomó como la base propia de ID-TRUE. Por eso la integración con la RNEC queda como NEW.
