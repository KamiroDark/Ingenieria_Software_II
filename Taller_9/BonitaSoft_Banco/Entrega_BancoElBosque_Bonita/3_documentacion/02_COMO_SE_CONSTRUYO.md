# 02 · Cómo se construyó (paso a paso)

Orden real en que se hizo, con los nombres de menú de **Bonita Studio Community 2025.2** en español. Sirve para repetirlo o para explicarlo en clase.

## 1. Corregir el diagrama de partida
`Banco_El_Bosque_Credito_v2.bpmn` tenía condiciones que no coincidían con el modelo de datos. Se generó `v3`:
- La condición de centrales usaba `estudioDatacredito` y `estudioCifin`, que no existen; se cambió a la lista `estudiosCentrales` (dos consultas, todas > 60).
- `decisionReducirMonto` no estaba definida; pasó a ser un campo de `Solicitud`.
- Todas las condiciones usan `?.` para tolerar valores nulos.
- Estudio tributario y antecedentes pasaron a listas (`estudiosTributarios`, `estudiosAntecedentes`).

## 2. Crear el proyecto y cargar el modelo de datos (BDM)
1. Proyecto nuevo `BancoElBosque`.
2. Explorador de proyectos → doble clic en **Modelo de Datos de Negocio** → **Importar** → `2_fuentes_originales/bdm_v3.zip`.
   - El importador **solo acepta `.zip`** (que contiene `bom.xml`), no el XML suelto.
3. Eliminar el objeto de ejemplo `com.company.model.BusinessObject`.
4. **Validar** → **Desplegar**.
   - Si el editor da «Failed to create the part's controls» (NullPointerException de `getLength()`), añadir `length="255"` a los campos no-texto del `bom.xml` del proyecto (ver `05_PROBLEMAS_Y_SOLUCIONES.md`). Ya está aplicado en este proyecto.

## 3. Importar el diagrama
En **Nuevo → Diagrama de proceso → Importar** se elige `Banco_El_Bosque_Credito_v3.bpmn`. (La opción *Archivo → Importar un proyecto* **no** sirve para esto: es para proyectos completos en `.zip`.) Se importan carriles, tareas, compuertas y las condiciones.

## 4. Variable de negocio `solicitud`
Pool → pestaña **Datos** → **Variables de negocio → Agregar**: nombre `solicitud`, tipo `com.bancoelbosque.Solicitud`, no múltiple. El valor inicial lo completa el contrato de inicio (paso 5).

## 5. Contrato de inicio
Pool → **Ejecución → Contrato → Añadir desde datos…** → `solicitud`, acción **Instanciar**, atributos: los 8 básicos + `documentos`; generación automática de operaciones.
Studio reemplaza el valor inicial de `solicitud` por un script que solo llena esos campos, así que se le añadió al final la creación de los 6 hijos vacíos (ver `01_RESUMEN…`).
Formulario: **Ejecución → Formulario de instanciación → lápiz** (genera `newForm`).

## 6. Contratos y formularios de las 13 tareas
En cada tarea humana: **Ejecución → Contrato → Añadir desde datos…** → `solicitud`, acción **Editar**, y solo los atributos de esa tarea. Luego **Ejecución → Formulario → lápiz** (respondiendo **Sí** a «widgets de sólo lectura»).
Studio genera siempre un formulario con **toda** la solicitud; se recortó a: datos del cliente (solo lectura) + la sección de la tarea. Después se ajustaron listas, obligatorios, filas prellenadas y el cálculo (ver `01_RESUMEN…`).

## 7. Actores
Seis actores creados desde los carriles. **Configurar → Mapeo de actores**: para la prueba los seis se mapearon a un solo usuario de la organización de ejemplo (botón **Usuarios…**).

## 8. Corrección de dependencias de las condiciones
Las condiciones importadas del `.bpmn` no declaraban que dependen de la variable `solicitud`, y el motor fallaba en la primera compuerta. Se añadió la referencia a `solicitud` en las 10 condiciones (ver `05_PROBLEMAS…`).
Si se vuelve a importar el `.bpmn` desde cero, **hay que repetir este paso**: abrir cada condición en Studio y aceptarla para que resuelva la dependencia.

## 9. Ejecutar y probar
Botón **Ejecutar** → abre el portal. Pruebas en `04_PRUEBAS_REALIZADAS.md`.
