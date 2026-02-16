import { geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo';

const TABS = [
  {
    id: 'dashboard-nacional',
    label: 'Dashboard Nacional',
    title: 'Análisis de Participación Económica',
    subtitle: 'Monitor de género y comparativa global',
    pill: 'Participación Económica (Global)',
    sections: [
      {
        key: 'participacion-global',
        type: 'world-map-ranking',
        title: 'Participación económica de las mujeres en el mundo',
        subtitle: 'El país está por debajo del promedio mundial en participación económica de mujeres.',
        file: 'data/dashboard-nacional/participacion_economica_mujeres_por_pais.json',
        layout: 'map-ranking'
      },
      {
        key: 'evolucion-tpe',
        type: 'flourish-embed',
        title: 'Dos de cada cinco mujeres participan en la economía en México',
        subtitle: 'Evolución nacional histórica de la TPE (IMCO / INEGI)',
        file: 'data/dashboard-nacional/participacion-mexico-historica.json',
        flourishId: '27259121'
      },
      {
        key: 'brecha-salarial-genero',
        type: 'line',
        title: 'Evolución de la brecha salarial por género en México',
        subtitle: 'Evolución porcentual nacional 2005 - 2025',
        file: 'data/dashboard-nacional/evolucion_brecha_salarial_genero_mexico_fuente.json',
        width: 'half',
        chartHeightScale: 1.2
      },
      {
        key: 'informalidad-laboral-sexo',
        type: 'line',
        title: 'Evolución de la informalidad laboral por sexo',
        subtitle: 'Tasas trimestrales de ocupación informal 2005 - 2025',
        file: 'data/dashboard-nacional/evolucion_informalidad_laboral_por_sexo_fuente.json',
        width: 'half'
      },
      {
        key: 'valor-cuidados',
        type: 'stacked-bars',
        title: 'Las mujeres aportan casi tres veces más valor económico por trabajo de cuidados',
        subtitle: 'Evolución de la equivalencia del trabajo no remunerado en el PIB por sexo',
        file: 'data/dashboard-nacional/valor_economico_cuidados_fuente.json'
      }
    ]
  },
  {
    id: 'estadisticas-entidad',
    label: 'Estadísticas por Entidad',
    title: 'Comparativo por Entidad Federativa',
    subtitle: 'Indicadores clave para priorización territorial',
    pill: 'Corte 2025',
    sections: [
      {
        key: 'mapa-indicadores-entidad',
        type: 'mexico-indicator-map',
        title: 'Mapa de México por indicador',
        subtitle: 'Selecciona un indicador y revisa su distribución por entidad federativa.',
        file: 'data/estadisticas-entidad/variables_monitor_entidad_enriched.json',
        layout: 'indicator-map'
      }
    ]
  },
  {
    id: 'cdmx-alcaldia',
    label: 'CDMX por Alcaldía',
    title: 'Panorama por Alcaldía en CDMX',
    subtitle: 'Brecha e inclusión económica territorial',
    pill: 'Alcaldías CDMX',
    sections: [
      {
        key: 'mapa-indicadores-cdmx',
        type: 'cdmx-indicator-map',
        title: 'Mapa de CDMX por indicador',
        subtitle: 'Selecciona un indicador para visualizar su comportamiento por alcaldía.',
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

const tabNav = document.getElementById('tab-nav');
const dashboard = document.getElementById('dashboard');
const viewTitle = document.getElementById('view-title');
const viewSubtitle = document.getElementById('view-subtitle');
const viewPill = document.getElementById('view-pill');
const sectionTemplate = document.getElementById('section-template');

let activeTab = TABS[0].id;

init();

function init() {
  renderTabButtons();
  loadTab(activeTab);
}

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

async function loadTab(tabId) {
  const tab = TABS.find((item) => item.id === tabId);
  if (!tab) return;

  viewTitle.textContent = tab.title;
  viewSubtitle.textContent = tab.subtitle;
  viewPill.textContent = tab.pill;

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
    body.innerHTML = await renderWorldMapRanking(data);
    syncRankingHeightToMap(body);
    attachWorldMapTooltip(body);
  }

  if (section.type === 'mexico-indicator-map') {
    body.innerHTML = renderMexicoIndicatorMapShell();
    await attachMexicoIndicatorMap(body, data);
  }

  if (section.type === 'cdmx-indicator-map') {
    body.innerHTML = renderMexicoIndicatorMapShell();
    await attachCdmxIndicatorMap(body, data);
  }

  if (section.type === 'heat-ranking') {
    body.innerHTML = renderHeatRanking(data);
  }

  if (section.type === 'line') {
    body.innerHTML = renderLineChart(data, { heightScale: section.chartHeightScale });
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
    attachBarChartTooltip(body, '.stack-segment');
  }

  if (section.type === 'horizontal-bars') {
    body.innerHTML = renderHorizontalBars(data);
    attachBarChartTooltip(body, '.horizontal-bar-fill');
  }

  return node;
}

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
    </div>
    <aside class="ranking">
      <h4>Ranking Internacional</h4>
      <ol class="rank-list">${rankingMarkup}</ol>
    </aside>
  `;
}

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
      <div class="map-tooltip-metric">Participación Económica (Global)</div>
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
      </div>
      <aside class="indicator-side">
        <h4 class="indicator-side-title"></h4>
        <div class="indicator-what-box">
          <h5>¿Qué mide?</h5>
          <p class="indicator-side-desc"></p>
        </div>
        <p class="indicator-side-meta"></p>
        <h5 class="indicator-side-subtitle">Top entidades</h5>
        <ol class="indicator-side-top"></ol>
        <section class="entity-profile-box">
          <p class="entity-profile-name"></p>
          <ul class="entity-profile-list"></ul>
        </section>
      </aside>
    </div>
  `;
}

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
  const entityProfileName = container.querySelector('.entity-profile-name');
  const entityProfileList = container.querySelector('.entity-profile-list');
  if (!rows.length || !select || !svg || !barsStage || !mapWrap || !indicatorSide || !sideTitle || !sideDesc || !sideMeta || !sideTop || !entityProfileName || !entityProfileList) {
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
    const subset = rows.filter((r) => r.Variable === variable);
    const byEntity = new Map(subset.map((r) => [normalizeStateName(r.Entidad), Number(r.Valor)]));
    const values = subset.map((r) => Number(r.Valor));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const description = subset.find((r) => typeof r.Que_mide === 'string' && r.Que_mide.trim())?.Que_mide || 'Sin descripción.';
    const unit = subset.find((r) => typeof r.Unidad === 'string' && r.Unidad.trim())?.Unidad || 'Porcentaje';
    const unitSymbol = unit.toLowerCase().includes('porcent') ? '%' : unit;
    const sortedEntities = subset.slice().sort((a, b) => b.Valor - a.Valor);

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
          stroke-width="${stateKey === selectedStateKey ? 2.1 : 1}"
          class="${stateKey === selectedStateKey ? 'selected-state' : ''}"
          data-state-key="${escapeHtml(stateKey)}"
          data-label="${escapeHtml(resolveStateDisplayName(name, subset))}"
          data-value="${Number.isFinite(value) ? value.toFixed(2) : ''}"
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
          label: r.Entidad,
          value: Number(r.Valor),
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
    sideTop.innerHTML = sortedEntities
      .map((r, i) => {
        const key = normalizeStateName(r.Entidad);
        const activeClass = key === selectedStateKey ? 'active' : '';
        return `<li class="${activeClass}" data-state-key="${escapeHtml(key)}"><span>${i + 1}. ${r.Entidad}</span><strong>${Number(r.Valor).toFixed(1)}${unitSymbol}</strong></li>`;
      })
      .join('');

    const selectedStateRows = rows
      .filter((r) => normalizeStateName(r.Entidad) === selectedStateKey)
      .slice()
      .sort((a, b) => a.Variable.localeCompare(b.Variable, 'es'));
    const selectedStateName = selectedStateRows[0]?.Entidad || sortedEntities[0]?.Entidad || 'Entidad';
    entityProfileName.textContent = selectedStateName;
    entityProfileList.innerHTML = selectedStateRows
      .map((r) => {
        const u = (r.Unidad || '').toLowerCase().includes('porcent') ? '%' : (r.Unidad || '');
        return `<li><span class="entity-indicator-name">${r.Variable}</span><strong class="entity-indicator-value">${Number(r.Valor).toFixed(1)}${escapeHtml(u)}</strong></li>`;
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
  const sideTopTitle = container.querySelector('.indicator-side-subtitle');
  const entityProfileName = container.querySelector('.entity-profile-name');
  const entityProfileList = container.querySelector('.entity-profile-list');
  if (!rows.length || !select || !svg || !barsStage || !mapWrap || !indicatorSide || !sideTitle || !sideDesc || !sideMeta || !sideTop || !sideTopTitle || !entityProfileName || !entityProfileList) {
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
    const subset = rows.filter((r) => r.Variable === variable);
    const byEntity = new Map(subset.map((r) => [normalizeAlcaldiaName(r.Entidad), Number(r.Valor)]));
    const values = subset.map((r) => Number(r.Valor));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const description = subset.find((r) => typeof r.Que_mide === 'string' && r.Que_mide.trim())?.Que_mide || 'Sin descripción.';
    const unit = subset.find((r) => typeof r.Unidad === 'string' && r.Unidad.trim())?.Unidad || 'Valor';
    const unitSymbol = unit.toLowerCase().includes('porcent') ? '%' : '';
    const sortedItems = subset.slice().sort((a, b) => b.Valor - a.Valor);

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
          stroke-width="${key === selectedKey ? 2.1 : 1}"
          class="${key === selectedKey ? 'selected-state' : ''}"
          data-state-key="${escapeHtml(key)}"
          data-label="${escapeHtml(resolveAlcaldiaDisplayName(name, subset))}"
          data-value="${Number.isFinite(value) ? value.toFixed(2) : ''}"
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
    sideTop.innerHTML = sortedItems
      .map((r, i) => {
        const key = normalizeAlcaldiaName(r.Entidad);
        const activeClass = key === selectedKey ? 'active' : '';
        return `<li class="${activeClass}" data-state-key="${escapeHtml(key)}"><span>${i + 1}. ${r.Entidad}</span><strong>${Number(r.Valor).toFixed(1)}${unitSymbol}</strong></li>`;
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
        const u = (r.Unidad || '').toLowerCase().includes('porcent') ? '%' : '';
        return `<li><span class="entity-indicator-name">${r.Variable}</span><strong class="entity-indicator-value">${Number(r.Valor).toFixed(1)}${escapeHtml(u)}</strong></li>`;
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
  return row ? row.Entidad : featureName;
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

function renderBarsStage(container, items, selectedKey, onSelect) {
  const max = Math.max(...items.map((i) => i.value), 1);
  container.className = 'bars-stage';
  container.innerHTML = `
    <div class="vbars-scroll">
      <div class="vbars-plot" style="--bar-count:${items.length}">
        ${items.map((item, index) => {
          const pct = (item.value / max) * 100;
          const active = item.key === selectedKey ? 'active' : '';
          const label = compactBarLabel(item.label);
          return `<button type="button" class="vbar-col ${active}" data-key="${escapeHtml(item.key)}" title="${escapeHtml(item.label)}">
            <strong class="vbar-value">${item.value.toFixed(1)}${escapeHtml(item.unitSymbol)}</strong>
            <span class="vbar-track"><span class="vbar-fill" style="height:${pct}%"></span></span>
            <span class="vbar-label">${index + 1}. ${escapeHtml(label)}</span>
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

function compactBarLabel(label) {
  const normalized = String(label || '').trim();
  if (normalized.length <= 14) return normalized;
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) return `${tokens[0]} ${tokens[1]}`;
  return normalized.slice(0, 14);
}

function setIndicatorStageView(svg, barsStage, mapVisible) {
  svg.hidden = !mapVisible;
  barsStage.hidden = mapVisible;
  svg.style.display = mapVisible ? 'block' : 'none';
  barsStage.style.display = mapVisible ? 'none' : 'grid';
}

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
  const ratio = (value - min) / ((max - min) || 1);
  const alpha = 0.2 + ratio * 0.75;
  return `rgba(111, 79, 232, ${alpha.toFixed(3)})`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll('\'', '&#039;');
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
    const labelIdx = line.values.length - 1;
    return `
      <path d="${path}" fill="none" stroke="${line.color}" stroke-width="3" stroke-linecap="round"/>
      ${points}
      <text x="${x(labelIdx) + 8}" y="${y(line.values[labelIdx])}" fill="${line.color}" font-size="12" font-weight="700">${line.name} ${line.values[labelIdx].toFixed(1)}${unit}</text>
    `;
  }).join('');

  const legend = series.map((line) => `<span><span class="legend-dot" style="background:${line.color}"></span>${line.name}</span>`).join('');

  return `
    <div class="chart-wrap line-chart-wrap" data-chart-kind="line">
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
    <div class="chart-legend">${legend}</div>
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
        rx="4"
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

  const legend = series.map((s) => `<span><span class="legend-dot" style="background:${s.color}"></span>${s.name}</span>`).join('');
  const topLegend = options.variant === 'care'
    ? `<div class="care-top-legend">${series.map((s) => `<span><span class="legend-dot square" style="background:${s.color}"></span>${s.name.replace('Aporte ', '').toUpperCase()}</span>`).join('')}</div>`
    : '';
  const footer = options.variant === 'care'
    ? `<div class="care-footer"><small>${escapeHtml(options.source || '')}</small></div>`
    : `<div class="chart-legend">${legend}</div>`;

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

async function fetchJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`No se pudo leer ${path}`);
  }
  return response.json();
}

function normalizeSectionData(section, data) {
  if (section.key === 'brecha-salarial-genero' && data?.sheets?.Hoja1) {
    const rows = data.sheets.Hoja1.filter((row) => Number.isFinite(row?.Año) && Number.isFinite(row?.Brecha));
    return {
      unit: '%',
      min: 0,
      max: 24,
      labels: rows.map((row) => String(row.Año)),
      series: [
        {
          name: 'Brecha Salarial',
          color: '#ec4899',
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
      source: 'Fuente: Cuentas Satélite de Trabajo No Remunerado (INEGI)',
      labels: rows.map((row) => String(row.Año)),
      series: [
        {
          name: 'Aporte Mujeres',
          color: '#6f4fe8',
          values: rows.map((row) => +(row.Mujeres * 100).toFixed(2))
        },
        {
          name: 'Aporte Hombres',
          color: '#ff7b53',
          values: rows.map((row) => +(row.Hombres * 100).toFixed(2))
        }
      ]
    };
  }

  return data;
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
