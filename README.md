# Ingeniería de Software 2

Grupo 2 · Fundación Universitaria Konrad Lorenz · 2026-2 · Profesor: Carlos Andrés López Ospina

Trabajo del semestre sobre el **Proyecto #1: Proceso de arquitectura empresarial Telco Konrad**. Las decisiones de cada entrega y cómo sustentarlas están en [`NOTAS_SUSTENTACION.md`](NOTAS_SUSTENTACION.md).

## Equipo

| Integrante | GitHub |
|---|---|
| Nicoll Alejandra Durán Quintero | [@Alejandraqt](https://github.com/Alejandraqt) |
| Rodrigo Muñoz Andrade | [@RodriKonrad](https://github.com/RodriKonrad) |
| Erick Santiago Peña Martínez | Pendiente |
| Juan Camilo Prieto Mestizo | [@KamiroDark](https://github.com/KamiroDark) |
| Brian Steven Vargas Clavijo | [@13rianVargas](https://github.com/13rianVargas) |

## Entregas

| Taller | Entregable |
|---|---|
| [T1](Taller_1/) | Enunciado AS-IS y TO-BE del caso |
| [T2](Taller_2/) | Business Motivation Model |
| [T3](Taller_3/) | Modelo de negocio (CANVAS) |
| [T4](Taller_4/) | Modelo operativo |
| [T5](Taller_5/) | Diagramas BPMN AS-IS y TO-BE |
| [T6](Taller_6/) | BPMN en Bonita y matriz EA: hojas 0.0, 1.0, 2.0, 2.1 y 6.0 |
| [T7](Taller_7/) | Matriz EA: hojas 3.0 y 4.0 |
| [T8](Taller_8/) | Matriz EA: hojas 5.0, 7.0, 8.0 y 9.0, y roadmap |
| [Expo](Expo_Seguridad_WAF_UTM_IdP/) | Arquitectura de seguridad: WAF, UTM e IdP (presentación y simulador) |

La matriz EA-XPress crece con cada taller: la versión vigente es la del taller más reciente.

## Estructura

```
.
├── NOTAS_SUSTENTACION.md   Decisiones por hoja de la matriz y glosario de IDs
├── docs/
│   ├── telco-konrad/       Enunciados y anexos técnicos (PDF)
│   ├── diagramas/          Integraciones AS-IS / TO-BE y secuencias (Mermaid + PNG)
│   └── plantillas/         Plantilla EA-XPress del curso
├── Taller_1/ … Taller_8/   Entregable de cada taller
└── Expo_Seguridad_WAF_UTM_IdP/
```

Los entregables siguen el formato `T<n>[_SUFIJO]_DURAN_MUÑOZ_PEÑA_PRIETO_VARGAS_GRUPO_2_20262.<ext>`. El proyecto Bonita del T6 tiene su propio [README](Taller_6/Bonita/README.md).

## Flujo de trabajo

1. Crear una rama por entrega desde `main`: `feature/taller-<n>`.
2. Commits en formato [Conventional Commits](https://www.conventionalcommits.org/es/): `feat: agrega la hoja 10.0 del T9`.
3. Abrir un Pull Request hacia `main` para revisión del equipo.
4. Actualizar `NOTAS_SUSTENTACION.md` y la tabla de entregas cuando aplique.

```bash
git clone https://github.com/KamiroDark/Ingenieria_Software_II.git
```

## Autoría

Todo el contenido (documentos, diagramas, código, commits y Pull Requests) se publica con la autoría de los integrantes del equipo. No se menciona a ninguna herramienta de IA como autora, coautora ni colaboradora: nada de `Co-Authored-By`, firmas, ni enlaces o etiquetas de herramientas en commits, PRs o documentos.

Uso académico · Fundación Universitaria Konrad Lorenz.
