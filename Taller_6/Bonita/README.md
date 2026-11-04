# Taller 6 · Diagramas BPMN en Bonita — Telco Konrad

Diagramas BPMN del macroproceso de venta de Telecomunicaciones de la Konrad Lorenz, construidos con base en `TELCO_KONRAD_AS-IS.pdf`, `TELCO_KONRAD_TO-BE.pdf` y el anexo técnico del Proyecto #1.

Hechos y probados en **Bonita Studio Community 2025.2** (runtime 10.4.0).

## Contenido

```
Taller_6/Bonita/
├── Telco-Konrad.bos                     # Proyecto exportado desde Bonita Studio (lo que se importa)
└── diagramas/
    ├── Telco Konrad AS-IS-1.0.proc      # Fuente de cada diagrama (idéntica a la que trae el .bos)
    ├── Telco Konrad AS-IS-1.0.png       # Imagen exportada desde Bonita
    ├── Telco Konrad TO-BE-1.0.proc
    └── Telco Konrad TO-BE-1.0.png
```

El `.bos` contiene todo el proyecto: los dos diagramas, la organización (`ACME.xml`), los entornos y los `pom.xml`. Los widgets del UI Designer, la configuración de Eclipse, `h2_database/` y `target/` no se versionan porque Bonita Studio los genera al importar o ejecutar el proyecto.

## Cómo abrirlo en Bonita Studio

**Opción A — importar el `.bos` (recomendada)**
1. *File → Import project*.
2. *Browse…* → selecciona `Taller_6/Bonita/Telco-Konrad.bos` → *Import*.
3. Se crea el proyecto **Telco Konrad** con los dos diagramas en *Process diagrams*.

**Opción B — copiar solo los diagramas**
1. Crea un proyecto en Bonita (*File → New project…*) o abre uno existente.
2. Copia los `.proc` de `diagramas/` en la carpeta `app/diagrams/` de ese proyecto dentro del workspace de Bonita (en macOS: `BonitaStudioCommunity-2025.2-u0.app/Contents/Eclipse/workspace/<proyecto>/app/diagrams/`).
3. Selecciona el proyecto en el *Project explorer* y presiona **F5**.

## AS-IS

Carriles: Cliente · Asesor comercial · Sistemas de información (ID-TRUE, VALIDACIÓN CREDITICIA, RequestManager) · Mensajería / Courier · Archivo central (Bogotá).

1. **Validación de identidad**: el asesor pide el documento, consulta ID-TRUE por número de identificación y compara visualmente datos y foto.
2. **Enrolamiento**: si el cliente no está en ID-TRUE, el asesor captura datos biográficos, adicionales y foto.
3. **Recepción y legalización de documentos**: autorización firmada de centrales de riesgo, preaprobación en VALIDACIÓN CREDITICIA, registro en RequestManager, escaneo de soportes y recolección a domicilio por mensajería si faltan documentos.
4. **Generación de e-contrato**: contrato físico con huella y firma, escaneado y adjuntado en RequestManager.
5. **Envío del contrato**: por correo electrónico certificado o Courier; los documentos físicos se empaquetan y se envían al archivo central de Bogotá.

## TO-BE

Carriles: Cliente · Asesor comercial · Back de validación (dactiloscopistas y documentólogos) · Plataforma integrada (ID-TRUE, CRM, VALIDACIÓN CREDITICIA, RequestManager, DOCUMENTO DIGITAL).

1. **Validación de identidad**: captor de huella validado contra la Registraduría (WS RNEC), escáner 3 luces, listas negativas y back de validación para lo que el escáner no resuelve.
2. **Enrolamiento**: OCR del documento (RMI desde ID-TRUE) y registro consistente en el CRM, dueño del dato del cliente.
3. **Recepción y legalización de documentos**: firma en PAD, formularios web en DOCUMENTO DIGITAL y carga remota de faltantes por acceso seguro, personal e intransferible (sin mensajería).
4. **Generación de e-contrato**: se mantiene, firmado con huella y PAD.
5. **Envío del contrato**: solo por correo electrónico, con opción de imprimir; DOCUMENTO DIGITAL genera el archivo plano que el gestor documental procesa en batch cada 24 h.
