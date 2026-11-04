# 🏗️ Ingeniería de Software 2

Repositorio del **Grupo 2** para los talleres y proyectos de la asignatura **Ingeniería de Software 2** (2026-2), Fundación Universitaria Konrad Lorenz. Profesor: **Carlos Andrés López Ospina**.

---

## 📌 Sobre este repositorio

Aquí está todo el trabajo del equipo durante el semestre. El eje es el **Proyecto #1: Proceso de arquitectura empresarial Telco Konrad**. Cada taller construye una parte de ese proyecto, desde el modelo de motivación hasta el roadmap de transformación, y la mayor parte se registra en la matriz **EA-XPress**.

Si vas a sustentar o retomar una entrega, empieza por [`NOTAS_SUSTENTACION.md`](NOTAS_SUSTENTACION.md): ahí están las decisiones de cada hoja de la matriz y cómo defenderlas.

## 👥 Equipo

| Integrante | GitHub |
|---|---|
| Nicoll Alejandra Durán Quintero | [@Alejandraqt](https://github.com/Alejandraqt) |
| Rodrigo Muñoz Andrade | [@RodriKonrad](https://github.com/RodriKonrad) |
| Erick Santiago Peña Martínez | _Pendiente_ |
| Juan Camilo Prieto Mestizo | [@KamiroDark](https://github.com/KamiroDark) |
| Brian Steven Vargas Clavijo | [@13rianVargas](https://github.com/13rianVargas) |

## 📋 Entregas del semestre

| # | Entrega | Contenido | Carpeta |
|---|---|---|---|
| T1 | Enunciado del proyecto | AS-IS y TO-BE de Telco Konrad transcritos a Markdown | [`Taller_1/`](Taller_1/) |
| T2 | Business Motivation Model | Misión, visión, metas, objetivos SMART, estrategias, políticas, DOFA | [`Taller_2/`](Taller_2/) |
| T3 | Modelo de negocio | CANVAS AS-IS | [`Taller_3/`](Taller_3/) |
| T4 | Modelo operativo | Clasificación del modelo operativo y CANVAS reestructurado | [`Taller_4/`](Taller_4/) |
| T6 | BPMN + matriz EA (hojas 0.0, 1.0, 2.0, 2.1, 6.0) | Diagramas AS-IS y TO-BE en Bonita, documento y matriz | [`Taller_6/`](Taller_6/) · [Bonita](Taller_6/Bonita/README.md) |
| T7 | Matriz EA (hojas 3.0, 4.0) | Análisis de aplicaciones e integración | [`Taller_7/`](Taller_7/) |
| T8 | Matriz EA (hojas 5.0, 7.0, 8.0, 9.0) + roadmap | Tecnología, iniciativas, priorización y roadmap visual | [`Taller_8/`](Taller_8/) |
| Expo | Arquitectura de seguridad: WAF, UTM e IdP | Presentación y simulador interactivo (HTML) | [`Expo_WAF,UTM,idP/`](Expo_WAF,UTM,idP/) |

> El T5 no tiene carpeta en el repo.

## 🗂️ Estructura del repositorio

```
.
├── README.md
├── NOTAS_SUSTENTACION.md        # Decisiones por hoja de la matriz y glosario de IDs (documento vivo)
├── docs/
│   ├── telco-konrad/            # Enunciados originales: AS-IS, TO-BE y anexos técnicos (PDF)
│   └── diagramas/               # Integraciones AS-IS / TO-BE y diagramas de secuencia (Mermaid + PNG)
├── Plantilla EA/                # Plantilla EA-XPress del curso (sin diligenciar)
├── Taller_1/ … Taller_8/        # Una carpeta por taller con su entregable
│   └── Taller_6/Bonita/         # Proyecto Bonita Studio (.bos + fuentes) con su propio README
└── Expo_WAF,UTM,idP/            # Exposición de seguridad
```

### Convención de nombres de los entregables

```
T<n>_DURAN_MUÑOZ_PEÑA_PRIETO_VARGAS_GRUPO_2_20262.<ext>
```

`<n>` es el número del taller y `20262` el periodo (2026-2). Si un taller tiene más de un archivo del mismo tipo, se agrega un sufijo después del número, como en `T8_ROADMAP_…pptx`.

## 🛠️ Herramientas

| Para abrir… | Usa |
|---|---|
| Matrices `.xlsx` / plantilla `.xls` | Excel o LibreOffice Calc |
| Diagramas BPMN (`.bos`, `.proc`) | Bonita Studio Community 2025.2 ([instrucciones](Taller_6/Bonita/README.md)) |
| Diagramas Mermaid (`docs/diagramas/*.md`) | GitHub o VS Code (los PNG están al lado por si el visor no los dibuja) |
| Simulador de la expo | Cualquier navegador: abre el `.html` directamente |

## 🔀 Flujo de trabajo

1. Actualiza `main` y crea una rama por entrega: `git checkout -b feature/taller-9`
2. Haz commits descriptivos con [Conventional Commits](https://www.conventionalcommits.org/es/): `feat: agrega la hoja 10.0 del T9`
3. Sube tu rama: `git push -u origin feature/taller-9`
4. Abre un Pull Request hacia `main` para que el equipo revise antes de mergear.
5. Si la entrega cambia decisiones de la matriz, actualiza también `NOTAS_SUSTENTACION.md` y la fila de la tabla de entregas de este README.

## 🚀 Cómo clonar el repositorio

```bash
git clone https://github.com/KamiroDark/Ingenieria_Software_II.git
cd Ingenieria_Software_II
```

## ✍️ Autoría

Todo el contenido de este repositorio (documentos, diagramas, código, commits y Pull Requests) se publica con la autoría de los integrantes del equipo. No se menciona a ninguna herramienta de IA como autora, coautora ni colaboradora: nada de `Co-Authored-By`, firmas, ni enlaces o etiquetas de herramientas en commits, PRs o documentos.

## 📄 Licencia

Uso académico — Fundación Universitaria Konrad Lorenz.
