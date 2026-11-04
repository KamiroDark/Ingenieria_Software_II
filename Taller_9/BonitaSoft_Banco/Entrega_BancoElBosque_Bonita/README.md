# Banco El Bosque – Crédito de libre inversión (Bonita Studio)

Proceso de negocio ejecutable en **Bonita Studio Community 2025.2**: solicitud, estudio y desembolso de un crédito de libre inversión, con 6 roles, modelo de datos (BDM), formularios y reglas de decisión.

> Integrantes: _(completar)_  ·  Curso: Ingeniería de Software II  ·  Profesor: _(completar)_

## Estado del proyecto (resumen honesto)

| Parte | Estado |
|---|---|
| Diagrama BPMN con 6 carriles + sistema, 13 tareas humanas, 9 compuertas | Hecho y ejecutable |
| Modelo de datos (BDM) con 11 objetos | Hecho y desplegable |
| Formularios (UI Designer) de inicio y de las 13 tareas | Hecho |
| Cálculo automático de capacidad de endeudamiento (CE = (IT − GF) × 0,35) | Hecho |
| Camino feliz (aprobación y desembolso) | **Probado de punta a punta** |
| Rechazo (calificación < 60) | **Probado** |
| Exceso de monto → decisión del cliente → actualizar monto → recalcular | **Probado** (el caso se dejó abierto en antecedentes) |
| **Envío real de correos** (3 tareas de servicio) | **Pendiente**: las tareas existen en el flujo pero no tienen conector SMTP |
| Archivo adjunto de documentos | Pendiente |

Detalle en `3_documentacion/06_PENDIENTES_Y_LIMITACIONES.md`.

## Contenido de la carpeta

```
Entrega_BancoElBosque_Bonita/
├── README.md                      ← este archivo
├── .gitignore
├── MANIFIESTO_SHA256.txt          ← huellas para verificar que nada se dañó
├── RespaldoOficial(es)/           ← proyecto exportado por Studio (.bos): la forma más segura de importarlo
├── 1_proyecto_bonita/
│   └── bancoelbosque/             ← PROYECTO DE BONITA STUDIO (fuente real)
│       ├── app/diagrams/          ← proceso (.proc)
│       ├── app/web_page/          ← 14 formularios (newForm … newForm13)
│       ├── app/organizations/     ← organización de ejemplo (ACME)
│       ├── app/process_configurations/  ← mapeo de actores
│       └── bdm/bom.xml            ← modelo de datos
├── 2_fuentes_originales/          ← enunciado (PDF) y archivos de partida (BPMN v2, v3, BDM)
├── 3_documentacion/               ← guías, pruebas, problemas y prompts
└── 4_utilidades/
    ├── smtp_falso/                ← servidor SMTP de demostración (opcional, no usado al final)
    └── scripts_formularios/       ← scripts que ajustaron los formularios (solo referencia)
```

## Cómo abrirlo (versión corta)

**Recomendado:** Studio → **Archivo → Importar un proyecto** → elegir `RespaldoOficial(es)/bancoelbosque_20261104_1800.bos` (es el formato oficial de exportación de Bonita; por dentro es un zip). Es idéntico al proyecto de `1_proyecto_bonita` (comprobado archivo por archivo el 04/11/2026). Si el diálogo solo muestra `.zip`, cambiar el filtro a «todos los archivos».

Manualmente:

1. Instalar **Bonita Studio Community 2025.2** (la misma versión).
2. Copiar la carpeta `1_proyecto_bonita/bancoelbosque` dentro del `workspace` de Studio **o** importarla (ver `03_INSTALACION_Y_EJECUCION.md`, que explica ambas rutas y sus riesgos).
3. Abrir el modelo de datos → **Validar** → **Desplegar**.
4. Abrir el diagrama → **Ejecutar**.

## Lectura recomendada para presentar en clase

1. `3_documentacion/01_RESUMEN_DEL_PROYECTO.md` – qué hace y cómo está modelado.
2. `3_documentacion/04_PRUEBAS_REALIZADAS.md` – evidencia de que funciona.
3. `3_documentacion/06_PENDIENTES_Y_LIMITACIONES.md` – qué falta, dicho con claridad.
