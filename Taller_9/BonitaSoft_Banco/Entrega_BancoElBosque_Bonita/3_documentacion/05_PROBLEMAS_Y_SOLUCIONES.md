# 05 · Problemas encontrados y cómo se resolvieron

Útil para cualquiera del equipo que vuelva a importar o regenerar algo.

## 1. No existe «Importar BPMN» en el menú Archivo
**Síntoma:** *Archivo → Importar un proyecto* pide un `.zip`.  
**Causa:** esa opción es solo para proyectos completos.  
**Solución:** **Nuevo → Diagrama de proceso → Importar** y elegir el `.bpmn`.

## 2. El BDM no se importa como XML suelto
**Síntoma:** el importador del modelo de datos solo acepta `.zip`.  
**Solución:** `2_fuentes_originales/bdm_v3.zip` contiene el `bom.xml` en la raíz.

## 3. «Failed to create the part's controls» al reabrir el editor del BDM
**Síntoma:** `NullPointerException … SimpleField.getLength() is null` al abrir el modelo de datos.  
**Causa:** los campos no-texto (INTEGER, DOUBLE, BOOLEAN, LOCALDATE) venían sin atributo `length`; este editor lo exige.  
**Solución:** añadir `length="255"` a esos campos en `bdm/bom.xml` (Bonita lo ignora en esos tipos). Ya aplicado.  
**Ojo:** si alguien reimporta `bom_v3.xml` o `bdm_v3.zip` en un proyecto nuevo, puede reaparecer el error.

## 4. Operaciones duplicadas con script roto en «Registrar decisión del cliente»
**Síntoma:** al ejecutar, `Groovy script solicitudInput1.decisionReducirMonto no compila: unexpected token: ?`.  
**Causa:** el contrato de esa tarea se creó varias veces y quedaron 2 operaciones apuntando a una entrada que ya no existía.  
**Solución:** en **Ejecución → Operaciones** dejar una sola operación (`solicitudInput?.decisionReducirMonto`).  
**Prevención:** si se regenera un contrato, revisar la pestaña **Operaciones** de esa tarea.

## 5. El caso se detiene en la primera compuerta (la más importante)
**Síntoma:** el caso se queda sin tarea siguiente; la compuerta «¿Riesgo aprobado?» aparece en estado *failed*.  
**Registro del servidor:** `Expression … depends on solicitud is neither defined in the script nor in dependencies`.  
**Causa:** las condiciones importadas del `.bpmn` no declaran su dependencia de la variable `solicitud`.  
**Solución:** añadir a cada una de las 10 condiciones una referencia a la variable de negocio `solicitud` (en Studio: abrir la condición y aceptar, con «resolución automática de dependencias»).  
**Dónde mirar el error:** `<Studio>\workspace\tomcat\server\logs\bonita.log` o la API `/bonita/API/bpm/flowNode?f=state=failed`.

## 6. Los formularios generados muestran toda la solicitud
**Causa:** Studio genera el formulario a partir de la variable `solicitud` completa; solo hace editables los campos del contrato.  
**Solución:** se recortaron los formularios a los datos del cliente (solo lectura) + la sección de la tarea.  
**Prevención:** NO volver a generar un formulario con el lápiz de una tarea que ya está ajustada: se pierde el trabajo. Si hay que regenerar, usar `4_utilidades/scripts_formularios/` como referencia.

## 7. Listas desplegables con valores mal formados
**Síntoma:** al escribir `["A","B"]` en «Valores disponibles» del Select, se guardó con corchetes y comillas pegados a los valores.  
**Causa:** para valores constantes ese campo espera texto separado por comas (`A,B`).  
**Solución:** escribir `APROBADO,DEVUELTO,RECHAZADO`.

## 8. Editar archivos con Studio o el UI Designer abiertos
**Riesgo:** guardar desde una pestaña abierta con la versión vieja sobrescribe cambios hechos directamente en los archivos.  
**Regla del equipo:** cerrar las pestañas del UI Designer antes de tocar archivos y recargar después.

## 9. Pantallas lentas al llenar formularios en el portal
La lista de tareas tarda 2–5 s en mostrar la siguiente tarea tras enviar. Pulsar el icono de actualizar de la lista antes de buscarla.
