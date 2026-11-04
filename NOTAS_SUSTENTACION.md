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

Cada prefijo son las iniciales de su sección, en mayúsculas:

| Prefijo | Hoja | Brechas de |
|---|---|---|
| AP-GAP | 1.0 | Procesos de negocio |
| AINF-GAP | 2.0 | Información / datos (antes D-GAP) |
| AA-GAP | 3.0 | Aplicaciones |
| AINT-GAP | 4.0 | Integración |
| AT-GAP | 5.0 | Tecnología |

Las instrucciones originales de la plantilla piden los prefijos "D", "App" e "INT". Se dejaron sin modificar, pero los IDs siguen la nomenclatura del grupo.

---

## Hoja 0.0 · Intención estratégica

- **Meta 1 · SN-1:** "Consolidar en el CRM **existente**…". Antes decía "hacia un nuevo CRM", lo que contradecía AINF-GAP-01: el CRM ya existe y pasa a ser el maestro del cliente.

---

## Hoja 2.0 · Información (AINF-GAP)

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

## Hoja 3.0 · Aplicaciones (AA-GAP)

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

## Hoja 4.0 · Integración (AINT-GAP)

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
