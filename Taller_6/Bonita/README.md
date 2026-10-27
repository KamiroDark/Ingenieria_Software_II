# Taller 6 · Diagramas BPMN en Bonita — Telco Konrad

Diagramas BPMN del macroproceso de venta de Telecomunicaciones de la Konrad Lorenz, construidos con base en los documentos `TELCO_KONRAD_AS-IS.pdf` y `TELCO_KONRAD_TO-BE.pdf` del Proyecto #1.

| Archivo | Contenido |
|---|---|
| `Telco Konrad AS-IS-1.0.proc` | Diagrama Bonita del estado actual (AS-IS) |
| `Telco Konrad TO-BE-1.0.proc` | Diagrama Bonita del estado objetivo (TO-BE) |
| `Telco Konrad AS-IS-1.0.png` / `Telco Konrad TO-BE-1.0.png` | Imágenes exportadas desde Bonita Studio para consulta rápida |

Hechos y probados en **Bonita Studio Community 2025.2** (runtime 10.4.0).

## Cómo abrirlos en Bonita Studio

1. Abre Bonita Studio y crea un proyecto (*File → New project…*, por ejemplo `Telco Konrad`) o usa uno existente.
2. Copia los dos `.proc` en la carpeta de diagramas del proyecto (la ruta es `<workspace>/<id-del-proyecto>/app/diagrams/`). En macOS el workspace está en `BonitaStudioCommunity-2025.2-u0.app/Contents/Eclipse/workspace/`.
3. En el *Project explorer* selecciona el proyecto y presiona **F5** (refrescar). Los diagramas aparecen en *Process diagrams*.

## AS-IS

Carriles: Cliente · Asesor comercial · Sistemas de información (ID-TRUE, VALIDACIÓN CREDITICIA, RequestManager) · Mensajería / Courier · Archivo central (Bogotá).

1. **Validación de identidad**: el asesor pide el documento, consulta ID-TRUE por número de identificación y compara visualmente datos y foto.
2. **Enrolamiento**: si el cliente no está en ID-TRUE, el asesor captura datos biográficos, adicionales y foto.
3. **Recepción y legalización de documentos**: autorización firmada de centrales de riesgo, preaprobación en VALIDACIÓN CREDITICIA, registro en RequestManager, escaneo de soportes y recolección a domicilio por mensajería si faltan documentos.
4. **Generación de e-contrato**: contrato físico con huella y firma, escaneado y adjuntado en RequestManager.
5. **Envío del contrato**: por correo electrónico certificado o Courier; los documentos físicos se empaquetan y se envían al archivo central de Bogotá.

## TO-BE

Carriles: Cliente · Asesor comercial · Back de validación (dactiloscopistas y documentólogos) · Plataforma integrada (ID-TRUE, CRM, VALIDACIÓN CREDITICIA, RequestManager, DOCUMENTO DIGITAL).

1. **Validación de identidad**: captor de huella validado contra la Registraduría (WS RNEC), escáner 3 luces, listas negativas y back de validación para los casos que el escáner no resuelve.
2. **Enrolamiento**: OCR del documento (RMI desde ID-TRUE) y registro consistente en el CRM, que es el dueño del dato del cliente.
3. **Recepción y legalización de documentos**: firma en PAD, formularios web en DOCUMENTO DIGITAL y carga remota de faltantes por acceso seguro, personal e intransferible (sin mensajería).
4. **Generación de e-contrato**: se mantiene, firmado con huella y PAD.
5. **Envío del contrato**: solo por correo electrónico, con opción de imprimir; DOCUMENTO DIGITAL genera el archivo plano que el gestor documental procesa en batch cada 24 h.
