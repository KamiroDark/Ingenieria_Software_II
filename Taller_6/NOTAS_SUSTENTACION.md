# T6 · Notas para la sustentación (Grupo 2)

Decisiones tomadas al llenar el T6 (hojas 1.0, 2.0, 2.1 y 6.0) y al modelar los BPMN en Bonita. Fuentes: TELCO_KONRAD_AS-IS, TO-BE, ANEXO-TECNICO y ANEXO-TECNICO_II.

## Atributos del canónico que no están en el anexo (hoja 2.1)
Se mantienen a propósito:

| Atributo | Por qué existe | Fuente |
|---|---|---|
| `plantillaHuella` (BLOB) | El TO-BE exige validar la identidad con el **captor de huella electrónica** contra la **Registraduría**. Esa huella es un dato del cliente que hoy ningún sistema guarda; si no está en el canónico, cada sistema la manejaría por su cuenta y se repite el problema de duplicidad. | TO-BE: "Validación mediante captor de huella electrónica" y "Validación de la huella directamente con la Registraduría Nacional del Estado Civil" |
| `rutaFirma` (VARCHAR 255) | El TO-BE captura la **firma electrónica en el PAD** durante el enrolamiento, y el e-contrato se firma con ella. Debe quedar asociada al cliente en un solo lugar (el CRM, dueño del dato). | TO-BE: "Captura de la firma electrónica mediante PAD de firma" |
| `idCliente` (BIGINT) | Llave técnica del modelo canónico. Los sistemas identifican al cliente de formas distintas (INT, VARCHAR(30), tipo + número), así que se necesita una llave única que asigna el CRM como maestro. | Anexo: "El CRM es la aplicación en donde los clientes se crean y es el punto centralizado" |

Argumento corto: el canónico no solo unifica lo que existe; también incorpora los datos nuevos que el TO-BE introduce (biometría y firma), para que nazcan unificados.

## CRM en el AS-IS (hoja 2.0, D-GAP-01)
- El CRM **sí existe** en el AS-IS: el anexo lo presenta entre las entidades "que influyen en los procesos AS-IS", dice que ahí "se crean" los clientes, y el TO-BE habla de "los datos existentes en el CRM".
- **No participa en el proceso de venta AS-IS** (por eso no aparece en el BPMN ni en el Canvas AS-IS). Esa desconexión es la brecha: D-GAP-01 (MODIFY, el CRM pasa a ser maestro del cliente).

## Mapa CRUD (hoja 2.0)
"Cliente" es la **entidad de datos**, no la persona. Cada celda indica qué operaciones hace la aplicación sobre ese registro. AS-IS: ID-TRUE CR, Validación Crediticia CRU, RequestManager CRU, CRM CRU → cuatro sistemas crean al mismo cliente (la duplicidad que describe el anexo).

## Representación canónica (hoja 2.1)
Es un **modelo/contrato de datos** (un artefacto de diseño), no un sistema. Define nombres, tipos, formatos y catálogos comunes del Cliente. Se implementa en las integraciones (WS ID-TRUE→CRM, WS de RequestManager, archivo plano de DOCUMENTO DIGITAL): cada sistema traduce desde y hacia el canónico. Ejemplo: tipo de documento "CEDULA CIUDADANIA" (ID-TRUE) / "CC" (CRM) → canónico `tipoDocumento` = CC.

## RequestManager
Gestor de **solicitudes de venta** (el expediente de cada venta): crea la solicitud, guarda su propia copia del cliente, adjunta los documentos escaneados y, cuando la solicitud se aprueba, expone un WS que el gestor documental consume. **No es un ERP** (no maneja finanzas, inventario, facturación ni RR. HH.).

## Prefijos de GAP
- **AP-GAP (hoja 1.0):** brechas de **proceso de negocio** (actividad AS-IS vs TO-BE). AP-GAP-01 a 25.
- **D-GAP (hoja 2.0):** brechas de **datos/información** (entidad × aplicación). D-GAP-01 a 05; el prefijo "D" lo pide la instrucción de la hoja.
- Ambas se consolidan en el inventario 6.0.
