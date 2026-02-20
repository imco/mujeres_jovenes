import { geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo';

// Configuración principal del micrositio.
// Si necesitas agregar una nueva sección o pestaña, empieza aquí.
const TABS = [
  {
    id: 'dashboard-nacional',
    label: 'Resultados nacionales',
    title: 'Datos nacionales',
    downloadLabel: 'Descarga datos',
    downloadHref: 'https://imco.org.mx/monitor/wp-content/uploads/2026/02/Monitor_pestana_resultados_nacionales.xlsx',
    downloadFilename: 'Monitor_pestana_resultados_nacionales.xlsx',
    sections: [
      {
        key: 'participacion-global',
        type: 'world-map-ranking',
        title: 'El país está por debajo del promedio mundial en participación económica de mujeres',
        subtitle: 'Participación económica de las mujeres por país - % de mujeres con trabajo o en busca de uno respecto al total de mujeres de 15 años o más',
        file: 'data/dashboard-nacional/participacion_economica_mujeres_por_pais.json',
        layout: 'map-ranking'
      },
      {
        key: 'evolucion-tpe',
        type: 'line',
        title: 'La participación de las mujeres en el mercado laboral ha cambiado poco en los últimos 20 años',
        subtitle: 'Evolución nacional histórica de la tasa de participación económica por sexo',
        file: 'data/dashboard-nacional/participacion-mexico-historica.json',
        source: 'Nota: Se condiera el 3T de cada año. Fuente: Elaborado por el IMCO con el promedio de los cuatro trimestres de la Encuesta Nacional de Ocupación y Empleo (ENOE) del INEGI de 2005 a 2025.',
        chartHeightScale: .8
      },
      {
        key: 'brecha-salarial-genero',
        type: 'line',
        title: 'En México en promedio por cada 100 pesos que gana un hombre una mujer percibe 87',
        subtitle: 'Evolución de la brecha salarial por género en México',
        source: 'Nota: Para 2025 se consideran los primeros trimestres del año. Fuente: Elaborado por el IMCO con el promedio de los cuatro trimestres de la Encuesta Nacional de Ocupación y Empleo (ENOE) del INEGI de 2005 a 2025.',
        file: 'data/dashboard-nacional/evolucion_brecha_salarial_genero_mexico_fuente.json',
        width: 'half',
        chartHeightScale: 1.35
      },
      {
        key: 'informalidad-laboral-sexo',
        type: 'line',
        title: 'Actualmente la diferencia entre hombres y mujeres en la informalidad se encuentra a niveles similares a 2005',
        subtitle: 'Porcentaje de trabajadores en la informalidad por sexo',
        source: 'Nota: Se considera la tasa de informalidad con respecto a la población ocupada no agropecuaria (TIL2). Fuente: Elaborado por el IMCO con el dato trimestral de la Encuesta Nacional de Ocupación y Empleo (ENOE) del INEGI de 2005 a 2025.',
        file: 'data/dashboard-nacional/evolucion_informalidad_laboral_por_sexo_fuente.json',
        width: 'half',
        chartHeightScale: 1.28
      },
      {
        key: 'valor-cuidados',
        type: 'stacked-bars',
        title: ' El trabajo en el hogar equivale a casi una cuarta parte de la economía',
        subtitle: 'Trabajo no remunerado en los hogares como porcentaje del PIB (pesos corrientes)',
        file: 'data/dashboard-nacional/valor_economico_cuidados_fuente.json'
      }
    ]
  },
  {
    id: 'estadisticas-entidad',
    label: 'Resultados por entidad',
    title: 'Estados #ConLupaDeGénero 2025',
    downloadLabel: 'Descarga datos',
    downloadHref: 'https://imco.org.mx/monitor/wp-content/uploads/2026/02/Boletas_Estados-ConLupaDeGenero-2025.pdf',
    downloadFilename: 'Boletas_Estados-ConLupaDeGenero-2025.pdf',
    sections: [
      {
        key: 'mapa-indicadores-entidad',
        type: 'mexico-indicator-map',
        title: 'Indicadores por entidad',
        subtitle: 'Selecciona un indicador de la lista desplegable',
        file: 'data/estadisticas-entidad/variables_monitor_entidad_enriched.json',
        layout: 'indicator-map'
      }
    ]
  },
  {
    id: 'cdmx-alcaldia',
    label: 'Resultados CDMX',
    title: 'Mujeres jóvenes en la CDMX',
    pill: 'Alcaldías CDMX',
    downloadLabel: 'Descarga datos',
    downloadHref: 'https://imco.org.mx/monitor/wp-content/uploads/2026/02/Boletas_Mujeres-CDMX-2025_22092025.pdf',
    downloadFilename: 'Boletas_Mujeres-CDMX-2025_22092025.pdf',
    sections: [
      {
        key: 'mapa-indicadores-cdmx',
        type: 'cdmx-indicator-map',
        title: 'Indicadores por alcaldía',
        subtitle: 'Selecciona un indicador de la lista desplegable.',
        file: 'data/cdmx-alcaldia/monitor_cdmx_indicadores.json',
        layout: 'indicator-map'
      }
    ]
  }
];

const palette = {
  women: '#6f4fe8',
  men: '#ff7b53',
  neutral: '#90a0bd',
  accent: '#ec4899',
  text: '#1f2340',
  grid: '#ece9f8'
};
const MAP_COLOR_STOPS = ['#e5e4fe', '#7f79fb'];

// Fuentes de geometría para mapas (mundo, México y CDMX).
const WORLD_GEOJSON_URL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';
const MEXICO_GEOJSON_URL = 'https://raw.githubusercontent.com/angelnmara/geojson/master/mexicoHigh.json';
const CDMX_GEOJSON_LOCAL = 'data/cdmx-alcaldia/cdmx_alcaldias_real.geojson';
const CDMX_GEOJSON_URL = 'https://raw.githubusercontent.com/angelnmara/geojson/master/mexicoCityHigh.json';
const REGION_NAMES_ES = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['es'], { type: 'region' })
  : null;
const REGION_NAMES_EN = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;
const ENGLISH_TO_SPANISH_REGION = buildEnglishToSpanishRegionMap();

// Alias para empatar nombres de países entre geojson (inglés) y dataset (español).
const COUNTRY_ALIASES = {
  'brazil': 'brasil',
  'brasil': 'brasil',
  'united states': 'estados unidos',
  'united states of america': 'estados unidos',
  'usa': 'estados unidos',
  'us': 'estados unidos',
  'russia': 'rusia',
  'russian federation': 'rusia',
  'czechia': 'republica checa',
  'czech republic': 'republica checa',
  'ivory coast': 'costa de marfil',
  'democratic republic of the congo': 'republica democratica del congo',
  'republic of the congo': 'republica del congo',
  'south korea': 'corea del sur',
  'north korea': 'corea del norte',
  'lao pdr': 'laos',
  'lao peoples democratic republic': 'laos',
  'iran, islamic republic of': 'iran',
  'syrian arab republic': 'siria',
  'venezuela, bolivarian republic of': 'venezuela',
  'bolivia, plurinational state of': 'bolivia',
  'tanzania, united republic of': 'tanzania',
  'moldova, republic of': 'moldavia',
  'myanmar': 'birmania',
  'eswatini': 'suazilandia',
  'cape verde': 'cabo verde',
  'bahamas': 'bahamas',
  'the bahamas': 'bahamas',
  'slovakia': 'eslovaquia',
  'timor-leste': 'timor oriental',
  'brunei darussalam': 'brunei',
  'sao tome and principe': 'santo tome y principe',
  'north macedonia': 'macedonia del norte',
  'vietnam': 'vietnam',
  'viet nam': 'vietnam'
};

// Alias de estados para empatar nombres entre mapa y archivo de datos.
const MEXICO_STATE_ALIASES = {
  'estado de mexico': 'mexico',
  'mexico state': 'mexico',
  'ciudad de mexico': 'ciudad de mexico',
  'distrito federal': 'ciudad de mexico',
  'cdmx': 'ciudad de mexico',
  'veracruz': 'veracruz de ignacio de la llave',
  'coahuila de zaragoza': 'coahuila',
  'coahuila': 'coahuila',
  'michoacan de ocampo': 'michoacan',
  'michoacan': 'michoacan'
};

// Alias de alcaldías para empatar nombres entre mapa y archivo de datos.
const ALCALDIA_ALIASES = {
  'gustavo a madero': 'gustavo a madero',
  'gustavo a. madero': 'gustavo a madero',
  'g a madero': 'gustavo a madero',
  'cuauhtemoc': 'cuauhtemoc',
  'magdalena contreras': 'la magdalena contreras',
  'la magdalena contreras': 'la magdalena contreras',
  'venustiano carranza': 'venustiano carranza'
};

// Normalized Spanish names that may differ from dataset labels.
const SPANISH_DATASET_ALIASES = {
  'china': 'republica popular china',
  'chequia': 'republica checa',
  'estados unidos de america': 'estados unidos',
  'corea': 'corea del sur',
  'myanmar': 'birmania',
  'costa de marfil': 'costa de marfil',
  'suazilandia': 'suazilandia',
  'esuatini': 'suazilandia',
  'iran': 'iran',
  'lao': 'laos',
  'laos': 'laos',
  'cabo verde': 'cabo verde',
  'santo tome y principe': 'santo tome y principe',
  'macedonia del norte': 'macedonia del norte',
  'rusia': 'rusia',
  'siria': 'siria',
  'moldavia': 'moldavia',
  'tanzania': 'tanzania',
  'bolivia': 'bolivia',
  'venezuela': 'venezuela',
  'timor oriental': 'timor oriental'
};

// Sentido de ranking por variable (true: más alto es mejor, false: más bajo es mejor).
// Fuente: tablas "¿Más es mejor?" de Variables_Monitor_Entidad.xlsx y Monitor_pestaña cdmx.xlsx.
const VARIABLE_BETTER_DIRECTION = new Map([
  // Entidad
  ['tasa de participacion economica de mujeres', true],
  ['mujeres preparadas', true],
  ['embarazo adolescente', false],
  ['desigualdad en trabajo no remunerado', false],
  ['inseguridad en el transporte publico', false],
  ['homicidios dolosos de mujeres', false],
  ['mujeres que quieren trabajar y no pueden', false],
  ['brecha de ingresos por genero', false],
  ['informalidad', false],
  ['cobertura de cuidados en la primera infancia', true],
  ['oferta de cuidados de adultos mayores', true],
  ['permisos de paternidad', true],
  ['delitos sexuales', false],
  ['pobreza laboral', false],
  ['dependencia de ingresos', false],
  ['emprendedoras formales', true],
  ['propiedad de la vivienda', true],
  // CDMX
  ['poblacion de mujeres jovenes', true],
  ['porcentaje de mujeres con hijos', true],
  ['mujeres jovenes que hablan una lengua indigena', true],
  ['mujeres con discapacidad', true],
  ['rezago educativo', false],
  ['mujeres fuera del sistema educativo y del mercado de trabajo', false],
  ['acceso a servicios de salud', false],
  ['mujeres con programas sociales', false],
  ['feminicidios', false],
  ['horas promedio destinadas a las tareas del hogar', false],
  ['horas promedio destinadas a los cuidados', false],
  ['tasa de participacion economica de las mujeres', true],
  ['duracion de la jornada laboral', true],
  ['brecha de ingresos', false],
  ['mujeres jovenes con trabajo precario', false],
  ['inclusion financiera', false],
  ['emprendedoras', true]
]);
const VARIABLE_DIRECTION_ALIASES = {
  'tasa de participacion economica femenina': 'tasa de participacion economica de mujeres',
  'tasa de participacion economica de la mujer': 'tasa de participacion economica de mujeres',
  'tasa de participacion economica de mujeres': 'tasa de participacion economica de mujeres',
  'tasa de participacion economica de las mujeres': 'tasa de participacion economica de las mujeres',
  'brecha de ingreso por genero': 'brecha de ingresos por genero',
  'brecha de ingreso': 'brecha de ingresos',
  'permiso de paternidad': 'permisos de paternidad',
  'mujeres jovenes que hablan lengua indigena': 'mujeres jovenes que hablan una lengua indigena'
};
const NO_PERCENT_SYMBOL_VARIABLES = new Set([
  'homicidios dolosos de mujeres',
  'oferta de cuidados de adultos mayores',
  'oferta de cuidados para adultos mayores',
  'feminicidios',
  'duracion de la jornada laboral',
  'horas promedio destinadas a las tareas del hogar',
  'horas promedio destinadas a los cuidados'
]);

const tabNav = document.getElementById('tab-nav');
const dashboard = document.getElementById('dashboard');
const viewTitle = document.getElementById('view-title');
const viewSubtitle = document.getElementById('view-subtitle');
const viewPill = document.getElementById('view-pill');
const sectionTemplate = document.getElementById('section-template');

let activeTab = TABS[0].id;

init();

// Punto de entrada de la app.
function init() {
  setupEmbedAutoResize();
  renderTabButtons();
  loadTab(activeTab);
}

// Si el dashboard está dentro de un iframe, notifica su altura al contenedor padre.
// Esto evita la doble barra de scroll en integraciones tipo WordPress + iframe.
function setupEmbedAutoResize() {
  if (window.parent === window) return;

  const notify = () => {
    const root = document.querySelector('.app-shell');
    const doc = document.documentElement;
    const body = document.body;
    const contentHeight = Math.max(
      root?.scrollHeight || 0,
      body?.scrollHeight || 0,
      doc?.scrollHeight || 0
    );
    window.parent.postMessage({
      type: 'mj:resize',
      height: Math.ceil(contentHeight + 16)
    }, '*');
  };

  const scheduleNotify = () => window.requestAnimationFrame(notify);

  window.addEventListener('load', scheduleNotify, { passive: true });
  window.addEventListener('resize', scheduleNotify, { passive: true });
  document.addEventListener('DOMContentLoaded', scheduleNotify);

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(scheduleNotify);
    const root = document.querySelector('.app-shell');
    if (root) ro.observe(root);
    ro.observe(document.body);
  }

  if (typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(scheduleNotify);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  scheduleNotify();
  window.setTimeout(scheduleNotify, 250);
  window.setTimeout(scheduleNotify, 1000);
  window.setTimeout(scheduleNotify, 2500);
}

// Renderiza navegación superior de pestañas.
function renderTabButtons() {
  tabNav.innerHTML = '';

  TABS.forEach((tab) => {
    const button = document.createElement('button');
    button.className = `tab-btn${tab.id === activeTab ? ' active' : ''}`;
    button.textContent = tab.label;
    button.type = 'button';
    button.onclick = () => {
      if (activeTab === tab.id) return;
      activeTab = tab.id;
      renderTabButtons();
      loadTab(activeTab);
    };
    tabNav.appendChild(button);
  });
}

// Carga datos + renderiza todas las secciones de la pestaña activa.
async function loadTab(tabId) {
  const tab = TABS.find((item) => item.id === tabId);
  if (!tab) return;

  viewTitle.textContent = tab.title;
  viewSubtitle.textContent = tab.subtitle;
  renderViewPill(tab);

  dashboard.innerHTML = '<article class="section card">Cargando secciones...</article>';

  try {
    const sectionsData = await Promise.all(tab.sections.map(async (section) => ({
      section,
      data: normalizeSectionData(section, await fetchJSON(section.file))
    })));

    dashboard.innerHTML = '';
    for (const { section, data } of sectionsData) {
      // Some sections need async rendering (world map geojson).
      const renderedSection = await renderSection(section, data);
      dashboard.appendChild(renderedSection);
    }
  } catch (error) {
    dashboard.innerHTML = `<article class="section card">Error al cargar los datos: ${error.message}</article>`;
  }
}

// Renderiza el badge superior derecho:
// - Pestañas normales: texto tipo pill.
// - CDMX: botón de descarga de boletas.
function renderViewPill(tab) {
  const hasDownload = Boolean(tab.downloadHref);
  if (!hasDownload) {
    viewPill.className = 'pill';
    viewPill.textContent = tab.pill || '';
    return;
  }

  viewPill.className = 'pill pill-download-wrap';
  viewPill.innerHTML = `
    <a
      class="pill-download-btn"
      href="${escapeHtml(tab.downloadHref)}"
      download="${escapeHtml(tab.downloadFilename || 'boletas_alcaldia.zip')}"
      title="${escapeHtml(tab.downloadLabel || 'Descarga datos')}"
      aria-label="${escapeHtml(tab.downloadLabel || 'Descarga datos')}"
    >
      <span class="pill-download-icon" aria-hidden="true">⬇</span>
      <span>${escapeHtml(tab.downloadLabel || 'Descarga datos')}</span>
    </a>
  `;
}

// Fabrica visual de cada tipo de sección.
// Para añadir un nuevo tipo de gráfico, agrega un nuevo bloque aquí.
async function renderSection(section, data) {
  const node = sectionTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('.section-title').textContent = section.title;
  node.querySelector('.section-subtitle').textContent = section.subtitle;

  const body = node.querySelector('.section-body');
  if (section.layout === 'split') {
    body.classList.add('split-body');
  }
  if (section.layout === 'map-ranking') {
    body.classList.add('map-ranking-body');
  }
  if (section.layout === 'indicator-map') {
    body.classList.add('indicator-map-body');
  }
  if (section.width === 'half') {
    node.classList.add('half');
  }

  if (section.type === 'world-map-ranking') {
    node.classList.add('section-map', 'section-map-world');
    body.innerHTML = await renderWorldMapRanking(data);
    syncRankingHeightToMap(body);
    attachWorldMapTooltip(body);
  }

  if (section.type === 'mexico-indicator-map') {
    node.classList.add('section-map', 'section-map-indicator');
    body.innerHTML = renderMexicoIndicatorMapShell();
    await attachMexicoIndicatorMap(body, data);
  }

  if (section.type === 'cdmx-indicator-map') {
    node.classList.add('section-map', 'section-map-indicator');
    body.innerHTML = renderMexicoIndicatorMapShell();
    await attachCdmxIndicatorMap(body, data);
  }

  if (section.type === 'heat-ranking') {
    body.innerHTML = renderHeatRanking(data);
  }

  if (section.type === 'line') {
    body.innerHTML = renderLineChart(data, {
      heightScale: section.chartHeightScale,
      source: section.source || data?.source || ''
    });
    attachLineChartTooltip(body);
  }

  if (section.type === 'flourish-embed') {
    body.innerHTML = renderFlourishEmbed(section);
    mountFlourishEmbedScript();
  }

  if (section.type === 'two-lines') {
    body.innerHTML = renderTwoLines(data);
    attachLineChartTooltip(body);
  }

  if (section.type === 'stacked-bars') {
    body.innerHTML = renderStackedBars(data, {
      variant: section.key === 'valor-cuidados' ? 'care' : 'default',
      showAllXTicks: section.key === 'valor-cuidados',
      yTicks: section.key === 'valor-cuidados' ? [0, 8, 16, 30] : null,
      source: section.key === 'valor-cuidados' ? data.source : ''
    });
    if (section.key === 'valor-cuidados') {
      attachStackedCombinedTooltip(body);
    } else {
      attachBarChartTooltip(body, '.stack-segment');
    }
  }

  if (section.type === 'horizontal-bars') {
    body.innerHTML = renderHorizontalBars(data);
    attachBarChartTooltip(body, '.horizontal-bar-fill');
  }

  return node;
}

// Sección de mapa mundial + ranking internacional.
async function renderWorldMapRanking(data) {
  const items = Array.isArray(data)
    ? data
      .filter((item) => item && typeof item.tpe === 'number')
      .map((item) => ({ name: item.pais, value: item.tpe }))
    : [];

  if (!items.length) {
    return '<div class="chart-wrap">No hay datos disponibles para el mapa.</div>';
  }

  const min = Math.min(...items.map((item) => item.value));
  const max = Math.max(...items.map((item) => item.value));
  const ranking = [...items]
    .sort((a, b) => b.value - a.value);

  const valuesByName = new Map(items.map((item) => [normalizeCountry(item.name), item.value]));
  const valuesByCanonical = new Map(items.map((item) => [canonicalCountry(item.name), item.value]));
  const labelsByName = new Map(items.map((item) => [normalizeCountry(item.name), item.name]));
  const labelsByCanonical = new Map(items.map((item) => [canonicalCountry(item.name), item.name]));
  let mapSvg = renderMapFallback(items, min, max);

  try {
    const world = await fetchJSON(WORLD_GEOJSON_URL);
    const features = world.features || world?.data?.features || [];
    if (features.length) {
      mapSvg = renderWorldSvg(
        features,
        valuesByName,
        valuesByCanonical,
        labelsByName,
        labelsByCanonical,
        min,
        max
      );
    }
  } catch {
    // Keep fallback map if world geojson cannot be fetched.
  }

  const rankingMarkup = ranking
    .map((item, index) => `<li><span>${index + 1}. ${item.name}</span><strong>${item.value.toFixed(1)}%</strong></li>`)
    .join('');

  return `
    <div class="map-panel chart-wrap">
      ${mapSvg}
      <div class="map-gradient">
        <span>0%</span>
        <div></div>
        <span>100%</span>
      </div>
      <p class="map-source">Fuente: Elaboración por el IMCO con datos del Banco Mundial, último dato disponible para 184 países.</p>
    </div>
    <aside class="ranking">
      <h4>Ranking internacional</h4>
      <ol class="rank-list">${rankingMarkup}</ol>
    </aside>
  `;
}

// Dibuja el mapa mundial SVG coloreando por intensidad.
function renderWorldSvg(features, valuesByName, valuesByCanonical, labelsByName, labelsByCanonical, min, max) {
  const width = 980;
  const height = 460;
  const visibleFeatures = features.filter((feature) => {
    const name = getFeatureName(feature);
    const normalized = normalizeCountry(name);
    return normalized !== 'antarctica' && normalized !== 'antartida';
  });

  const projection = geoNaturalEarth1().fitExtent([[8, 8], [width - 8, height - 8]], {
    type: 'FeatureCollection',
    features: visibleFeatures
  });
  projection.scale(projection.scale() * 1.12);
  const [tx, ty] = projection.translate();
  projection.translate([tx, ty + 12]);
  const path = geoPath(projection);

  const paths = visibleFeatures.map((feature) => {
    const d = path(feature);
    if (!d) return '';

    const countryName = getFeatureName(feature);
    const match = resolveCountryMatch(
      countryName,
      feature,
      valuesByName,
      valuesByCanonical,
      labelsByName,
      labelsByCanonical
    );
    const value = match?.value ?? null;
    const displayName = match?.label || getSpanishCountryName(feature, countryName);
    const fill = value === null ? '#eceaf5' : colorFromValue(value, min, max);
    const title = value === null ? displayName : `${displayName}: ${value.toFixed(1)}%`;

    return `<path d="${d}" fill="${fill}" stroke="#ffffff" stroke-width="0.55" data-country="${escapeHtml(displayName)}" data-value="${value === null ? '' : value.toFixed(1)}"></path>`;
  }).join('');

  return `<svg viewBox="0 0 ${width} ${height}" class="chart-svg world-map-svg" role="img" aria-label="Mapa mundial de participación económica femenina">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#f8f7fe" rx="14"></rect>
    ${paths}
  </svg>`;
}

// Tooltip del mapa mundial.
function attachWorldMapTooltip(container) {
  const svg = container.querySelector('.world-map-svg');
  if (!svg) return;

  const tooltip = document.createElement('div');
  tooltip.className = 'map-tooltip';
  tooltip.hidden = true;
  document.body.appendChild(tooltip);

  const onMove = (event) => {
    const target = event.target;
    if (!(target instanceof SVGPathElement)) {
      tooltip.hidden = true;
      return;
    }

    const country = target.dataset.country || 'País';
    const value = target.dataset.value;
    tooltip.innerHTML = `
      <div class="map-tooltip-country">${escapeHtml(country)}</div>
      <div class="map-tooltip-metric">Participación económica de mujeres</div>
      <div class="map-tooltip-value">${value ? `${value}%` : 'Sin dato'}</div>
    `;
    tooltip.hidden = false;

    const offset = 8;
    const rect = tooltip.getBoundingClientRect();
    let x = event.clientX + offset;
    let y = event.clientY + offset;

    if (x + rect.width > window.innerWidth - 6) {
      x = event.clientX - rect.width - offset;
    }
    if (y + rect.height > window.innerHeight - 6) {
      y = event.clientY - rect.height - offset;
    }

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  };

  const onLeave = () => {
    tooltip.hidden = true;
  };
  const onSvgOut = () => {
    tooltip.hidden = true;
  };

  svg.addEventListener('mousemove', onMove);
  svg.addEventListener('mouseleave', onLeave);
  svg.addEventListener('mouseout', onSvgOut);
}

// Mantiene la misma altura visual entre mapa y ranking (desktop).
function syncRankingHeightToMap(container) {
  const mapPanel = container.querySelector('.map-panel');
  const ranking = container.querySelector('.ranking');
  if (!mapPanel || !ranking) return;

  const applyHeight = () => {
    if (window.innerWidth <= 1024) {
      ranking.style.height = 'auto';
      return;
    }
    const h = mapPanel.getBoundingClientRect().height;
    if (h > 0) ranking.style.height = `${Math.round(h)}px`;
  };

  applyHeight();

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => applyHeight());
    observer.observe(mapPanel);
  } else {
    window.addEventListener('resize', applyHeight, { passive: true });
  }
}

function renderMapFallback(items, min, max) {
  const cells = items
    .sort((a, b) => b.value - a.value)
    .slice(0, 48)
    .map((item) => {
      const fill = colorFromValue(item.value, min, max);
      return `<div class="fallback-cell" style="background:${fill}" title="${escapeHtml(item.name)}: ${item.value.toFixed(1)}%"></div>`;
    }).join('');

  return `
    <div class="fallback-map" aria-label="Mapa simplificado de países por intensidad">
      ${cells}
    </div>
  `;
}

// Cascarón compartido para pestañas "Entidad" y "CDMX por Alcaldía".
function renderMexicoIndicatorMapShell() {
  return `
    <div class="mexico-map-layout">
      <div class="chart-wrap mexico-map-wrap">
        <div class="mexico-map-toolbar">
          <label for="indicator-select">Indicador</label>
          <select id="indicator-select" class="indicator-select"></select>
          <div class="view-toggle" role="group" aria-label="Tipo de visualización">
            <button type="button" class="view-btn active" data-view="map">Mapa</button>
            <button type="button" class="view-btn" data-view="bars">Barras</button>
          </div>
        </div>
        <div class="mexico-map-stage">
          <svg class="chart-svg mexico-map-svg" role="img" aria-label="Mapa de México por entidad"></svg>
          <div class="bars-stage" hidden></div>
        </div>
        <div class="map-gradient">
          <span>Mín</span>
          <div></div>
          <span>Máx</span>
        </div>
        <p class="chart-source indicator-chart-source" hidden></p>
      </div>
      <aside class="indicator-side">
        <h4 class="indicator-side-title"></h4>
        <div class="indicator-what-box">
          <h5>¿Qué mide?</h5>
          <p class="indicator-side-desc"></p>
        </div>
        <p class="indicator-side-meta"></p>
        <h5 class="indicator-side-subtitle">Entidades con mejor desempeño</h5>
        <ol class="indicator-side-top"></ol>
        <section class="entity-profile-box">
          <p class="entity-profile-name"></p>
          <ul class="entity-profile-list"></ul>
        </section>
      </aside>
    </div>
  `;
}

// Lógica de pestaña "Estadísticas por Entidad".
// Punto clave para cambiar:
// - indicador inicial (defaultVar)
// - contenido de panel lateral (sideTitle/sideDesc/sideMeta)
async function attachMexicoIndicatorMap(container, payload) {
  const records = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
  const rows = records.filter((r) =>
    r && typeof r.Entidad === 'string' && typeof r.Variable === 'string' && Number.isFinite(r.Valor)
  );

  const select = container.querySelector('#indicator-select');
  const svg = container.querySelector('.mexico-map-svg');
  const barsStage = container.querySelector('.bars-stage');
  const viewButtons = Array.from(container.querySelectorAll('.view-btn'));
  const mapWrap = container.querySelector('.mexico-map-wrap');
  const indicatorSide = container.querySelector('.indicator-side');
  const sideTitle = container.querySelector('.indicator-side-title');
  const sideDesc = container.querySelector('.indicator-side-desc');
  const sideMeta = container.querySelector('.indicator-side-meta');
  const sideTop = container.querySelector('.indicator-side-top');
  const indicatorSource = container.querySelector('.indicator-chart-source');
  const entityProfileName = container.querySelector('.entity-profile-name');
  const entityProfileList = container.querySelector('.entity-profile-list');
  if (!rows.length || !select || !svg || !barsStage || !mapWrap || !indicatorSide || !sideTitle || !sideDesc || !sideMeta || !sideTop || !indicatorSource || !entityProfileName || !entityProfileList) {
    container.innerHTML = '<div class="chart-wrap">No hay datos disponibles para el mapa por entidad.</div>';
    return;
  }

  let geojson;
  try {
    geojson = await fetchJSON(MEXICO_GEOJSON_URL);
  } catch {
    container.querySelector('.mexico-map-stage').innerHTML = '<div class="chart-wrap">No fue posible cargar el mapa de México.</div>';
    return;
  }

  const features = extractMexicoFeatures(geojson);
  if (!features.length) {
    container.querySelector('.mexico-map-stage').innerHTML = '<div class="chart-wrap">El archivo del mapa no contiene entidades.</div>';
    return;
  }

  const width = 980;
  const height = 600;
  const projection = geoMercator().fitExtent([[22, 22], [width - 22, height - 22]], {
    type: 'FeatureCollection',
    features
  });
  const path = geoPath(projection);
  const tooltip = getSharedChartTooltip();

  const variables = Array.from(new Set(rows.map((r) => r.Variable))).sort((a, b) => a.localeCompare(b, 'es'));
  const defaultVar = variables.find((v) => v === 'Tasa de participación económica femenina') || variables[0];
  select.innerHTML = variables.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  select.value = defaultVar;
  let selectedStateKey = '';
  let selectedView = 'map';

  const renderIndicator = (variable) => {
    const normalizedVariable = normalizeCountry(variable);
    const isSexualOffenses = normalizedVariable.includes('delitos sexuales');
    const showIntegerValues = normalizedVariable.includes('permiso de paternidad')
      || normalizedVariable.includes('permisos de paternidad');
    const formatIndicatorValue = (value) => showIntegerValues ? String(Math.round(value)) : value.toFixed(1);
    const formatMapValue = (value) => showIntegerValues ? String(Math.round(value)) : value.toFixed(2);
    const subset = rows.filter((r) => r.Variable === variable);
    const byEntity = new Map(subset.map((r) => [normalizeStateName(r.Entidad), Number(r.Valor)]));
    const values = subset.map((r) => Number(r.Valor));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const description = subset.find((r) => typeof r.Que_mide === 'string' && r.Que_mide.trim())?.Que_mide || 'Sin descripción.';
    const unit = subset.find((r) => typeof r.Unidad === 'string' && r.Unidad.trim())?.Unidad || 'Porcentaje';
    const source = subset.find((r) => typeof r.Fuente === 'string' && r.Fuente.trim())?.Fuente || '';
    const normalizedUnit = unit.toLowerCase();
    const hidePercentSymbol = shouldHidePercentSymbol(variable);
    const unitSymbol = isSexualOffenses
      ? ''
      : hidePercentSymbol
        ? ''
      : (normalizedUnit.includes('porcent') || normalizedUnit.includes('tasa')) ? '%' : unit;
    const higherIsBetter = isHigherValueBetter(variable);
    const sortedEntities = subset.slice().sort((a, b) => higherIsBetter ? b.Valor - a.Valor : a.Valor - b.Valor);

    if (!selectedStateKey || !byEntity.has(selectedStateKey)) {
      selectedStateKey = sortedEntities.length ? normalizeStateName(sortedEntities[0].Entidad) : '';
    }

    const mapVisible = selectedView === 'map';
    setIndicatorStageView(svg, barsStage, mapVisible);

    if (mapVisible) {
      const paths = features.map((feature) => {
        const name = getFeatureName(feature);
        const stateKey = normalizeStateName(name);
        const value = byEntity.get(stateKey);
        const fill = Number.isFinite(value) ? colorFromValue(value, min, max) : '#eceaf5';
        const d = path(feature);
        if (!d) return '';

        return `<path
          d="${d}"
          fill="${fill}"
          stroke="#ffffff"
          stroke-width="1"
          class="${stateKey === selectedStateKey ? 'selected-state' : ''}"
          data-state-key="${escapeHtml(stateKey)}"
          data-label="${escapeHtml(resolveStateDisplayName(name, subset))}"
          data-value="${Number.isFinite(value) ? formatMapValue(value) : ''}"
          data-unit="${escapeHtml(unitSymbol)}"
        ></path>`;
      }).join('');
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.innerHTML = `<rect x="0" y="0" width="${width}" height="${height}" fill="#f8f7fe" rx="14"></rect>${paths}`;
      barsStage.innerHTML = '';
    } else {
      renderBarsStage(
        barsStage,
        sortedEntities.map((r) => ({
          key: normalizeStateName(r.Entidad),
          label: formatStateDisplayName(r.Entidad),
          value: Number(r.Valor),
          displayValue: formatIndicatorValue(Number(r.Valor)),
          unitSymbol
        })),
        selectedStateKey,
        (nextKey) => {
          selectedStateKey = nextKey;
          renderIndicator(variable);
        }
      );
      svg.innerHTML = '';
    }

    sideTitle.textContent = variable;
    sideDesc.textContent = description;
    sideMeta.textContent = `Cobertura: ${subset.length} entidades | Unidad: ${unit}`;
    if (source) {
      const sourceText = /^fuente:/i.test(source.trim()) ? source.trim() : `Fuente: ${source.trim()}`;
      indicatorSource.innerHTML = formatSourceWithNoteBreak(sourceText);
      indicatorSource.hidden = false;
    } else {
      indicatorSource.innerHTML = '';
      indicatorSource.hidden = true;
    }
    sideTop.innerHTML = sortedEntities
      .map((r, i) => {
        const key = normalizeStateName(r.Entidad);
        const activeClass = key === selectedStateKey ? 'active' : '';
        return `<li class="${activeClass}" data-state-key="${escapeHtml(key)}"><span>${i + 1}. ${formatStateDisplayName(r.Entidad)}</span><strong>${formatIndicatorValue(Number(r.Valor))}${unitSymbol}</strong></li>`;
      })
      .join('');

    const selectedStateRows = rows
      .filter((r) => normalizeStateName(r.Entidad) === selectedStateKey)
      .slice()
      .sort((a, b) => a.Variable.localeCompare(b.Variable, 'es'));
    const selectedStateName = formatStateDisplayName(selectedStateRows[0]?.Entidad || sortedEntities[0]?.Entidad || 'Entidad');
    entityProfileName.textContent = selectedStateName;
    entityProfileList.innerHTML = selectedStateRows
      .map((r) => {
        const rowVariable = normalizeCountry(r.Variable);
        const hideRowPercentSymbol = shouldHidePercentSymbol(r.Variable);
        const uRaw = (r.Unidad || '');
        const uNormalized = uRaw.toLowerCase();
        const u = rowVariable.includes('delitos sexuales') || hideRowPercentSymbol
          ? ''
          : (uNormalized.includes('porcent') || uNormalized.includes('tasa')) ? '%' : uRaw;
        return `<li><span class="entity-indicator-name">${r.Variable}</span><strong class="entity-indicator-value">${formatIndicatorValue(Number(r.Valor))}${escapeHtml(u)}</strong></li>`;
      })
      .join('');

    sideTop.querySelectorAll('li[data-state-key]').forEach((row) => {
      row.addEventListener('click', () => {
        selectedStateKey = row.dataset.stateKey || '';
        renderIndicator(variable);
      });
    });

    if (mapVisible) {
      svg.querySelectorAll('path[data-label]').forEach((node) => {
        node.addEventListener('mousemove', (event) => {
          const label = node.dataset.label || 'Entidad';
          const value = node.dataset.value;
          const u = node.dataset.unit || '';
          tooltip.innerHTML = `
            <div class="chart-tooltip-title">${escapeHtml(label)}</div>
            <div class="chart-tooltip-row">
              <span class="chart-tooltip-dot" style="background:#6f4fe8"></span>
              <span>${value ? `${value}${escapeHtml(u)}` : 'Sin dato'}</span>
            </div>
          `;
          tooltip.hidden = false;
          positionSharedTooltip(tooltip, event.clientX, event.clientY);
        });
        node.addEventListener('click', () => {
          selectedStateKey = node.dataset.stateKey || selectedStateKey;
          renderIndicator(variable);
        });
        node.addEventListener('mouseleave', () => {
          tooltip.hidden = true;
        });
      });
    }
  };

  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedView = btn.dataset.view === 'bars' ? 'bars' : 'map';
      viewButtons.forEach((b) => b.classList.toggle('active', b === btn));
      renderIndicator(select.value);
    });
  });
  select.addEventListener('change', () => renderIndicator(select.value));
  renderIndicator(defaultVar);
  syncIndicatorSideHeightToMap(mapWrap, indicatorSide);
}

// Lógica de pestaña "CDMX por Alcaldía".
// Mantiene la misma experiencia que Entidad, pero con datos de alcaldías.
async function attachCdmxIndicatorMap(container, payload) {
  const records = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
  const rows = records.filter((r) =>
    r && typeof r.Entidad === 'string' && typeof r.Variable === 'string' && Number.isFinite(r.Valor)
  );

  const select = container.querySelector('#indicator-select');
  const svg = container.querySelector('.mexico-map-svg');
  const barsStage = container.querySelector('.bars-stage');
  const viewButtons = Array.from(container.querySelectorAll('.view-btn'));
  const mapWrap = container.querySelector('.mexico-map-wrap');
  const indicatorSide = container.querySelector('.indicator-side');
  const sideTitle = container.querySelector('.indicator-side-title');
  const sideDesc = container.querySelector('.indicator-side-desc');
  const sideMeta = container.querySelector('.indicator-side-meta');
  const sideTop = container.querySelector('.indicator-side-top');
  const indicatorSource = container.querySelector('.indicator-chart-source');
  const sideTopTitle = container.querySelector('.indicator-side-subtitle');
  const entityProfileName = container.querySelector('.entity-profile-name');
  const entityProfileList = container.querySelector('.entity-profile-list');
  if (!rows.length || !select || !svg || !barsStage || !mapWrap || !indicatorSide || !sideTitle || !sideDesc || !sideMeta || !sideTop || !indicatorSource || !sideTopTitle || !entityProfileName || !entityProfileList) {
    container.innerHTML = '<div class="chart-wrap">No hay datos disponibles para el mapa de alcaldías.</div>';
    return;
  }

  sideTopTitle.textContent = 'Lista de alcaldías';

  let geojson;
  try {
    geojson = await fetchJSON(CDMX_GEOJSON_LOCAL);
  } catch {
    try {
      geojson = await fetchJSON(CDMX_GEOJSON_URL);
    } catch {
      container.querySelector('.mexico-map-stage').innerHTML = '<div class="chart-wrap">No fue posible cargar el mapa de CDMX.</div>';
      return;
    }
  }

  const features = extractMexicoFeatures(geojson);
  if (!features.length) {
    container.querySelector('.mexico-map-stage').innerHTML = '<div class="chart-wrap">El archivo del mapa no contiene alcaldías.</div>';
    return;
  }

  const width = 980;
  const height = 620;
  const projection = geoMercator().fitExtent([[20, 20], [width - 20, height - 20]], {
    type: 'FeatureCollection',
    features
  });
  const path = geoPath(projection);
  const tooltip = getSharedChartTooltip();

  const variables = Array.from(new Set(rows.map((r) => r.Variable))).sort((a, b) => a.localeCompare(b, 'es'));
  const defaultVar = variables.find((v) => v === 'Delitos sexuales') || variables[0];
  select.innerHTML = variables.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  select.value = defaultVar;
  let selectedKey = '';
  let selectedView = 'map';

  const renderIndicator = (variable) => {
    const normalizedVariable = normalizeCountry(variable);
    const isSexualOffenses = normalizedVariable.includes('delitos sexuales');
    const showIntegerValues = normalizedVariable.includes('permiso de paternidad')
      || normalizedVariable.includes('permisos de paternidad');
    const formatIndicatorValue = (value) => showIntegerValues ? String(Math.round(value)) : value.toFixed(1);
    const formatMapValue = (value) => showIntegerValues ? String(Math.round(value)) : value.toFixed(2);
    const subset = rows.filter((r) => r.Variable === variable);
    const byEntity = new Map(subset.map((r) => [normalizeAlcaldiaName(r.Entidad), Number(r.Valor)]));
    const values = subset.map((r) => Number(r.Valor));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const description = subset.find((r) => typeof r.Que_mide === 'string' && r.Que_mide.trim())?.Que_mide || 'Sin descripción.';
    const unit = subset.find((r) => typeof r.Unidad === 'string' && r.Unidad.trim())?.Unidad || 'Valor';
    const source = subset.find((r) => typeof r.Fuente === 'string' && r.Fuente.trim())?.Fuente || '';
    const normalizedUnit = unit.toLowerCase();
    const hidePercentSymbol = shouldHidePercentSymbol(variable);
    const unitSymbol = isSexualOffenses
      ? ''
      : hidePercentSymbol
        ? ''
      : (normalizedUnit.includes('porcent') || normalizedUnit.includes('tasa')) ? '%' : '';
    const higherIsBetter = isHigherValueBetter(variable);
    const sortedItems = subset.slice().sort((a, b) => higherIsBetter ? b.Valor - a.Valor : a.Valor - b.Valor);

    if (!selectedKey || !byEntity.has(selectedKey)) {
      selectedKey = sortedItems.length ? normalizeAlcaldiaName(sortedItems[0].Entidad) : '';
    }

    const mapVisible = selectedView === 'map';
    setIndicatorStageView(svg, barsStage, mapVisible);

    if (mapVisible) {
      const paths = features.map((feature) => {
        const name = getFeatureName(feature);
        const key = normalizeAlcaldiaName(name);
        const value = byEntity.get(key);
        const fill = Number.isFinite(value) ? colorFromValue(value, min, max) : '#eceaf5';
        const d = path(feature);
        if (!d) return '';
        return `<path
          d="${d}"
          fill="${fill}"
          stroke="#ffffff"
          stroke-width="1"
          class="${key === selectedKey ? 'selected-state' : ''}"
          data-state-key="${escapeHtml(key)}"
          data-label="${escapeHtml(resolveAlcaldiaDisplayName(name, subset))}"
          data-value="${Number.isFinite(value) ? formatMapValue(value) : ''}"
          data-unit="${escapeHtml(unitSymbol)}"
        ></path>`;
      }).join('');
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.innerHTML = `<rect x="0" y="0" width="${width}" height="${height}" fill="#f8f7fe" rx="14"></rect>${paths}`;
      barsStage.innerHTML = '';
    } else {
      renderBarsStage(
        barsStage,
        sortedItems.map((r) => ({
          key: normalizeAlcaldiaName(r.Entidad),
          label: r.Entidad,
          value: Number(r.Valor),
          displayValue: formatIndicatorValue(Number(r.Valor)),
          unitSymbol
        })),
        selectedKey,
        (nextKey) => {
          selectedKey = nextKey;
          renderIndicator(variable);
        }
      );
      svg.innerHTML = '';
    }

    sideTitle.textContent = variable;
    sideDesc.textContent = description;
    sideMeta.textContent = `Cobertura: ${subset.length} alcaldías | Unidad: ${unit}`;
    if (source) {
      const sourceText = /^fuente:/i.test(source.trim()) ? source.trim() : `Fuente: ${source.trim()}`;
      indicatorSource.innerHTML = formatSourceWithNoteBreak(sourceText);
      indicatorSource.hidden = false;
    } else {
      indicatorSource.innerHTML = '';
      indicatorSource.hidden = true;
    }
    sideTop.innerHTML = sortedItems
      .map((r, i) => {
        const key = normalizeAlcaldiaName(r.Entidad);
        const activeClass = key === selectedKey ? 'active' : '';
        return `<li class="${activeClass}" data-state-key="${escapeHtml(key)}"><span>${i + 1}. ${r.Entidad}</span><strong>${formatIndicatorValue(Number(r.Valor))}${unitSymbol}</strong></li>`;
      })
      .join('');

    const selectedRows = rows
      .filter((r) => normalizeAlcaldiaName(r.Entidad) === selectedKey)
      .slice()
      .sort((a, b) => a.Variable.localeCompare(b.Variable, 'es'));
    const selectedName = selectedRows[0]?.Entidad || sortedItems[0]?.Entidad || 'Alcaldía';
    entityProfileName.textContent = selectedName;
    entityProfileList.innerHTML = selectedRows
      .map((r) => {
        const rowVariable = normalizeCountry(r.Variable);
        const hideRowPercentSymbol = shouldHidePercentSymbol(r.Variable);
        const uRaw = (r.Unidad || '');
        const uNormalized = uRaw.toLowerCase();
        const u = rowVariable.includes('delitos sexuales') || hideRowPercentSymbol
          ? ''
          : (uNormalized.includes('porcent') || uNormalized.includes('tasa')) ? '%' : '';
        return `<li><span class="entity-indicator-name">${r.Variable}</span><strong class="entity-indicator-value">${formatIndicatorValue(Number(r.Valor))}${escapeHtml(u)}</strong></li>`;
      })
      .join('');

    sideTop.querySelectorAll('li[data-state-key]').forEach((row) => {
      row.addEventListener('click', () => {
        selectedKey = row.dataset.stateKey || '';
        renderIndicator(variable);
      });
    });

    if (mapVisible) {
      svg.querySelectorAll('path[data-label]').forEach((node) => {
        node.addEventListener('mousemove', (event) => {
          const label = node.dataset.label || 'Alcaldía';
          const value = node.dataset.value;
          const u = node.dataset.unit || '';
          tooltip.innerHTML = `
            <div class="chart-tooltip-title">${escapeHtml(label)}</div>
            <div class="chart-tooltip-row">
              <span class="chart-tooltip-dot" style="background:#6f4fe8"></span>
              <span>${value ? `${value}${escapeHtml(u)}` : 'Sin dato'}</span>
            </div>
          `;
          tooltip.hidden = false;
          positionSharedTooltip(tooltip, event.clientX, event.clientY);
        });
        node.addEventListener('click', () => {
          selectedKey = node.dataset.stateKey || selectedKey;
          renderIndicator(variable);
        });
        node.addEventListener('mouseleave', () => {
          tooltip.hidden = true;
        });
      });
    }
  };

  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedView = btn.dataset.view === 'bars' ? 'bars' : 'map';
      viewButtons.forEach((b) => b.classList.toggle('active', b === btn));
      renderIndicator(select.value);
    });
  });
  select.addEventListener('change', () => renderIndicator(select.value));
  renderIndicator(defaultVar);
  syncIndicatorSideHeightToMap(mapWrap, indicatorSide);
}

function extractMexicoFeatures(geojson) {
  const features = geojson?.features || geojson?.data?.features || [];
  return Array.isArray(features) ? features : [];
}

function normalizeStateName(name) {
  const normalized = normalizeCountry(name);
  return MEXICO_STATE_ALIASES[normalized] || normalized;
}

function resolveStateDisplayName(featureName, subsetRows) {
  const normalized = normalizeStateName(featureName);
  const row = subsetRows.find((r) => normalizeStateName(r.Entidad) === normalized);
  return formatStateDisplayName(row ? row.Entidad : featureName);
}

function formatStateDisplayName(name) {
  const value = String(name || '').trim();
  return normalizeCountry(value) === 'veracruz de ignacio de la llave' ? 'Veracruz' : value;
}

function normalizeAlcaldiaName(name) {
  const normalized = normalizeCountry(name);
  return ALCALDIA_ALIASES[normalized] || normalized;
}

function resolveAlcaldiaDisplayName(featureName, subsetRows) {
  const normalized = normalizeAlcaldiaName(featureName);
  const row = subsetRows.find((r) => normalizeAlcaldiaName(r.Entidad) === normalized);
  return row ? row.Entidad : featureName;
}

function syncIndicatorSideHeightToMap(mapWrap, indicatorSide) {
  const applyHeight = () => {
    if (window.innerWidth <= 1024) {
      indicatorSide.style.height = 'auto';
      return;
    }
    const h = mapWrap.getBoundingClientRect().height;
    if (h > 0) indicatorSide.style.height = `${Math.round(h)}px`;
  };

  applyHeight();

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => applyHeight());
    observer.observe(mapWrap);
  } else {
    window.addEventListener('resize', applyHeight, { passive: true });
  }
}

// Render de barras verticales (vista alterna de mapa).
// Este bloque controla también el hint de scroll en móvil.
function renderBarsStage(container, items, selectedKey, onSelect) {
  const max = Math.max(...items.map((i) => i.value), 1);
  container.className = 'bars-stage';
  container.innerHTML = `
    <p class="bars-scroll-hint" aria-hidden="true">Desliza para ver el gráfico completo →</p>
    <div class="vbars-scroll">
      <div class="vbars-plot">
        ${items.map((item) => {
          const pct = (item.value / max) * 100;
          const active = item.key === selectedKey ? 'active' : '';
          const label = String(item.label || '').trim();
          const displayValue = typeof item.displayValue === 'string' ? item.displayValue : item.value.toFixed(1);
          const tooltipText = `${item.label}: ${displayValue}${item.unitSymbol}`;
          return `<button
            type="button"
            class="vbar-col ${active}"
            data-key="${escapeHtml(item.key)}"
            data-tooltip="${escapeHtml(tooltipText)}"
            title="${escapeHtml(tooltipText)}"
          >
            <span class="vbar-label">${escapeHtml(label)}</span>
            <span class="vbar-track"><span class="vbar-fill" style="width:${pct}%"></span></span>
            <strong class="vbar-value">${displayValue}${escapeHtml(item.unitSymbol)}</strong>
          </button>`;
        }).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('button[data-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      onSelect(btn.dataset.key || '');
    });
  });
}

// Alterna visualización "Mapa" <-> "Barras", renderizando una sola a la vez.
function setIndicatorStageView(svg, barsStage, mapVisible) {
  svg.hidden = !mapVisible;
  barsStage.hidden = mapVisible;
  svg.style.display = mapVisible ? 'block' : 'none';
  barsStage.style.display = mapVisible ? 'none' : 'grid';

  const mapWrap = svg.closest('.mexico-map-wrap');
  if (mapWrap) {
    mapWrap.classList.toggle('bars-view', !mapVisible);
  }
}

// Utilidad para obtener un nombre de feature compatible con varios geojson.
function getFeatureName(feature) {
  return feature?.properties?.name
    || feature?.properties?.NAME
    || feature?.properties?.NOMGEO
    || feature?.properties?.nomgeo
    || feature?.properties?.NOM_MUN
    || feature?.properties?.ADMIN
    || feature?.properties?.admin
    || feature?.properties?.sovereignt
    || feature?.id
    || 'País';
}

// Resuelve la mejor coincidencia país-dato considerando alias y traducciones.
function resolveCountryMatch(countryName, feature, valuesByName, valuesByCanonical, labelsByName, labelsByCanonical) {
  const candidates = new Set();
  const seedCandidates = [countryName, ...collectFeatureNameCandidates(feature)];
  for (const seed of seedCandidates) {
    const normalized = normalizeCountry(seed);
    if (!normalized) continue;
    candidates.add(normalized);
    const englishAlias = COUNTRY_ALIASES[normalized];
    if (englishAlias) candidates.add(normalizeCountry(englishAlias));
    const translatedSpanish = ENGLISH_TO_SPANISH_REGION.get(normalized);
    if (translatedSpanish) candidates.add(translatedSpanish);
  }

  const iso2 = getIso2(feature);
  if (iso2 && REGION_NAMES_ES) {
    const spanishName = REGION_NAMES_ES.of(iso2);
    if (spanishName) {
      const normalizedSpanish = normalizeCountry(spanishName);
      candidates.add(normalizedSpanish);
      if (SPANISH_DATASET_ALIASES[normalizedSpanish]) {
        candidates.add(normalizeCountry(SPANISH_DATASET_ALIASES[normalizedSpanish]));
      }
    }
  }

  for (const candidate of candidates) {
    if (valuesByName.has(candidate)) {
      return {
        value: valuesByName.get(candidate),
        label: labelsByName.get(candidate) || countryName
      };
    }
    const remap = SPANISH_DATASET_ALIASES[candidate];
    if (remap && valuesByName.has(normalizeCountry(remap))) {
      const key = normalizeCountry(remap);
      return {
        value: valuesByName.get(key),
        label: labelsByName.get(key) || remap
      };
    }
    const canonical = canonicalCountry(candidate);
    if (valuesByCanonical.has(canonical)) {
      return {
        value: valuesByCanonical.get(canonical),
        label: labelsByCanonical.get(canonical) || countryName
      };
    }
  }

  return null;
}

function collectFeatureNameCandidates(feature) {
  const props = feature?.properties || {};
  const keys = [
    'name',
    'NAME',
    'ADMIN',
    'admin',
    'sovereignt',
    'SOVEREIGNT',
    'name_long',
    'NAME_LONG',
    'formal_en',
    'FORMAL_EN',
    'name_sort',
    'NAME_SORT',
    'abbrev',
    'ABBREV',
    'postal',
    'POSTAL',
    'brk_name',
    'BRK_NAME'
  ];

  const result = [];
  for (const key of keys) {
    const value = props[key];
    if (typeof value === 'string' && value.trim()) {
      result.push(value.trim());
    }
  }
  return result;
}

function getSpanishCountryName(feature, fallbackName) {
  const iso2 = getIso2(feature);
  if (iso2 && REGION_NAMES_ES) {
    const spanish = REGION_NAMES_ES.of(iso2);
    if (spanish) {
      const normalized = normalizeCountry(spanish);
      const remap = SPANISH_DATASET_ALIASES[normalized];
      return remap || spanish;
    }
  }

  const normalizedFallback = normalizeCountry(fallbackName);
  const aliasFallback = COUNTRY_ALIASES[normalizedFallback];
  if (aliasFallback) return aliasFallback;

  return fallbackName;
}

function getIso2(feature) {
  const props = feature?.properties || {};
  const candidates = [
    props.iso_a2,
    props.ISO_A2,
    props.iso2,
    props.ISO2,
    props['iso-a2']
  ];

  for (const code of candidates) {
    if (typeof code === 'string' && /^[A-Z]{2}$/.test(code.toUpperCase())) {
      return code.toUpperCase();
    }
  }

  return null;
}

function normalizeCountry(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHigherValueBetter(variableName) {
  const normalized = normalizeCountry(variableName);
  const key = VARIABLE_DIRECTION_ALIASES[normalized] || normalized;
  return VARIABLE_BETTER_DIRECTION.has(key) ? VARIABLE_BETTER_DIRECTION.get(key) : true;
}

function shouldHidePercentSymbol(variableName) {
  return NO_PERCENT_SYMBOL_VARIABLES.has(normalizeCountry(variableName));
}

// Construye diccionario inglés->español de países usando Intl.DisplayNames.
function buildEnglishToSpanishRegionMap() {
  const map = new Map();
  if (!REGION_NAMES_EN || !REGION_NAMES_ES) return map;

  for (let i = 0; i < 26; i += 1) {
    for (let j = 0; j < 26; j += 1) {
      const code = String.fromCharCode(65 + i) + String.fromCharCode(65 + j);
      const en = REGION_NAMES_EN.of(code);
      const es = REGION_NAMES_ES.of(code);
      if (!en || !es) continue;
      map.set(normalizeCountry(en), normalizeCountry(es));
    }
  }

  return map;
}

function canonicalCountry(name) {
  return normalizeCountry(name)
    .replace(/\b(the|of|and|republic|islamic|democratic|federal|state|states|kingdom|people|peoples|plurinational)\b/g, ' ')
    .replace(/\b(el|la|los|las|de|del|y|republica|popular|democratica|federacion|estado|estados|unida|unidas)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function colorFromValue(value, min, max) {
  const rawRatio = (value - min) / ((max - min) || 1);
  const ratio = Math.max(0, Math.min(1, rawRatio));
  return mixHex(MAP_COLOR_STOPS[0], MAP_COLOR_STOPS[1], ratio);
}

function mixHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const clamp = Math.max(0, Math.min(1, t));
  const r = Math.round(a.r + (b.r - a.r) * clamp);
  const g = Math.round(a.g + (b.g - a.g) * clamp);
  const bCh = Math.round(a.b + (b.b - a.b) * clamp);
  return `rgb(${r}, ${g}, ${bCh})`;
}

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '');
  const normalized = clean.length === 3
    ? clean.split('').map((ch) => ch + ch).join('')
    : clean;
  const int = Number.parseInt(normalized, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

// Sanitiza texto para insertar en HTML sin riesgos de inyección.
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll('\'', '&#039;');
}

// Estandariza fuentes: cuando existan "Nota:" y "Fuente:", siempre muestra Nota arriba de Fuente.
function formatSourceWithNoteBreak(text) {
  const normalized = String(text || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';

  const lower = normalized.toLowerCase();
  const notaIndex = lower.indexOf('nota:');
  const fuenteIndex = lower.indexOf('fuente:');

  if (notaIndex !== -1 && fuenteIndex !== -1) {
    let notaText = '';
    let fuenteText = '';
    let prefixText = '';

    if (notaIndex < fuenteIndex) {
      prefixText = normalized.slice(0, notaIndex).trim();
      notaText = normalized.slice(notaIndex, fuenteIndex).trim().replace(/[.;\s]+$/, '');
      fuenteText = normalized.slice(fuenteIndex).trim();
    } else {
      prefixText = normalized.slice(0, fuenteIndex).trim();
      fuenteText = normalized.slice(fuenteIndex, notaIndex).trim().replace(/[.;\s]+$/, '');
      notaText = normalized.slice(notaIndex).trim();
    }

    const fullFuente = `${prefixText ? `${prefixText} ` : ''}${fuenteText}`.trim();
    return `${escapeHtml(notaText)}<br>${escapeHtml(fullFuente)}`;
  }

  const escaped = escapeHtml(normalized);
  return escaped.replace(/\s+(Nota:)/gi, '<br>$1');
}

function renderHeatRanking(data) {
  const min = Math.min(...data.items.map((item) => item.value));
  const max = Math.max(...data.items.map((item) => item.value));

  const grid = data.items.map((item) => {
    const intensity = (item.value - min) / (max - min || 1);
    const color = `rgba(111, 79, 232, ${0.15 + intensity * 0.8})`;
    return `<div class="heat-item">
      <strong>${item.name}</strong>
      <small>${item.value.toFixed(1)}${data.unit}</small>
      <div class="heat-bar" style="background:${color}"></div>
    </div>`;
  }).join('');

  const ranking = data.ranking.map((item, index) => `<li><span>${index + 1}. ${item.name}</span><strong>${item.value.toFixed(1)}${data.unit}</strong></li>`).join('');

  return `
    <div class="chart-wrap">
      <div class="heat-grid">${grid}</div>
    </div>
    <aside class="ranking">
      <h4>${data.rankingTitle}</h4>
      <ol class="rank-list">${ranking}</ol>
    </aside>
  `;
}

function renderLineChart(data, options = {}) {
  const isNarrow = window.innerWidth <= 760;
  const labels = data.labels;
  const series = data.series;
  const values = series.flatMap((s) => s.values);
  const min = data.min ?? Math.min(...values);
  const max = data.max ?? Math.max(...values);
  const unit = data.unit || '';
  const heightScale = options.heightScale ?? 1;

  const width = isNarrow ? 680 : 920;
  const height = Math.round((isNarrow ? 360 : 320) * heightScale);
  const margin = isNarrow
    ? { top: 18, right: 14, bottom: 46, left: 42 }
    : { top: 20, right: 20, bottom: 45, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const x = (i) => margin.left + (innerWidth * i) / (labels.length - 1 || 1);
  const y = (value) => margin.top + innerHeight - ((value - min) * innerHeight) / ((max - min) || 1);

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const value = min + ((max - min) / 4) * i;
    const yPos = y(value);
    return `<line x1="${margin.left}" y1="${yPos}" x2="${width - margin.right}" y2="${yPos}" stroke="${palette.grid}" />
      <text x="10" y="${yPos + 4}" font-size="11" fill="#7b809a">${value.toFixed(0)}${data.unit || ''}</text>`;
  }).join('');

  const skipStep = isNarrow ? Math.ceil(labels.length / 5) : Math.ceil(labels.length / 10);
  const xTicks = labels.map((label, i) => {
    if (i % skipStep !== 0 && i !== labels.length - 1) return '';
    return `<text x="${x(i)}" y="${height - 10}" font-size="11" fill="#7b809a" text-anchor="middle">${label}</text>`;
  }).join('');

  const lines = series.map((line) => {
    const path = line.values.map((value, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(value)}`).join(' ');
    const points = line.values.map((value, i) => `
      <circle cx="${x(i)}" cy="${y(value)}" r="4.2" fill="${line.color}" class="line-point" />
      <circle
        cx="${x(i)}"
        cy="${y(value)}"
        r="13.5"
        fill="transparent"
        class="line-hit"
        data-label="${escapeHtml(labels[i])}"
        data-series="${escapeHtml(line.name)}"
        data-value="${value.toFixed(2)}"
        data-unit="${escapeHtml(unit)}"
        data-color="${line.color}"
        data-cx="${x(i)}"
      />
    `).join('');
    return `
      <path d="${path}" fill="none" stroke="${line.color}" stroke-width="3" stroke-linecap="round"/>
      ${points}
    `;
  }).join('');

  const legend = series.map((line) => `<span><span class="legend-dot" style="background:${line.color}"></span>${line.name}</span>`).join('');
  const source = options.source || data.source || '';

  return `
    <div class="chart-wrap line-chart-wrap" data-chart-kind="line">
      <div class="chart-legend">${legend}</div>
      <svg
        viewBox="0 0 ${width} ${height}"
        class="chart-svg"
        role="img"
        aria-label="Gráfica de líneas"
        data-guide-top="${margin.top}"
        data-guide-bottom="${height - margin.bottom}"
      >
        ${gridLines}
        ${lines}
        ${xTicks}
      </svg>
    </div>
    ${source ? `<p class="chart-source">${formatSourceWithNoteBreak(source)}</p>` : ''}
  `;
}

function renderTwoLines(data) {
  const cards = data.charts.map((chart) => `
    <div class="chart-wrap">
      <h4 style="margin:.1rem 0 .2rem; font-size:.95rem;">${chart.title}</h4>
      <p style="margin:0 0 .45rem; color:#7b809a; font-size:.8rem;">${chart.subtitle}</p>
      ${renderLineChart(chart)}
    </div>
  `).join('');

  return `<div class="two-col">${cards}</div>`;
}

function renderStackedBars(data, options = {}) {
  const labels = data.labels;
  const series = data.series;
  const max = data.max ?? Math.max(...labels.map((_, i) => series.reduce((acc, s) => acc + s.values[i], 0)));

  const width = 920;
  const height = 330;
  const margin = { top: 20, right: 20, bottom: 45, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const barWidth = (innerWidth / labels.length) * 0.65;

  const y = (value) => margin.top + innerHeight - (value * innerHeight) / (max || 1);

  const bars = labels.map((label, i) => {
    const xPos = margin.left + (innerWidth / labels.length) * i + (innerWidth / labels.length - barWidth) / 2;
    let acc = 0;

    const stackParts = series.map((s) => {
      const v = s.values[i];
      const yPos = y(acc + v);
      const h = innerHeight - (yPos - margin.top) - (acc * innerHeight) / (max || 1);
      acc += v;
      return `<rect
        x="${xPos}"
        y="${yPos}"
        width="${barWidth}"
        height="${h}"
        rx="${options.variant === 'care' ? 0 : 4}"
        fill="${s.color}"
        opacity="0.9"
        class="stack-segment"
        data-label="${escapeHtml(label)}"
        data-series="${escapeHtml(s.name)}"
        data-value="${v.toFixed(2)}"
        data-unit="${escapeHtml(data.unit || '')}"
        data-color="${s.color}"
      />`;
    }).join('');

    const isNarrow = window.innerWidth <= 760;
    const tickEvery = options.showAllXTicks ? (isNarrow ? 2 : 1) : Math.ceil(labels.length / 10);
    const tick = i % tickEvery === 0 || i === labels.length - 1
      ? `<text x="${xPos + barWidth / 2}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#7b809a">${label}</text>`
      : '';

    return stackParts + tick;
  }).join('');

  const yTicks = Array.isArray(options.yTicks) && options.yTicks.length
    ? options.yTicks
    : Array.from({ length: 5 }, (_, i) => (max / 4) * i);

  const grid = yTicks.map((v) => {
    const yPos = y(v);
    return `<line x1="${margin.left}" y1="${yPos}" x2="${width - margin.right}" y2="${yPos}" stroke="${palette.grid}"/>
      <text x="6" y="${yPos + 4}" font-size="11" fill="#7b809a">${v.toFixed(0)}${data.unit || ''}</text>`;
  }).join('');

  const legend = series.map((s) => {
    const label = options.variant === 'care'
      ? s.name.replace(/^Aporte\s+/i, '')
      : s.name;
    return `<span><span class="legend-dot" style="background:${s.color}"></span>${label}</span>`;
  }).join('');
  const topLegend = `<div class="chart-legend">${legend}</div>`;
  const footer = options.variant === 'care'
    ? `<p class="chart-source">${formatSourceWithNoteBreak(options.source || '')}</p>`
    : '';

  return `
    <div class="chart-wrap ${options.variant === 'care' ? 'care-stacked-wrap' : ''}">
      ${topLegend}
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Gráfica de barras apiladas">
        ${grid}
        ${bars}
      </svg>
    </div>
    ${footer}
  `;
}

function renderHorizontalBars(data) {
  const max = data.max ?? Math.max(...data.items.map((i) => i.value));

  const rows = data.items.map((item) => {
    const width = (item.value / max) * 100;
    return `<div class="horizontal-bar-row" style="display:grid; grid-template-columns: 180px 1fr 70px; gap:.7rem; align-items:center; margin:.45rem 0;">
      <span style="font-size:.86rem;">${item.name}</span>
      <div style="height:10px; background:#eeebfb; border-radius:999px; overflow:hidden;">
        <div
          class="horizontal-bar-fill"
          style="height:100%; width:${width}%; background:${item.color || palette.women}; border-radius:999px;"
          data-label="${escapeHtml(item.name)}"
          data-value="${item.value.toFixed(2)}"
          data-unit="${escapeHtml(data.unit || '')}"
          data-color="${item.color || palette.women}"
        ></div>
      </div>
      <strong style="font-size:.85rem; text-align:right;">${item.value.toFixed(1)}${data.unit || ''}</strong>
    </div>`;
  }).join('');

  return `<div class="chart-wrap horizontal-bars-wrap">${rows}</div>`;
}

function attachLineChartTooltip(container) {
  const charts = container.querySelectorAll('.chart-wrap[data-chart-kind="line"]');
  if (!charts.length) return;

  const tooltip = getSharedChartTooltip();

  charts.forEach((chartWrap) => {
    const svg = chartWrap.querySelector('svg');
    if (!svg) return;

    const guide = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    guide.setAttribute('class', 'line-hover-guide');
    guide.setAttribute('y1', svg.dataset.guideTop || '20');
    guide.setAttribute('y2', svg.dataset.guideBottom || '275');
    guide.setAttribute('visibility', 'hidden');
    svg.appendChild(guide);

    const hits = chartWrap.querySelectorAll('.line-hit');
    hits.forEach((hit) => {
      hit.addEventListener('mousemove', (event) => {
        const label = hit.dataset.label || '';
        const unit = hit.dataset.unit || '';
        const cx = hit.dataset.cx || '0';

        guide.setAttribute('x1', cx);
        guide.setAttribute('x2', cx);
        guide.setAttribute('visibility', 'visible');

        const sameLabelHits = Array.from(hits).filter((node) => node.dataset.label === label);
        const rows = sameLabelHits.map((node) => {
          const series = node.dataset.series || '';
          const value = Number(node.dataset.value || 0);
          const color = node.dataset.color || palette.women;
          return `
            <div class="chart-tooltip-row">
              <span class="chart-tooltip-dot" style="background:${color}"></span>
              <span>${escapeHtml(series)}: ${value.toFixed(1)}${escapeHtml(unit)}</span>
            </div>
          `;
        }).join('');

        tooltip.innerHTML = `
          <div class="chart-tooltip-title">${escapeHtml(label)}</div>
          ${rows}
        `;
        tooltip.hidden = false;
        positionSharedTooltip(tooltip, event.clientX, event.clientY);
      });

      hit.addEventListener('mouseleave', () => {
        guide.setAttribute('visibility', 'hidden');
        tooltip.hidden = true;
      });
    });
  });
}

function attachBarChartTooltip(container, selector) {
  const elements = container.querySelectorAll(selector);
  if (!elements.length) return;

  const tooltip = getSharedChartTooltip();
  elements.forEach((element) => {
    element.addEventListener('mousemove', (event) => {
      const label = element.dataset.label || '';
      const series = element.dataset.series || '';
      const value = Number(element.dataset.value || 0);
      const unit = element.dataset.unit || '';
      const color = element.dataset.color || palette.women;

      tooltip.innerHTML = `
        <div class="chart-tooltip-title">${escapeHtml(label)}</div>
        <div class="chart-tooltip-row">
          <span class="chart-tooltip-dot" style="background:${color}"></span>
          <span>${escapeHtml(series ? `${series}: ` : '')}${value.toFixed(1)}${escapeHtml(unit)}</span>
        </div>
      `;
      tooltip.hidden = false;
      positionSharedTooltip(tooltip, event.clientX, event.clientY);
    });

    element.addEventListener('mouseleave', () => {
      tooltip.hidden = true;
    });
  });
}

// Tooltip combinado para barras apiladas:
// al hover de cualquier segmento, muestra todas las series del mismo periodo.
function attachStackedCombinedTooltip(container) {
  const segments = Array.from(container.querySelectorAll('.stack-segment'));
  if (!segments.length) return;

  const tooltip = getSharedChartTooltip();

  segments.forEach((segment) => {
    segment.addEventListener('mousemove', (event) => {
      const label = segment.dataset.label || '';
      const unit = segment.dataset.unit || '';
      const svg = segment.ownerSVGElement;
      if (!svg) return;

      const sameLabelSegments = Array.from(svg.querySelectorAll('.stack-segment'))
        .filter((node) => node.dataset.label === label);

      const rows = sameLabelSegments.map((node) => {
        const series = node.dataset.series || '';
        const value = Number(node.dataset.value || 0);
        const color = node.dataset.color || palette.women;
        return `
          <div class="chart-tooltip-row">
            <span class="chart-tooltip-dot" style="background:${color}"></span>
            <span>${escapeHtml(series)}: ${value.toFixed(1)}${escapeHtml(unit)}</span>
          </div>
        `;
      }).join('');

      tooltip.innerHTML = `
        <div class="chart-tooltip-title">${escapeHtml(label)}</div>
        ${rows}
      `;
      tooltip.hidden = false;
      positionSharedTooltip(tooltip, event.clientX, event.clientY);
    });

    segment.addEventListener('mouseleave', () => {
      tooltip.hidden = true;
    });
  });
}

function getSharedChartTooltip() {
  let tooltip = document.getElementById('chart-tooltip');
  if (tooltip) return tooltip;

  tooltip = document.createElement('div');
  tooltip.id = 'chart-tooltip';
  tooltip.className = 'chart-tooltip';
  tooltip.hidden = true;
  document.body.appendChild(tooltip);
  return tooltip;
}

function positionSharedTooltip(tooltip, clientX, clientY) {
  const offset = 10;
  const rect = tooltip.getBoundingClientRect();
  let x = clientX + offset;
  let y = clientY + offset;

  if (x + rect.width > window.innerWidth - 6) {
    x = clientX - rect.width - offset;
  }
  if (y + rect.height > window.innerHeight - 6) {
    y = clientY - rect.height - offset;
  }

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

// Fetch base para todos los archivos json del proyecto.
async function fetchJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`No se pudo leer ${path}`);
  }
  return response.json();
}

// Normaliza formato de fuentes tipo "Excel exportado" a la estructura de chart interna.
// Si cambia la estructura de un JSON de origen, normalmente el ajuste va aquí.
function normalizeSectionData(section, data) {
  if (section.key === 'evolucion-tpe') {
    const sourceRows = Array.isArray(data)
      ? data
      : data?.sheets?.Hoja1;

    if (Array.isArray(sourceRows)) {
      const rows = sourceRows
        .map((row) => ({
          year: Number(row?.Año ?? row?.Ano ?? row?.Anio ?? row?.year),
          mujeres: normalizeRateToPercent(row?.Mujeres ?? row?.mujeres),
          hombres: normalizeRateToPercent(row?.Hombres ?? row?.hombres)
        }))
        .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.mujeres) && Number.isFinite(row.hombres))
        .sort((a, b) => a.year - b.year);

      return {
        unit: '%',
        min: 35,
        max: 85,
        source: section.source || '',
        labels: rows.map((row) => String(row.year)),
        series: [
          {
            name: 'Mujeres',
            color: '#7f79fb',
            values: rows.map((row) => +row.mujeres.toFixed(2))
          },
          {
            name: 'Hombres',
            color: '#6d6e70',
            values: rows.map((row) => +row.hombres.toFixed(2))
          }
        ]
      };
    }
  }

  if (section.key === 'brecha-salarial-genero' && data?.sheets?.Hoja1) {
    const rows = data.sheets.Hoja1.filter((row) => Number.isFinite(row?.Año) && Number.isFinite(row?.Brecha));
    return {
      unit: '%',
      min: 0,
      max: 24,
      labels: rows.map((row) => String(row.Año)),
      series: [
        {
          name: 'Brecha salarial',
          color: '#8cded1',
          values: rows.map((row) => +(row.Brecha * 100).toFixed(2))
        }
      ]
    };
  }

  if (section.key === 'informalidad-laboral-sexo' && data?.sheets?.Hoja1) {
    const rows = data.sheets.Hoja1.filter(
      (row) => typeof row?.Trimestre === 'string' && Number.isFinite(row?.Mujeres) && Number.isFinite(row?.Hombres)
    );
    return {
      unit: '%',
      min: 0,
      max: 65,
      labels: rows.map((row) => row.Trimestre),
      series: [
        {
          name: 'Mujeres',
          color: '#6f4fe8',
          values: rows.map((row) => +(row.Mujeres * 100).toFixed(2))
        },
        {
          name: 'Hombres',
          color: '#90a0bd',
          values: rows.map((row) => +(row.Hombres * 100).toFixed(2))
        }
      ]
    };
  }

  if (section.key === 'valor-cuidados' && data?.sheets?.Hoja1) {
    const rows = data.sheets.Hoja1.filter(
      (row) => Number.isFinite(row?.Año) && Number.isFinite(row?.Mujeres) && Number.isFinite(row?.Hombres)
    );
    return {
      unit: '%',
      max: 32,
      source: 'Nota: Se utilizan las cifras brutas del método hibrido. La suma de los parciales puede no coincidir con el total por el redondeo. Para el año 2023 y 2024 se usan datos preliminares. Fuente: Elaborado por el IMCO con datos de la Cuenta Satélite del Trabajo No Remunerado de los Hogares de México 2024 del INEGI.',
      labels: rows.map((row) => String(row.Año)),
      series: [
        {
          name: 'Aporte Mujeres',
          color: '#7f79fb',
          values: rows.map((row) => +(row.Mujeres * 100).toFixed(2))
        },
        {
          name: 'Aporte Hombres',
          color: '#6d6e70',
          values: rows.map((row) => +(row.Hombres * 100).toFixed(2))
        }
      ]
    };
  }

  return data;
}

function normalizeRateToPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return n <= 1 ? n * 100 : n;
}

function renderFlourishEmbed(section) {
  const flourishId = section.flourishId || '';
  return `
    <div class="chart-wrap flourish-wrap">
      <div class="flourish-embed flourish-chart" data-src="visualisation/${flourishId}">
        <noscript>
          <img src="https://public.flourish.studio/visualisation/${flourishId}/thumbnail" width="100%" alt="chart visualization" />
        </noscript>
      </div>
      ${section.source ? `<p class="chart-source">${formatSourceWithNoteBreak(section.source)}</p>` : ''}
    </div>
  `;
}

function mountFlourishEmbedScript() {
  const existing = document.querySelector('script[data-flourish-embed-script="true"]');
  if (existing) {
    // Re-trigger embed hydration when the section is rendered again.
    existing.remove();
  }

  const script = document.createElement('script');
  script.src = 'https://public.flourish.studio/resources/embed.js';
  script.async = true;
  script.dataset.flourishEmbedScript = 'true';
  document.body.appendChild(script);
}
