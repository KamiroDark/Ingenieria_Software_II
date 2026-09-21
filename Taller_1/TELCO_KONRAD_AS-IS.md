# Fundación Universitaria Konrad Lorenz
## Programa de Ingeniería de Sistemas
### Ingeniería de Software II
### Proyecto #1: Proceso de arquitectura empresarial Telco Konrad

**Profesor:** Carlos Andrés López

---

## CONTEXTO

Telecomunicaciones de la Konrad Lorenz es una empresa líder a nivel nacional en ofrecer productos y prestar servicios en el sector de las Telcos como telefonía celular y televisión por cable además de otros servicios adicionales.

Para la compañía es muy importante ir mejorando continuamente y sus directivas en decisión estratégica han tomado la decisión de llevar a cabo un proceso de arquitectura empresarial, en consecuencia ha decidido contratar a un grupo de ingenieros especialista en ingeniería de software para que hagan un diagnóstico, presenten alternativas y elaboren un mapa de ruta que permita pasar del estado actual al estado ideal.

Como empresa madura ya cuenta con un levantamiento previo y documentado del proceso de venta y post venta de productos y servicios.

Cuando un cliente desea comprar un equipo móvil, adquirir una línea, paquete de TV, combo de telefonía, TV e internet, se debe acercar a los puntos de venta o los asesores de calle e iniciar los procesos de:

1. Validación de identidad
2. Enrolamiento
3. Recepción y legalización de documentos
4. Generación de e-contrato
5. Envío del contrato

---

## Validación de identidad

Cuando el cliente llega donde el asesor, este le solicita el documento de identidad para verificar su identidad en el sistema actual llamado **ID-TRUE**, que no es más que un sistema de información que con el número de identificación consulta la base de datos de la entidad y le indica cuales son los datos asociados a dicho número, de este modo el compara de manera visual, si corresponde al documento físico y si la foto consultada en el sistema corresponde a la persona.

Claro, el departamento de fraude ha encontrado una gran cantidad de engaños y falsificación de identidad lo que le ha implicado a la compañía fuertes cantidades de dineros.

---

## Enrolamiento

Si el cliente consultado no es encontrado en ID-TRUE el asesor comienza el proceso de enrolamiento, ingresando los siguientes datos:

1. **Información biográfica**
   - Tipo de documento
   - Número de documento
   - Nombres
   - Apellidos
   - Fecha de nacimiento
2. **Información adicional**
   - Dirección
   - Teléfono
   - Estado civil
   - Nivel de escolaridad
3. **Información biométrica**
   - Foto

---

## Recepción y legalización de documentos

Luego de realizar el enrolamiento, el asesor le hace firmar un documento físico al cliente que autoriza la consulta a centrales de riesgo para realizar la pre-aprobación, de este modo el asesor entra a **VALIDACION CREDITICIA**, un sistema que permite consultar por tipo y número de identificación la historia crediticia en centrales de riesgo y obteniendo una calificación que le permita pre-aprobar o no la obligación con la que el cliente va a quedar.

Así mismo el cliente debe tener unos documentos mínimos que debe anexar a la solicitud para que soporten la compra, tanto el consentimiento de centrales de riesgo como los demás documentos son escaneados y adjuntados a la solicitud hecha en el sistema de **RequestManager**, que es el encargado de registrar la solicitud de producto o servicio.

Si el cliente no tiene toda la documentación, Telecomunicaciones de la Konrad Lorenz le ofrece el servicio de recoger vía mensajería estos a su domicilio.

---

## Generación de e-contrato

Si la documentación está completa, el cliente cumple con los requisitos y ha cancelado el valor en caso de ser necesario, el asesor diligencia un contrato físico para que el cliente ponga su huella, su firma y acepte formalmente.

En ese momento el asesor escanea el contrato y nuevamente lo adjunta a la solicitud hecha dentro del sistema de RequestManager.

---

## Envío del contrato

Finalmente el asesor debe preguntarle al cliente la forma en que desea que le lleguen los documentos y el contrato ya que puede ser de manera digital a través de un correo electrónico certificado o a través del servicio de Courier para una entrega física.

Adicional a lo anterior, el asesor deberá empaquetar los documentos físicos cumpliendo con toda la normatividad de gestión documental y almacenamiento para enviarlos al archivo central que se encuentra en la sede central que queda en Bogotá.

---

## Expectativas de Telecomunicaciones de la Konrad Lorenz

1. Unificación de información
2. Mejorar o eliminación de procesos manuales
3. Revenue (Evitar que no se pierda dinero por problemas en los procesos de negocio)
4. Solicitudes no presenciales
5. Integración entre sistemas
