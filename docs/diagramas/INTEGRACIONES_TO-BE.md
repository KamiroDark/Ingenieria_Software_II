# Integraciones TO-BE · Telco Konrad

Cómo se comunican las aplicaciones, con qué método y qué dato viaja en cada llamada. Complementa las hojas 4.0 (integración), 5.0 (tecnología) y 7.0 (soluciones) de la matriz EA-XPress del Taller 8.

Cada diagrama aparece dos veces: como **código Mermaid** (GitHub y VS Code lo dibujan, y se edita como texto) y como **imagen PNG** en esta misma carpeta, por si el visor no soporta Mermaid.

---

## 1. Cómo leer los diagramas

| Elemento | Significado |
|---|---|
| **I1 … I12** | Número de integración; está detallada en la tabla de la sección 4 |
| Línea gruesa (`==>`) | Web Service que **pasa por el ESB** (WSO2 Micro Integrator): el ESB traduce al modelo canónico, enruta y cifra con TLS |
| Línea delgada (`-->`) | Conexión **directa**, sin ESB (RMI con el escáner, SMTP con el correo, consulta a centrales de riesgo, dispositivos) |
| Línea punteada (`-.->`) | Autenticación con el idP (login SSO del asesor u OTP del cliente) |
| Flecha `A → B` | **A consume** un servicio que **expone B** (igual que en la hoja 4.0: fila consume a columna) |
| En los diagramas de secuencia: flecha continua / punteada | Petición / respuesta |
| `#n` | Número de la solución en la hoja 7.0 (ABB-ID) |

Colores del mapa TO-BE: azul = aplicaciones, verde = orquestación y seguridad, amarillo = dispositivos del punto de venta, rojo = sistemas externos.

---

## 2. AS-IS: cómo es hoy

![AS-IS](integraciones_as-is.png)

```mermaid
flowchart LR
  ASE(["Asesor en punto de venta"])
  subgraph APPS["Aplicaciones AS-IS (cada una con su propia BD y su propia copia del Cliente)"]
    IDT["ID-TRUE<br/><small>Consultar cliente · Enrolar cliente</small>"]
    VC["VALIDACIÓN CREDITICIA<br/><small>Consultar / crear / actualizar calificación</small>"]
    RM["RequestManager<br/><small>Crear solicitud · Crear / actualizar cliente<br/>Adjuntar documentos escaneados</small>"]
    CRM["CRM<br/><small>Consultar / crear / actualizar cliente</small>"]
  end
  CEN[("Centrales de riesgo")]
  PAPEL[["Papel: consentimiento, soportes, contrato con huella y firma"]]
  ESC["Escáner convencional"]
  MSJ["Mensajería / Courier"]
  ARCH[("Archivo físico<br/>sede Bogotá")]
  ASE -- "digita y compara la foto a ojo" --> IDT
  ASE -- "digita la solicitud" --> RM
  ASE -- "consulta la calificación" --> VC
  IDT -- "Consultar cliente (modelo propio)" --> CRM
  VC -- "Consultar cliente (modelo propio)" --> CRM
  RM -- "Consultar cliente (modelo propio)" --> CRM
  VC -- "Consultar historia crediticia" --> CEN
  ASE --> PAPEL --> ESC -- "adjunta a mano" --> RM
  PAPEL -. "documentos faltantes / contrato físico" .-> MSJ
  PAPEL -. "empaque de documentos" .-> ARCH
```

**Problemas que se ven en el diagrama:**
- **Tres aplicaciones consultan el cliente en el CRM, cada una con su propio modelo de datos.** El cliente queda replicado en cuatro bases (AINF-GAP-01 a 04).
- **El papel une los procesos:** consentimiento y contrato firmados a mano, escaneados y adjuntados uno por uno, mensajería para los faltantes y archivo físico en Bogotá.
- **La identidad se valida comparando la foto a ojo:** de ahí vienen los fraudes que reporta el AS-IS.

---

## 3. TO-BE: mapa general

![TO-BE](integraciones_to-be.png)

```mermaid
flowchart LR
  ASE(["Asesor<br/><small>punto de venta</small>"])
  CLI(["Cliente remoto"])
  IDP["idP · Keycloak<br/><small>SSO, roles y OTP (#8)</small>"]
  BPMS{{"BPMS · Bonita<br/><small>orquesta el flujo único de venta (#10)</small>"}}
  IDT["ID-TRUE"]
  DD["DOCUMENTO DIGITAL"]
  RM["RequestManager"]
  VC["VALIDACIÓN CREDITICIA"]
  GD["Gestor documental<br/><small>ECM · Alfresco</small>"]
  CRM[("CRM<br/><small>maestro del cliente</small>")]
  LN[("Listas negativas")]
  RNEC[("RNEC")]
  CEN[("Centrales de riesgo")]
  MAIL[("Correo · Microsoft 365")]
  ESC["Escáner 3 luces"]
  HUE["Captor de huella"]
  PAD["PAD de firma"]

  ASE -. "login" .-> IDP
  CLI -. "OTP" .-> IDP
  ASE --> BPMS
  CLI -- "adjunta faltantes" --> DD
  BPMS --> IDT
  BPMS --> RM
  BPMS --> DD

  IDT -- "I1 Obtener datos OCR (RMI)" --> ESC
  IDT -- "captura" --> HUE
  DD -- "captura firma" --> PAD

  IDT == "I2 Validar identidad y huella" ==> RNEC
  IDT == "I3 Consultar listas · Registrar caso" ==> LN
  IDT == "I4 Consultar · Crear cliente" ==> CRM
  RM == "I5 Consultar · Actualizar cliente" ==> CRM
  RM == "I6 Consultar · crear · actualizar calificación" ==> VC
  VC == "I7 Consultar cliente" ==> CRM
  VC -- "I8 Consultar historia crediticia" --> CEN
  DD == "I9 Consultar cliente" ==> CRM
  DD -- "I10 Enviar contrato y enlaces (SMTP)" --> MAIL
  GD == "I11 Obtener metadatos (WS)" ==> RM
  GD == "I12 Leer archivo plano (batch 24 h)" ==> DD

  classDef ext fill:#FDECEA,stroke:#B03A3A,color:#5A1A1A
  classDef dev fill:#FFF4D6,stroke:#BF9000,color:#5C4400
  classDef sec fill:#E6F1E1,stroke:#4E8A3A,color:#22401A
  classDef app fill:#E3EEF8,stroke:#2F6EA8,color:#12355B
  class RNEC,CEN,MAIL ext
  class ESC,HUE,PAD dev
  class IDP,BPMS sec
  class IDT,DD,RM,VC,GD,CRM,LN app
```

**Ideas clave:**
1. **El CRM es el centro del dato:** cuatro aplicaciones leen el cliente de un único servicio (I4, I5, I7, I9) y solo ID-TRUE (crear) y RequestManager (actualizar) lo modifican.
2. **El BPMS no transporta datos:** ordena los pasos (tareas) y llama a las aplicaciones. El ESB es quien lleva cada dato de una aplicación a otra.
3. **El gestor documental recibe por dos vías que no se pisan:** metadatos desde RequestManager (I11) y documentos desde DOCUMENTO DIGITAL (I12).
4. **Keycloak autentica a todos:** asesores con SSO y clientes remotos con OTP.

---

## 4. Tabla de integraciones

| # | Consume → Expone | Método (inventario del anexo) | Medio | Viaja de ida | Viaja de vuelta | GAP | Solución |
|---|---|---|---|---|---|---|---|
| I1 | ID-TRUE → Escáner 3 luces | Obtener datos OCR | RMI, directo | Orden de lectura del documento | Tipo y número de documento, nombres, apellidos, fecha de nacimiento y resultado de autenticidad | AINT-GAP-06 | #7 |
| I2 | ID-TRUE → RNEC | Validar identidad y huella | WS HTTPS vía ESB | Tipo y número de documento + imagen de la huella | Coincide / no coincide | AINT-GAP-05 | #7 |
| I3 | ID-TRUE → Listas negativas | Consultar listas negativas · Registrar caso | WS vía ESB | Tipo y número (y el motivo, al registrar) | Con alerta / sin alerta | AINT-GAP-07 | #3 |
| I4 | ID-TRUE → CRM | Consultar cliente · Crear cliente | WS vía ESB (canónico) | Tipo y número; al crear: datos OCR, foto y huella | Cliente canónico o "no existe"; al crear: **idCliente** | AINT-GAP-01 | #9 |
| I5 | RequestManager → CRM | Consultar cliente · Actualizar cliente | WS vía ESB (canónico) | idCliente; al actualizar: dirección, teléfono o email | Cliente canónico / confirmación | AINT-GAP-03 | #9 |
| I6 | RequestManager → Validación Crediticia | Consultar / crear / actualizar calificación | WS vía ESB | idCliente | PRE_APROBADO / RECHAZADO | AINT-GAP-04 | #10 |
| I7 | Validación Crediticia → CRM | Consultar cliente | WS vía ESB (canónico) | idCliente | Tipo y número de documento | AINT-GAP-02 | #9 |
| I8 | Validación Crediticia → Centrales de riesgo | Consultar historia crediticia | Directo (se mantiene del AS-IS) | Tipo y número | Historia crediticia | KEEP | — |
| I9 | DOCUMENTO DIGITAL → CRM | Consultar cliente | WS vía ESB (canónico) | idCliente | Datos para formularios y e-contrato | AINT-GAP-08 | #9 |
| I10 | DOCUMENTO DIGITAL → Correo (Microsoft 365) | Enviar contrato y anexos · Enviar enlace de carga | SMTP, directo | Email del cliente + PDF del contrato, o enlace de un solo uso | Confirmación de envío | AINT-GAP-09 | #2 |
| I11 | Gestor documental → RequestManager | Obtener metadatos del expediente aprobado | WS vía ESB, cada 24 h | Fecha de corte | Número de solicitud, estado, idCliente y producto (**sin archivos**) | AINT-GAP-10 | #9 |
| I12 | Gestor documental → DOCUMENTO DIGITAL | Leer archivo plano | Batch 24 h (tarea programada del ESB) | — | Documentos firmados con idSolicitud, tipo documental y versión | AINT-GAP-11 | #9 |

**Fuera de la tabla (no son integraciones entre aplicaciones):**
- ID-TRUE ↔ captor de huella y DOCUMENTO DIGITAL ↔ PAD de firma: son dispositivos del punto de venta (#7 y #11).
- BPMS → ID-TRUE, RequestManager y DOCUMENTO DIGITAL: tareas del flujo único (#10).
- Asesor y cliente → Keycloak: autenticación (#8).

---

## 5. Recorrido de una venta, paso a paso

### 5.1 Validación de identidad y enrolamiento

![Secuencia 1](secuencia_1_identidad.png)

```mermaid
sequenceDiagram
  autonumber
  actor A as Asesor
  participant B as BPMS (Bonita)
  participant ID as ID-TRUE
  participant DEV as Escáner 3 luces + captor de huella
  participant ESB as ESB (WSO2)
  participant R as RNEC
  participant L as Listas negativas
  participant BV as Back de validación
  participant CRM as CRM
  A->>B: Inicia la venta (ya autenticado con SSO en Keycloak)
  B->>ID: Tarea "Validar identidad"
  ID->>DEV: I1 Obtener datos OCR (RMI)
  DEV-->>ID: tipo y número de documento, nombres, apellidos, fecha de nacimiento, autenticidad
  ID->>DEV: Capturar huella
  DEV-->>ID: imagen de la huella
  ID->>ESB: I2 Validar identidad y huella (tipo, número, huella)
  ESB->>R: Web Service sobre HTTPS
  R-->>ESB: coincide / no coincide
  ESB-->>ID: resultado
  alt No coincide o el documento es dudoso
    ID->>BV: Caso a revisión (dactiloscopistas y documentólogos)
    BV-->>ID: confirma / rechaza
    opt Rechaza
      ID->>ESB: I3 Registrar caso (tipo, número, motivo)
      ESB->>L: Web Service
      ID-->>B: Venta detenida por posible fraude
    end
  end
  ID->>ESB: I3 Consultar listas negativas (tipo, número)
  ESB->>L: Web Service
  L-->>ESB: con alerta / sin alerta
  ESB-->>ID: resultado (si hay alerta, la venta se detiene)
  ID->>ESB: I4 Consultar cliente (tipo, número)
  ESB->>CRM: Web Service con el modelo canónico
  CRM-->>ESB: Cliente canónico o "no existe"
  ESB-->>ID: Cliente traducido al formato de ID-TRUE
  alt El cliente no existe (enrolamiento)
    ID->>ESB: I4 Crear cliente (datos OCR + foto + huella)
    Note over ESB,CRM: El ESB traduce: "CEDULA CIUDADANIA" → CC,<br/>nombres → primerNombre / segundoNombre,<br/>fecha → yyyy-MM-dd, teléfono → texto
    ESB->>CRM: Crear cliente (canónico)
    CRM-->>ESB: idCliente (llave única)
    ESB-->>ID: idCliente
  end
  ID-->>B: Identidad validada + idCliente
```

### 5.2 Autorización de centrales, solicitud y calificación

![Secuencia 2](secuencia_2_solicitud.png)

```mermaid
sequenceDiagram
  autonumber
  actor A as Asesor
  participant B as BPMS (Bonita)
  participant DD as DOCUMENTO DIGITAL
  participant PAD as PAD de firma
  participant RM as RequestManager
  participant ESB as ESB (WSO2)
  participant CRM as CRM
  participant VC as VALIDACIÓN CREDITICIA
  participant C as Centrales de riesgo
  B->>DD: Tarea "Autorización de consulta a centrales" (idCliente)
  DD->>ESB: I9 Consultar cliente (idCliente)
  ESB->>CRM: Web Service
  CRM-->>ESB: Cliente canónico
  ESB-->>DD: datos para el formulario
  DD->>PAD: Capturar firma del cliente
  PAD-->>DD: firma electrónica
  Note over DD,RM: Sella el PDF con hash + estampa de tiempo (no repudio)
  B->>RM: Crear solicitud (idCliente, producto)
  RM->>ESB: I5 Consultar cliente (idCliente)
  ESB->>CRM: Web Service
  CRM-->>ESB: Cliente canónico
  ESB-->>RM: Cliente en formato RequestManager
  opt El cliente cambió algún dato (dirección, teléfono, email)
    A->>RM: Corrige el dato en la solicitud
    RM->>ESB: I5 Actualizar cliente
    ESB->>CRM: Web Service
    Note over ESB,CRM: El CRM es el maestro: el cambio queda<br/>en un solo lugar y todos lo leen de ahí
  end
  RM->>ESB: I6 Consultar calificación (idCliente)
  ESB->>VC: Web Service
  VC->>ESB: I7 Consultar cliente (idCliente)
  ESB->>CRM: Web Service
  CRM-->>ESB: tipo y número de documento
  ESB-->>VC: tipo y número
  VC->>C: I8 Consultar historia crediticia (tipo, número)
  C-->>VC: historia crediticia
  Note over ESB,C: Crea o actualiza la CalificacionCrediticia<br/>(idCliente, resultado, fechaConsulta)
  VC-->>ESB: PRE_APROBADO / RECHAZADO
  ESB-->>RM: calificación
  RM-->>B: Solicitud con calificación (sin digitación del asesor)
  alt RECHAZADO
    B-->>A: Fin de la venta
  end
```

### 5.3 Documentos, e-contrato, envío y archivo

![Secuencia 3](secuencia_3_documentos.png)

```mermaid
sequenceDiagram
  autonumber
  actor A as Asesor
  actor CL as Cliente
  participant B as BPMS (Bonita)
  participant DD as DOCUMENTO DIGITAL
  participant K as idP (Keycloak)
  participant PAD as PAD de firma
  participant M as Correo (Microsoft 365)
  participant RM as RequestManager
  participant ESB as ESB (WSO2)
  participant GD as Gestor documental (Alfresco)
  B->>DD: Tarea "Cargar soportes" (idSolicitud)
  A->>DD: Adjunta los soportes en el formulario web
  Note over DD,PAD: Valida que estén completos antes de seguir
  opt Faltan documentos
    DD->>M: I10 Enviar enlace de un solo uso (SMTP)
    M-->>CL: Correo con el enlace
    CL->>K: Abre el enlace y digita el código OTP
    K-->>DD: Cliente autenticado
    CL->>DD: Adjunta los documentos faltantes
  end
  B->>DD: Tarea "Generar e-contrato"
  Note over DD,PAD: Llena la plantilla con los datos del CRM (I9)<br/>y genera el PDF/A
  DD->>PAD: Capturar firma del cliente
  PAD-->>DD: firma electrónica
  Note over DD,PAD: Sella el e-contrato (hash + estampa de tiempo)
  DD->>M: I10 Enviar contrato y anexos (SMTP)
  M-->>CL: Correo con el contrato
  opt El cliente pide copia en papel
    A->>DD: Imprimir documentos
  end
  B->>RM: Aprobar solicitud
  Note over ESB,GD: Cada 24 horas (tarea programada del ESB)
  GD->>ESB: I11 Obtener metadatos de expedientes aprobados
  ESB->>RM: Web Service
  RM-->>ESB: número de solicitud, estado, idCliente, producto
  ESB-->>GD: metadatos (sin archivos)
  ESB->>DD: I12 Recoger el archivo plano del día
  DD-->>ESB: documentos firmados (idSolicitud + tipo documental + versión)
  ESB->>GD: Entrega el archivo plano
  Note over RM,GD: Une metadatos y documentos por idSolicitud.<br/>Carga idempotente: si un documento llega dos veces se reemplaza.<br/>Archiva con reglas de retención (reemplaza el archivo físico)
```

---

## 6. Qué traduce el ESB: el Cliente en cada sistema vs. el canónico

El ESB recibe el formato de cada aplicación y lo convierte al modelo canónico de la hoja 2.1 antes de llegar al CRM (y al revés en la respuesta).

| Canónico (hoja 2.1) | ID-TRUE | CRM (antes) | RequestManager | Regla de traducción |
|---|---|---|---|---|
| idCliente (BIGINT) | — | — | — | Lo asigna el CRM al crear; todos lo usan como llave |
| tipoDocumento (CC, TI, CE, PT) | TipoDocumento "CEDULA CIUDADANIA"… | Tipo_Documento CC… | — (no lo guarda) | "CEDULA CIUDADANIA" → CC, "TARJETA IDENTIDAD" → TI, "CEDULA EXTRANJERIA" → CE, "PASAPORTE" → PT |
| numeroDocumento (texto) | NumeroIdentificacion INT | Numero_Identificacion INT | Identificacion VARCHAR(30) | Número → texto, sin puntos ni espacios |
| primerNombre / segundoNombre | Nombres (un solo campo) | Primer_Nombre / Segundo_Nombre | Nombre1 / Nombre2 | ID-TRUE: se parte por el primer espacio |
| primerApellido / segundoApellido | Apellidos (un solo campo) | Primer_Apellido / Segundo_Apellido | Apellido1 / Apellido2 | Igual que los nombres |
| fechaNacimiento (yyyy-MM-dd) | FechaNacimiento DATE(10) | FechaNacimiento dd/MM/yy | — | dd/MM/yy → yyyy-MM-dd |
| telefono (texto con indicativo) | Telefono INT | Telefono VARCHAR | — | Número → texto, agrega +57 |
| estadoCivil (1 a 6) | Texto "SOLTERO"… | 1 a 6 | — | Texto → código del catálogo |
| nivelEscolaridad (1 a 4) | Texto "PRIMARIA"… | 1 a 4 | — | Texto → código del catálogo |
| email | — | — | Email | Pasa igual; es el único canal de envío del contrato |
| rutaFoto / plantillaHuella / rutaFirma | Foto / huella capturada | Foto | — | Nuevos en el canónico; los guarda el CRM |

**Calificación (Validación Crediticia):** antes guardaba tipo + número + BOOLEAN. En el canónico guarda idCliente + resultado (PRE_APROBADO / RECHAZADO) + fechaConsulta (AINF-GAP-03).

---

## 7. Cómo editar

- **Diagramas:** se edita el bloque `mermaid` de este archivo. Para regenerar las imágenes: `npx @mermaid-js/mermaid-cli -i archivo.mmd -o archivo.png` (copiando el bloque a un `.mmd`), o se exporta desde [mermaid.live](https://mermaid.live).
- Si cambia una integración, hay que actualizar también la hoja 4.0 y la tabla de la sección 4.
