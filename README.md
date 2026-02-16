# Mujeres en la Economía - Micrositio Dashboard

Micrositio en **JavaScript + Vite** con 3 pestañas:
- `Dashboard Nacional`
- `Estadísticas por Entidad`
- `CDMX por Alcaldía`

El sitio consume datos JSON y renderiza mapas y gráficas interactivas.

## Stack
- `Vite`
- `JavaScript` (sin framework)
- `d3-geo` (proyecciones/cartografía)
- `CSS` custom

## Estructura del proyecto

```txt
.
├── assets/
│   ├── css/styles.css        # Estilos globales, responsive y componentes de charts
│   └── js/app.js             # Lógica completa del dashboard
├── public/
│   └── data/                 # Todos los JSON y GeoJSON usados por fetch()
├── index.html                # Shell principal
├── package.json
└── vercel.json               # Config de build para Vercel
```

## Importante: dónde sí editar

- Edita **fuente**:
  - `assets/js/app.js`
  - `assets/css/styles.css`
  - `index.html`
  - `public/data/...`

- No edites:
  - `dist/...` (se regenera en cada build)

## Flujo de datos y render

1. `assets/js/app.js` define las pestañas en `const TABS`.
2. Cada sección tiene su archivo `file: "data/...json"`.
3. `loadTab()` carga los JSON con `fetchJSON()`.
4. `renderSection()` decide qué renderer usar según `section.type`.
5. La sección se pinta en el `#dashboard`.

## Guía rápida de mantenimiento

## 1) Cambiar títulos, subtítulos o pestañas

Editar `const TABS` en `assets/js/app.js`.

Ejemplos de campos:
- `label`: texto de la pestaña
- `title` y `subtitle`: encabezado de la vista
- `sections[]`: bloques internos

## 2) Cambiar fuente de datos de una sección

En `TABS.sections[].file`, apunta al nuevo JSON dentro de `public/data/...`.

Ejemplo:
- `file: "data/dashboard-nacional/participacion_economica_mujeres_por_pais.json"`

## 3) Agregar una nueva sección

1. Agrega un objeto en `TABS[].sections`.
2. Define `type` existente (`line`, `stacked-bars`, `world-map-ranking`, etc.).
3. Si necesitas un nuevo tipo:
   - agrega un bloque en `renderSection()`
   - crea función render dedicada.

## 4) Ajustar mapa de mundo (países en español)

Puntos clave en `assets/js/app.js`:
- `COUNTRY_ALIASES`
- `SPANISH_DATASET_ALIASES`
- `resolveCountryMatch()`

Si un país no cruza bien entre mapa y dataset, agrega alias ahí.

## 5) Ajustar mapas de México y CDMX

Puntos clave:
- `attachMexicoIndicatorMap()`
- `attachCdmxIndicatorMap()`
- `MEXICO_STATE_ALIASES`
- `ALCALDIA_ALIASES`

GeoJSON usados:
- Entidad: URL remota (`MEXICO_GEOJSON_URL`)
- CDMX: `public/data/cdmx-alcaldia/cdmx_alcaldias_real.geojson` (local)

## 6) Ajustar tooltips

- Mapa mundial: `attachWorldMapTooltip()`
- Gráficas de línea: `attachLineChartTooltip()`
- Barras/segmentos: `attachBarChartTooltip()`

## 7) Ajustar vista móvil (tabs y barras)

En `assets/css/styles.css`:
- `@media (max-width: 760px)`
- `.tab-nav`, `.tab-scroll-hint`
- `.vbars-scroll`, `.vbars-plot`, `.bars-scroll-hint`

## Secciones y funciones relevantes

- Carga principal:
  - `init()`
  - `loadTab()`
  - `renderSection()`

- Renderers:
  - `renderWorldMapRanking()`
  - `renderLineChart()`
  - `renderStackedBars()`
  - `renderBarsStage()`
  - `renderMexicoIndicatorMapShell()`
  - `attachMexicoIndicatorMap()`
  - `attachCdmxIndicatorMap()`

- Utilidades:
  - `normalizeSectionData()`
  - `normalizeCountry()`
  - `fetchJSON()`
  - `escapeHtml()`

## Ejecutar local

```bash
npm install
npm run dev
```

## Build producción

```bash
npm run build
npm run preview
```

## Deploy en Vercel

El proyecto ya incluye `vercel.json`:
- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`

Pasos:
1. Push a GitHub.
2. Importar repo en Vercel.
3. Deploy (Vercel detecta Vite automáticamente).

## Checklist antes de hacer push

1. `npm run build` sin errores.
2. Verificar que los JSON estén en `public/data/...`.
3. Confirmar cambios en `assets/js/app.js` y `assets/css/styles.css`.
4. No editar manualmente `dist/`.

