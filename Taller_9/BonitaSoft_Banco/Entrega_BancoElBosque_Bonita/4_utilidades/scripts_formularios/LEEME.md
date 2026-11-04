# Scripts de ajuste de formularios (solo referencia)

Se usaron una vez para recortar y ajustar los formularios que Studio generó (`newForm5` … `newForm13`):

- `cleanform.py` – funciones auxiliares (convertir Input a Select, buscar contenedores).
- `fixform.py` – deja en un formulario solo las secciones indicadas y convierte campos a listas.
- `taskfix.py` – aplica los ajustes específicos de cada formulario (listas, filas prellenadas, cálculos).

**Advertencias**
- Tienen **rutas fijas** a `C:\BonitaStudioCommunity-2025.2-u0\workspace\bancoelbosque`; hay que editarlas.
- Modifican los `.json` de `app/web_page/` directamente: **cerrar el UI Designer y hacer copia antes**.
- Ya fueron aplicados; volver a ejecutarlos sobre formularios nuevos generados por Studio solo tiene sentido en la misma estructura.
- No son parte del proyecto de Bonita: no hace falta ejecutarlos para usarlo.
