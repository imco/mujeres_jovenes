import { geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo';
import { renderBrechaStory } from './brecha.js';
import { TABS } from './tabs.js';
import { createChat } from './chat.js';


const palette = {
  women: '#6f4fe8',
  men: '#ff7b53',
  neutral: '#90a0bd',
  accent: '#ec4899',
  text: '#1f2340',
  grid: '#ece9f8'
};
// ── Google Analytics helper ───────────────────────────────
function track(eventName, params = {}) {
  if (typeof gtag === 'function') gtag('event', eventName, params);
}

const MAP_COLOR_STOPS = ['#e5e4fe', '#7f79fb'];
const CDMX_COMMON_NOTE = 'Nota: No se presentan estimaciones para algunas alcaldías debido a que los resultados no son estadísticamente significativos (margen de error superior a 7% con un nivel de confianza de 80%).';

// Fuentes de geometría para mapas (mundo, México y CDMX).
const WORLD_GEOJSON_URL = 'data/world.geojson';
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

// Indicadores descriptivos: describen el contexto demográfico de la alcaldía,
// no su desempeño. No tienen dirección "mejor/peor", así que no se rankean ni
// se colorean como logro en la vista Comparar.
const NEUTRAL_DIRECTION_VARIABLES = new Set([
  'poblacion de mujeres jovenes',
  'porcentaje de mujeres con hijos',
  'mujeres jovenes que hablan una lengua indigena',
  'mujeres con discapacidad'
]);

// ── Vista "Comparar" (multi-indicador) de la pestaña CDMX ────────────────────
const COMPARE_MAX_INDICATORS = 6;
const COMPARE_DEFAULT_INDICATORS = [
  'Tasa de participación económica de las mujeres',
  'Informalidad',
  'Mujeres jóvenes con trabajo precario'
];
// Escala divergente por percentil: mejor (verde) — medio (blanco) — peor (naranja).
// Los tintes son claros a propósito: el valor va siempre en texto oscuro, así que
// el color nunca compite con la legibilidad de la cifra.
const COMPARE_COLOR_BEST = '#9fd7cd';
const COMPARE_COLOR_MID = '#ffffff';
const COMPARE_COLOR_WORST = '#ffc0a8';
// Indicadores sin dirección: rampa neutra monocroma, sin lectura de logro.
const COMPARE_COLOR_NEUTRAL_LOW = '#f7f6fc';
const COMPARE_COLOR_NEUTRAL_HIGH = '#cfcbe8';

const MONITOR_SITE_URL = 'https://imco.org.mx/monitor/mujeres-en-la-economia/';
const MONITOR_SITE_TITLE = 'Monitor Mujeres en la Economía';

const tabNav = document.getElementById('tab-nav');
const dashboard = document.getElementById('dashboard');
const viewTitle = document.getElementById('view-title');
const viewSubtitle = document.getElementById('view-subtitle');
const viewPill = document.getElementById('view-pill');
const sectionTemplate = document.getElementById('section-template');

let activeTab = TABS[0].id;
// Descarga de las pestañas cuyo archivo depende de la selección del usuario.
let activeDownloadHandler = null;
// Controladores que exponen las secciones interactivas para que el asistente
// pueda aplicar una selección (p. ej. el explorador de brecha salarial).
const sectionControllers = new Map();

init();

// Punto de entrada de la app.
function init() {
  setupEmbedAutoResize();
  setupViewPillActions();
  renderTabButtons();
  loadTab(activeTab);
  createChat({ navigate: navigateTo, track, escapeHtml });
}

// Últimas investigaciones del IMCO sobre mujeres (pestaña Investigaciones).
// Los datos y las imágenes se guardan en el repo (public/data/investigaciones/,
// public/investigaciones/) para no depender de imco.org.mx al cargar.
function renderInvestigaciones(items) {
  const node = document.createElement('section');
  node.className = 'investigaciones';
  node.setAttribute('aria-label', 'Investigaciones');
  node.innerHTML = `<div class="investigaciones-grid">${(Array.isArray(items) ? items : []).map((item) => `
    <article class="inv-card">
      <img class="inv-img" src="${escapeHtml(item.imagen)}" alt="" loading="lazy" width="720" height="446">
      <div class="inv-body">
        <span class="inv-year">${escapeHtml(item.anio)}</span>
        <h4 class="inv-title">${escapeHtml(item.titulo)}</h4>
        <p class="inv-text">${escapeHtml(item.resumen)}</p>
        <a class="inv-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
          Ver investigación <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>`).join('')}</div>`;
  node.querySelectorAll('.inv-link').forEach((link) => {
    link.addEventListener('click', () => track('investigacion_click', { url: link.href }));
  });
  return node;
}

// Si el dashboard está dentro de un iframe, notifica su altura al contenedor padre.
// Esto evita la doble barra de scroll en integraciones tipo WordPress + iframe.
function setupEmbedAutoResize() {
  if (window.parent === window) return;

  // Cuando el app corre dentro de un iframe, ocultar la barra de scroll del documento
  // (sin bloquear el layout ni el contenido). La altura la controla el padre vía postMessage.
  document.documentElement.classList.add('in-iframe');

  const notify = () => {
    const root = document.querySelector('.app-shell');
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const style = getComputedStyle(root);
    const contentHeight = rect.height
      + parseFloat(style.marginTop)
      + parseFloat(style.marginBottom);
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
// Devuelve una promesa que se resuelve cuando la pestaña terminó de dibujarse.
function selectTab(tabId) {
  const tab = TABS.find((item) => item.id === tabId);
  if (!tab || activeTab === tabId) return Promise.resolve();
  activeTab = tabId;
  renderTabButtons();
  track('tab_view', { tab_id: tab.id, tab_label: tab.label });
  return loadTab(activeTab);
}

// Lleva al usuario a un destino propuesto por el asistente:
// { tab, section?, brecha?: { c1, c2, medicion }, indicator? }
async function navigateTo(target) {
  if (!target || !TABS.some((t) => t.id === target.tab)) return;
  await selectTab(target.tab);

  const section = target.section
    ? dashboard.querySelector(`[data-section-key="${CSS.escape(target.section)}"]`)
    : null;
  const node = section || dashboard.firstElementChild;

  if (target.brecha) {
    sectionControllers.get('brecha-salarial')?.select(target.brecha);
  }
  if (target.indicator) {
    // Mapas de las pestañas Estatal y CDMX: el indicador se elige en su lista desplegable.
    const select = (node || dashboard).querySelector('#indicator-select');
    const wanted = normalizeCountry(target.indicator);
    const option = select && [...select.options].find((o) => normalizeCountry(o.value) === wanted);
    if (option && select.value !== option.value) {
      select.value = option.value;
      select.dispatchEvent(new Event('change'));
    }
  }

  if (node) {
    node.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    node.classList.remove('chat-highlight');
    void node.offsetWidth;
    node.classList.add('chat-highlight');
  }
  track('chat_navigate', { tab: target.tab, section: target.section || '' });
}

function renderTabButtons() {
  tabNav.innerHTML = '';

  TABS.forEach((tab) => {
    const button = document.createElement('button');
    button.className = `tab-btn${tab.id === activeTab ? ' active' : ''}`;
    button.textContent = tab.label;
    button.type = 'button';
    button.onclick = () => selectTab(tab.id);
    tabNav.appendChild(button);
  });
}

// Carga datos + renderiza todas las secciones de la pestaña activa.
async function loadTab(tabId) {
  const tab = TABS.find((item) => item.id === tabId);
  if (!tab) return;

  activeDownloadHandler = null;
  sectionControllers.clear();
  viewTitle.textContent = tab.title;
  viewSubtitle.textContent = tab.subtitle || '';
  viewSubtitle.hidden = !tab.subtitle;
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
  const hasDownload = Boolean(tab.downloadHref || tab.downloadAction);
  if (!hasDownload) {
    viewPill.className = 'pill';
    viewPill.textContent = tab.pill || '';
    // Sin descarga ni texto, la píldora vacía se vería como una mancha blanca.
    viewPill.hidden = !tab.pill;
    return;
  }
  viewPill.hidden = false;

  const citationText = buildMonitorWebsiteCitation();
  const brandLogoMarkup = tab.brandLogoSrc
    ? `<img class="view-brand-logo" src="${escapeHtml(encodeURI(tab.brandLogoSrc))}" alt="${escapeHtml(tab.brandLogoAlt || '')}">`
    : '';
  viewPill.className = 'pill pill-download-wrap';
  const downloadLabel = escapeHtml(tab.downloadLabel || 'Descarga datos');
  const downloadMarkup = tab.downloadAction
    ? `<button type="button" class="pill-download-btn" data-action="dynamic-download" title="${downloadLabel}">
        <span class="pill-download-icon" aria-hidden="true">⬇</span>
        <span>${downloadLabel}</span>
      </button>`
    : `<a
      class="pill-download-btn"
      href="${escapeHtml(tab.downloadHref)}"
      download="${escapeHtml(tab.downloadFilename || 'boletas_alcaldia.zip')}"
      title="${downloadLabel}"
      aria-label="${downloadLabel}"
    >
      <span class="pill-download-icon" aria-hidden="true">⬇</span>
      <span>${downloadLabel}</span>
    </a>`;
  viewPill.innerHTML = `
    ${brandLogoMarkup}
    ${downloadMarkup}
    <div class="pill-cite-wrap">
      <button
        type="button"
        class="pill-cite-btn"
        data-action="toggle-cite-tooltip"
        aria-label="Mostrar cómo citar el sitio"
        aria-expanded="false"
      >
        Citar sitio
      </button>
      <div class="pill-cite-tooltip" data-role="cite-tooltip" hidden>
        <p class="pill-cite-help">Te sugerimos citarnos de la siguiente manera:</p>
        <p class="pill-cite-text" data-role="cite-text">${escapeHtml(citationText)}</p>
        <div class="pill-cite-actions">
          <span class="pill-cite-feedback" data-role="cite-copied-feedback" hidden></span>
          <button type="button" class="pill-cite-copy-btn" data-action="copy-cite-text">Copiar cita</button>
        </div>
      </div>
    </div>
  `;
  if (!tab.downloadAction) {
    viewPill.querySelector('.pill-download-btn')?.addEventListener('click', () => {
      track('file_download', { file_name: tab.downloadFilename || tab.downloadHref, section: tab.label });
    });
  }
}

function setupViewPillActions() {
  const closeTooltip = () => {
    const tooltip = viewPill.querySelector('[data-role="cite-tooltip"]');
    const toggleBtn = viewPill.querySelector('[data-action="toggle-cite-tooltip"]');
    if (!(tooltip instanceof HTMLElement) || !(toggleBtn instanceof HTMLButtonElement)) return;
    tooltip.hidden = true;
    toggleBtn.setAttribute('aria-expanded', 'false');
  };

  viewPill.addEventListener('click', async (event) => {
    const actionNode = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (!actionNode) return;
    const action = actionNode.getAttribute('data-action');

    if (action === 'dynamic-download') {
      if (!activeDownloadHandler) return;
      actionNode.setAttribute('aria-busy', 'true');
      try {
        await activeDownloadHandler();
      } finally {
        actionNode.removeAttribute('aria-busy');
      }
      return;
    }

    if (action === 'toggle-cite-tooltip') {
      const wrap = actionNode.closest('.pill-cite-wrap');
      const tooltip = wrap?.querySelector('[data-role="cite-tooltip"]');
      const toggleBtn = actionNode instanceof HTMLButtonElement ? actionNode : null;
      if (!(tooltip instanceof HTMLElement) || !toggleBtn) return;

      const shouldOpen = tooltip.hidden;
      tooltip.hidden = !shouldOpen;
      toggleBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');

      if (shouldOpen) {
        track('citation_open');
        const textNode = tooltip.querySelector('[data-role="cite-text"]');
        const feedbackEl = tooltip.querySelector('[data-role="cite-copied-feedback"]');
        if (textNode instanceof HTMLElement && feedbackEl instanceof HTMLElement) {
          const copied = await copyTextToClipboard(textNode.textContent || '');
          track('citation_copy', { success: copied });
          feedbackEl.textContent = copied ? '¡Cita copiada al portapapeles!' : 'No se pudo copiar automáticamente';
          feedbackEl.classList.toggle('pill-cite-feedback--error', !copied);
          feedbackEl.hidden = false;
        }
      }
      return;
    }

    if (action === 'copy-cite-text') {
      const wrap = actionNode.closest('.pill-cite-wrap');
      const textNode = wrap?.querySelector('[data-role="cite-text"]');
      const copyBtn = actionNode instanceof HTMLButtonElement ? actionNode : null;
      if (!(textNode instanceof HTMLElement) || !copyBtn) return;

      const copied = await copyTextToClipboard(textNode.textContent || '');
      track('citation_copy', { success: copied });
      const originalLabel = copyBtn.textContent || 'Copiar cita';
      copyBtn.textContent = copied ? '¡Copiada!' : 'No se pudo copiar';
      window.setTimeout(() => {
        copyBtn.textContent = originalLabel;
      }, 1400);
    }
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Node)) return;
    if (viewPill.contains(event.target)) return;
    closeTooltip();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'Esc') closeTooltip();
  });
}

function buildMonitorWebsiteCitation() {
  const accessDate = formatSpanishDate(new Date());
  return `${MONITOR_SITE_TITLE} del IMCO, consultado ${accessDate}. ${MONITOR_SITE_URL}`;
}

function formatSpanishDate(date) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_error) {
    // fallback below
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
}

// Fabrica visual de cada tipo de sección.
// Para añadir un nuevo tipo de gráfico, agrega un nuevo bloque aquí.
async function renderSection(section, data) {
  if (section.type === 'investigaciones') {
    const node = renderInvestigaciones(data);
    node.dataset.sectionKey = section.key;
    return node;
  }

  if (section.type === 'brecha-story') {
    const node = renderBrechaStory(data, {
      escapeHtml,
      track,
      citation: buildMonitorWebsiteCitation,
      setDownloadHandler: (handler) => { activeDownloadHandler = handler; },
      // Piezas del mapa de la pestaña Estatal, reutilizadas por la vista por entidad.
      fetchJSON,
      MEXICO_GEOJSON_URL,
      extractMexicoFeatures,
      getFeatureName,
      normalizeStateName,
      colorFromValue,
      renderBarsStage,
      setIndicatorStageView,
      syncIndicatorSideHeightToMap,
      getSharedChartTooltip,
      positionSharedTooltip,
      registerController: (controller) => sectionControllers.set(section.key, controller)
    });
    node.dataset.sectionKey = section.key;
    return node;
  }

  const node = sectionTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.sectionKey = section.key;
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
  if (section.key === 'stem-pisa-historico' || section.key === 'stem-nivel-matematicas') {
    node.classList.add('stem-top-pair');
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
    body.innerHTML = renderMexicoIndicatorMapShell({ compare: true });
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

  if (section.type === 'stem-nivel-matematicas') {
    body.innerHTML = renderStemNivelMatematicas(data);
    attachBarChartTooltip(body, '.stem-hbar-fill');
  }

  if (section.type === 'stem-matricula-area') {
    body.innerHTML = renderStemMatriculaArea(data);
    attachBarChartTooltip(body, '.stem-stacked-fill');
  }

  if (section.type === 'stem-map') {
    body.innerHTML = renderStemMapShell();
    await attachStemMap(body, data, section.graphId);
  }

  if (section.type === 'stem-mercado-laboral') {
    body.innerHTML = renderStemMercadoLaboral(data);
    attachBarChartTooltip(body, '.stem-gbar-fill');
  }

  if (section.cta) {
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'section-cta';
    cta.innerHTML = `${escapeHtml(section.cta.label)} <span aria-hidden="true">→</span>`;
    cta.addEventListener('click', () => {
      track('cta_click', { from: section.key, to: section.cta.tab });
      selectTab(section.cta.tab);
      document.querySelector('.view-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    body.appendChild(cta);
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
      <p class="map-source">Nota: La tasa de participación de mujeres es el porcentaje de mujeres de 15 años o más que tienen un trabajo o buscan uno.<br>Fuente: Elaboración por el IMCO con datos del Banco Mundial 2024 o último dato disponible para 184 países.</p>
    </div>
    <aside class="ranking">
      <h4>Ranking internacional </h4>
      <h4>Nivel mundial: 49%</h4>
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
// `compare: true` habilita la tercera vista (matriz multi-indicador). Solo la
// usa CDMX; la pestaña Entidad monta el mismo shell sin ella.
function renderMexicoIndicatorMapShell({ compare = false } = {}) {
  const compareBtn = compare
    ? '<button type="button" class="view-btn" data-view="compare">Comparar</button>'
    : '';
  const comparePicker = compare
    ? `<details class="compare-picker" hidden>
          <summary class="compare-picker-summary">
            <span>Indicadores</span>
            <span class="compare-picker-count"></span>
          </summary>
          <div class="compare-picker-panel" role="group" aria-label="Selección de indicadores"></div>
        </details>`
    : '';
  const compareStage = compare ? '<div class="compare-stage" hidden></div>' : '';
  // Explicación de la vista: vive en la columna derecha, donde el lector ya está
  // buscando el contexto de lo que ve. Las descripciones de los indicadores van
  // plegadas porque con 6 seleccionados desplazan todo lo demás fuera de pantalla.
  const compareAside = compare
    ? `<div class="compare-aside" hidden>
          <div class="compare-howto">
            <h5>Cómo leer esta vista</h5>
            <p>Cada <strong>fila</strong> es una alcaldía y cada <strong>columna</strong> un indicador.</p>
            <ul class="compare-howto-keys">
              <li><i style="background:${COMPARE_COLOR_BEST}"></i>Mejor posición</li>
              <li><i style="background:${COMPARE_COLOR_WORST}"></i>Peor posición</li>
              <li><i style="background:${COMPARE_COLOR_NEUTRAL_HIGH}"></i>Indicador descriptivo: no tiene lectura de mejor ni peor</li>
              <li><i class="compare-legend-nd"></i>Sin dato. Al ordenar, esas alcaldías van al final</li>
            </ul>
            <p>El color compara cada indicador <strong>contra sí mismo</strong> —la posición que ocupa la alcaldía entre todas las que tienen dato—, nunca entre columnas: un porcentaje, unas horas por semana y una tasa por 100 mil no son equivalentes.</p>
            <p class="compare-howto-actions">Clic en un <strong>encabezado</strong> para ordenar por ese indicador. Clic en una <strong>fila</strong> para ver el perfil completo de la alcaldía, abajo.</p>
          </div>
          <details class="compare-what">
            <summary><span>¿Qué miden estos indicadores?</span><span class="compare-what-count"></span></summary>
            <div class="compare-what-list"></div>
          </details>
        </div>`
    : '';
  return `
    <div class="mexico-map-layout">
      <div class="chart-wrap mexico-map-wrap">
        <div class="mexico-map-toolbar">
          <label class="indicator-select-label" for="indicator-select">Indicador</label>
          <select id="indicator-select" class="indicator-select"></select>
          ${comparePicker}
          <div class="view-toggle" role="group" aria-label="Tipo de visualización">
            <button type="button" class="view-btn active" data-view="map">Mapa</button>
            <button type="button" class="view-btn" data-view="bars">Barras</button>
            ${compareBtn}
          </div>
        </div>
        <div class="mexico-map-stage">
          <svg class="chart-svg mexico-map-svg" role="img" aria-label="Mapa de México por entidad"></svg>
          <div class="bars-stage" hidden></div>
          ${compareStage}
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
        ${compareAside}
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
  const mapGradientLabels = container.querySelectorAll('.map-gradient span');
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
    const subset = rows.filter((r) => r.Variable === variable);
    const byEntity = new Map(subset.map((r) => [normalizeStateName(r.Entidad), Number(r.Valor)]));
    const values = subset.map((r) => Number(r.Valor));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const description = subset.find((r) => typeof r.Que_mide === 'string' && r.Que_mide.trim())?.Que_mide || 'Sin descripción.';
    const unit = subset.find((r) => typeof r.Unidad === 'string' && r.Unidad.trim())?.Unidad || 'Porcentaje';
    const normalizedUnit = unit.toLowerCase();
    const showIntegerValues = normalizedVariable.includes('permiso de paternidad')
      || normalizedVariable.includes('permisos de paternidad');
    const formatIndicatorValue = (value) => showIntegerValues ? String(Math.round(value)) : value.toFixed(1);
    const formatMapValue = (value) => showIntegerValues ? String(Math.round(value)) : value.toFixed(2);
    const source = subset.find((r) => typeof r.Fuente === 'string' && r.Fuente.trim())?.Fuente || '';
    const hidePercentSymbol = shouldHidePercentSymbol(variable);
    const unitSymbol = isSexualOffenses
      ? ''
      : hidePercentSymbol
        ? ''
      : (normalizedUnit.includes('porcent') || normalizedUnit.includes('tasa')) ? '%' : unit;
    if (mapGradientLabels.length >= 2 && Number.isFinite(min) && Number.isFinite(max)) {
      mapGradientLabels[0].textContent = `${formatIndicatorValue(min)}${unitSymbol}`;
      mapGradientLabels[1].textContent = `${formatIndicatorValue(max)}${unitSymbol}`;
    }
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
          unitSymbol,
          unit
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
        const rowIntegerValue = rowVariable.includes('permiso de paternidad')
          || rowVariable.includes('permisos de paternidad');
        const hideRowPercentSymbol = shouldHidePercentSymbol(r.Variable);
        const uRaw = (r.Unidad || '');
        const uNormalized = uRaw.toLowerCase();
        const u = rowVariable.includes('delitos sexuales') || hideRowPercentSymbol
          ? ''
          : (uNormalized.includes('porcent') || uNormalized.includes('tasa')) ? '%' : uRaw;
        const rowValue = rowIntegerValue ? String(Math.round(Number(r.Valor))) : formatIndicatorValue(Number(r.Valor));
        return `<li><span class="entity-indicator-name">${r.Variable}</span><strong class="entity-indicator-value">${rowValue}${escapeHtml(u)}</strong></li>`;
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
          track('entity_select', { entity: node.dataset.label || node.dataset.stateKey, section: 'entidad', variable });
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
      track('view_toggle', { view_type: selectedView, section: 'entidad', variable: select.value });
      renderIndicator(select.value);
    });
  });
  select.addEventListener('change', () => {
    track('indicator_select', { variable: select.value, section: 'entidad' });
    renderIndicator(select.value);
  });
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
  const mapGradientLabels = container.querySelectorAll('.map-gradient span');
  const sideTopTitle = container.querySelector('.indicator-side-subtitle');
  const entityProfileName = container.querySelector('.entity-profile-name');
  const entityProfileList = container.querySelector('.entity-profile-list');
  const selectLabel = container.querySelector('.indicator-select-label');
  const comparePicker = container.querySelector('.compare-picker');
  const comparePickerPanel = container.querySelector('.compare-picker-panel');
  const comparePickerCount = container.querySelector('.compare-picker-count');
  const compareStage = container.querySelector('.compare-stage');
  const indicatorWhatBox = container.querySelector('.indicator-what-box');
  const compareAside = container.querySelector('.compare-aside');
  const compareWhatList = container.querySelector('.compare-what-list');
  const compareWhatCount = container.querySelector('.compare-what-count');
  if (!rows.length || !select || !svg || !barsStage || !mapWrap || !indicatorSide || !sideTitle || !sideDesc || !sideMeta || !sideTop || !indicatorSource || !sideTopTitle || !entityProfileName || !entityProfileList) {
    container.innerHTML = '<div class="chart-wrap">No hay datos disponibles para el mapa de alcaldías.</div>';
    return;
  }

  sideTopTitle.textContent = 'Alcaldías con mejor desempeño';

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

  // Universo de alcaldías: se toma de todas las filas, no del indicador activo,
  // para que la matriz muestre siempre las 16 y el dato faltante se vea como tal.
  const allEntities = Array.from(
    new Map(rows.map((r) => [normalizeAlcaldiaName(r.Entidad), r.Entidad])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1], 'es'));
  const entityCount = allEntities.length;

  // Metadatos por indicador, calculados una sola vez.
  const metaByVariable = new Map(variables.map((variable) => {
    const subset = rows.filter((r) => r.Variable === variable);
    const unit = subset.find((r) => String(r.Unidad || '').trim())?.Unidad || 'Valor';
    return [variable, {
      variable,
      subset,
      sortedValues: subset.map((r) => Number(r.Valor)).sort((a, b) => a - b),
      byEntity: new Map(subset.map((r) => [normalizeAlcaldiaName(r.Entidad), Number(r.Valor)])),
      coverage: subset.length,
      direction: getVariableDirection(variable),
      unit,
      symbol: resolveUnitSymbol(variable, unit),
      description: subset.find((r) => String(r.Que_mide || '').trim())?.Que_mide || 'Sin descripción.',
      source: subset.find((r) => String(r.Fuente || '').trim())?.Fuente || ''
    }];
  }));

  // Estado de la vista Comparar.
  let selectedIndicators = COMPARE_DEFAULT_INDICATORS.filter((v) => metaByVariable.has(v));
  if (!selectedIndicators.length) selectedIndicators = variables.slice(0, 3);
  let compareSort = { variable: selectedIndicators[0] || null, dir: 'desc' };

  // Perfil completo de la alcaldía seleccionada. Lo comparten las tres vistas:
  // el clic en un estado del mapa, en una barra o en una fila de la matriz lo
  // actualiza igual.
  const renderEntityProfile = (fallbackName) => {
    const selectedRows = rows
      .filter((r) => normalizeAlcaldiaName(r.Entidad) === selectedKey)
      .slice()
      .sort((a, b) => a.Variable.localeCompare(b.Variable, 'es'));
    entityProfileName.textContent = selectedRows[0]?.Entidad || fallbackName || 'Alcaldía';
    entityProfileList.innerHTML = selectedRows
      .map((r) => {
        const u = resolveUnitSymbol(r.Variable, r.Unidad);
        return `<li><span class="entity-indicator-name">${escapeHtml(r.Variable)}</span><strong class="entity-indicator-value">${Number(r.Valor).toFixed(1)}${escapeHtml(u)}</strong></li>`;
      })
      .join('');
  };

  const renderIndicator = (variable) => {
    const normalizedVariable = normalizeCountry(variable);
    const isSexualOffenses = normalizedVariable.includes('delitos sexuales');
    const subset = rows.filter((r) => r.Variable === variable);
    const byEntity = new Map(subset.map((r) => [normalizeAlcaldiaName(r.Entidad), Number(r.Valor)]));
    const values = subset.map((r) => Number(r.Valor));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const description = subset.find((r) => typeof r.Que_mide === 'string' && r.Que_mide.trim())?.Que_mide || 'Sin descripción.';
    const unit = subset.find((r) => typeof r.Unidad === 'string' && r.Unidad.trim())?.Unidad || 'Valor';
    const normalizedUnit = unit.toLowerCase();
    const showIntegerValues = normalizedVariable.includes('permiso de paternidad')
      || normalizedVariable.includes('permisos de paternidad');
    const formatIndicatorValue = (value) => showIntegerValues ? String(Math.round(value)) : value.toFixed(1);
    const formatMapValue = (value) => showIntegerValues ? String(Math.round(value)) : value.toFixed(2);
    const source = subset.find((r) => typeof r.Fuente === 'string' && r.Fuente.trim())?.Fuente || '';
    const hidePercentSymbol = shouldHidePercentSymbol(variable);
    const unitSymbol = isSexualOffenses
      ? ''
      : hidePercentSymbol
        ? ''
      : (normalizedUnit.includes('porcent') || normalizedUnit.includes('tasa')) ? '%' : '';
    if (mapGradientLabels.length >= 2 && Number.isFinite(min) && Number.isFinite(max)) {
      mapGradientLabels[0].textContent = `${formatIndicatorValue(min)}${unitSymbol}`;
      mapGradientLabels[1].textContent = `${formatIndicatorValue(max)}${unitSymbol}`;
    }
    const higherIsBetter = isHigherValueBetter(variable);
    // Los indicadores descriptivos no admiten lectura de logro: se ordenan igual,
    // pero el encabezado no afirma que estar arriba sea "mejor".
    sideTopTitle.textContent = getVariableDirection(variable) === 'neutral'
      ? 'Alcaldías con el valor más alto'
      : 'Alcaldías con mejor desempeño';
    const sortedItems = subset.slice().sort((a, b) => higherIsBetter ? b.Valor - a.Valor : a.Valor - b.Valor);

    if (!selectedKey || !byEntity.has(selectedKey)) {
      selectedKey = sortedItems.length ? normalizeAlcaldiaName(sortedItems[0].Entidad) : '';
    }

    const mapVisible = selectedView === 'map';
    setIndicatorStageView(svg, barsStage, selectedView, compareStage);

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
          unitSymbol,
          unit
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
    const sourceText = source
      ? (/^fuente:/i.test(source.trim()) ? source.trim() : `Fuente: ${source.trim()}`)
      : '';
    const cdmxSourceWithNote = sourceText ? `${CDMX_COMMON_NOTE} ${sourceText}` : CDMX_COMMON_NOTE;
    indicatorSource.innerHTML = formatSourceWithNoteBreak(cdmxSourceWithNote);
    indicatorSource.hidden = false;
    sideTop.innerHTML = sortedItems
      .map((r, i) => {
        const key = normalizeAlcaldiaName(r.Entidad);
        const activeClass = key === selectedKey ? 'active' : '';
        return `<li class="${activeClass}" data-state-key="${escapeHtml(key)}"><span>${i + 1}. ${r.Entidad}</span><strong>${formatIndicatorValue(Number(r.Valor))}${unitSymbol}</strong></li>`;
      })
      .join('');

    renderEntityProfile(sortedItems[0]?.Entidad);

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
          track('entity_select', { entity: node.dataset.label || node.dataset.stateKey, section: 'cdmx', variable });
          selectedKey = node.dataset.stateKey || selectedKey;
          renderIndicator(variable);
        });
        node.addEventListener('mouseleave', () => {
          tooltip.hidden = true;
        });
      });
    }
  };

  // ── Panel lateral de la vista Comparar ───────────────────────────────────
  const renderCompareSide = () => {
    const metas = selectedIndicators.map((v) => metaByVariable.get(v)).filter(Boolean);
    sideTitle.textContent = metas.length === 1
      ? metas[0].variable
      : `${metas.length} indicadores comparados`;
    if (compareWhatList) {
      compareWhatList.innerHTML = metas.length
        ? metas.map((m) => `<p class="compare-desc-item"><strong>${escapeHtml(m.variable)}.</strong> ${escapeHtml(m.description)}</p>`).join('')
        : '<p class="compare-desc-item">Selecciona indicadores para comparar.</p>';
    }
    if (compareWhatCount) compareWhatCount.textContent = metas.length ? String(metas.length) : '';

    const partial = metas.filter((m) => m.coverage < entityCount);
    sideMeta.textContent = partial.length
      ? `Cobertura incompleta en ${partial.length} de ${metas.length} indicadores: ${partial.map((m) => `${m.variable} (${m.coverage}/${entityCount})`).join(', ')}.`
      : `Cobertura completa: ${entityCount} alcaldías en los ${metas.length} indicadores.`;

    const sources = Array.from(new Set(metas.map((m) => m.source).filter(Boolean)));
    const sourceText = sources.length ? `Fuente: ${sources.join(' | ')}` : '';
    indicatorSource.innerHTML = formatSourceWithNoteBreak(
      sourceText ? `${CDMX_COMMON_NOTE} ${sourceText}` : CDMX_COMMON_NOTE
    );
    indicatorSource.hidden = false;

    if (!selectedKey && allEntities.length) selectedKey = allEntities[0][0];
    renderEntityProfile(allEntities[0]?.[1]);
  };

  // ── Matriz alcaldías × indicadores ───────────────────────────────────────
  // El color de cada celda sale del percentil del valor DENTRO de su columna, no
  // del valor absoluto: es la única forma honesta de poner lado a lado columnas
  // en porcentaje, en horas y en tasas por 100 mil.
  const renderCompare = () => {
    setIndicatorStageView(svg, barsStage, 'compare', compareStage);
    svg.innerHTML = '';
    barsStage.innerHTML = '';

    if (!selectedIndicators.length) {
      compareStage.innerHTML = '<p class="compare-empty">Selecciona al menos un indicador para comparar.</p>';
      renderCompareSide();
      return;
    }

    const metas = selectedIndicators.map((v) => metaByVariable.get(v)).filter(Boolean);
    const sortMeta = compareSort.variable ? metaByVariable.get(compareSort.variable) : null;

    // Las alcaldías sin dato en la columna de orden van siempre al final, para no
    // mezclarlas con valores reales bajos.
    const ordered = allEntities.slice().sort(([keyA, nameA], [keyB, nameB]) => {
      if (!sortMeta) return nameA.localeCompare(nameB, 'es');
      const a = sortMeta.byEntity.get(keyA);
      const b = sortMeta.byEntity.get(keyB);
      const aOk = Number.isFinite(a);
      const bOk = Number.isFinite(b);
      if (!aOk && !bOk) return nameA.localeCompare(nameB, 'es');
      if (!aOk) return 1;
      if (!bOk) return -1;
      return compareSort.dir === 'asc' ? a - b : b - a;
    });

    const thead = metas.map((m) => {
      const isSorted = compareSort.variable === m.variable;
      const arrow = isSorted ? (compareSort.dir === 'asc' ? '▲' : '▼') : '';
      const badges = [
        m.direction === 'neutral'
          ? '<span class="compare-badge neutral" title="Indicador descriptivo: no tiene lectura de mejor o peor">descriptivo</span>'
          : '',
        m.coverage < entityCount
          ? `<span class="compare-badge partial" title="Solo hay dato para ${m.coverage} de ${entityCount} alcaldías">${m.coverage}/${entityCount}</span>`
          : ''
      ].join('');
      return `<th scope="col" class="${isSorted ? 'sorted' : ''}">
        <button type="button" class="compare-sort" data-sort-var="${escapeHtml(m.variable)}"
                title="${escapeHtml(m.description)}"
                aria-label="Ordenar por ${escapeHtml(m.variable)}">
          <span class="compare-th-name">${escapeHtml(m.variable)}</span>
          <span class="compare-th-meta">${escapeHtml(m.unit)}<span class="compare-th-arrow">${arrow}</span></span>
          <span class="compare-th-badges">${badges}</span>
        </button>
      </th>`;
    }).join('');

    const tbody = ordered.map(([key, name]) => {
      const cells = metas.map((m) => {
        const value = m.byEntity.get(key);
        if (!Number.isFinite(value)) {
          return '<td class="compare-cell nd" title="Sin dato disponible para esta alcaldía"><span>s/d</span></td>';
        }
        const pct = percentileRank(value, m.sortedValues);
        const tip = `${name} — ${m.variable}: ${value.toFixed(1)}${m.symbol} · percentil ${Math.round(pct * 100)} entre las ${m.coverage} alcaldías con dato`;
        return `<td class="compare-cell" style="background:${compareCellColor(pct, m.direction)}" title="${escapeHtml(tip)}"><span>${value.toFixed(1)}${escapeHtml(m.symbol)}</span></td>`;
      }).join('');
      return `<tr data-state-key="${escapeHtml(key)}" class="${key === selectedKey ? 'selected' : ''}"><th scope="row" class="compare-rowhead">${escapeHtml(name)}</th>${cells}</tr>`;
    }).join('');

    compareStage.innerHTML = `
      <div class="compare-scroll">
        <table class="compare-table">
          <caption class="sr-only">Comparación de ${metas.length} indicadores en ${entityCount} alcaldías de la Ciudad de México</caption>
          <thead><tr><th scope="col" class="compare-corner">Alcaldía</th>${thead}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
      <p class="compare-hint" aria-hidden="true"><span class="compare-hint-mobile">Desliza la tabla para ver todos los indicadores · </span>Clic en un encabezado para ordenar · clic en una fila para ver el perfil completo</p>`;

    compareStage.querySelectorAll('.compare-sort').forEach((btn) => {
      btn.addEventListener('click', () => {
        const variable = btn.dataset.sortVar;
        if (compareSort.variable === variable) {
          compareSort.dir = compareSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          compareSort = { variable, dir: 'desc' };
        }
        track('compare_sort', { variable, direction: compareSort.dir, section: 'cdmx' });
        renderCompare();
      });
    });

    compareStage.querySelectorAll('tr[data-state-key]').forEach((row) => {
      row.addEventListener('click', () => {
        selectedKey = row.dataset.stateKey || selectedKey;
        track('entity_select', { entity: row.querySelector('.compare-rowhead')?.textContent, section: 'cdmx', view: 'compare' });
        renderCompare();
      });
    });

    renderCompareSide();
  };

  // ── Selector múltiple de indicadores ─────────────────────────────────────
  const renderPicker = () => {
    if (!comparePickerPanel || !comparePickerCount) return;
    const atLimit = selectedIndicators.length >= COMPARE_MAX_INDICATORS;
    comparePickerPanel.innerHTML = variables.map((variable) => {
      const m = metaByVariable.get(variable);
      const checked = selectedIndicators.includes(variable);
      const disabled = !checked && atLimit;
      return `<label class="compare-option${disabled ? ' disabled' : ''}">
        <input type="checkbox" value="${escapeHtml(variable)}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''} />
        <span class="compare-option-name">${escapeHtml(variable)}</span>
        ${m.coverage < entityCount ? `<span class="compare-badge partial" title="Cobertura parcial">${m.coverage}/${entityCount}</span>` : ''}
        ${m.direction === 'neutral' ? '<span class="compare-badge neutral">descriptivo</span>' : ''}
      </label>`;
    }).join('');
    comparePickerCount.textContent = `${selectedIndicators.length} de ${COMPARE_MAX_INDICATORS}`;
  };

  if (comparePickerPanel) {
    comparePickerPanel.addEventListener('change', (event) => {
      const input = event.target;
      if (!input || input.type !== 'checkbox') return;
      const value = input.value;
      if (input.checked) {
        if (!selectedIndicators.includes(value) && selectedIndicators.length < COMPARE_MAX_INDICATORS) {
          selectedIndicators = [...selectedIndicators, value];
        }
      } else {
        selectedIndicators = selectedIndicators.filter((v) => v !== value);
      }
      if (!selectedIndicators.includes(compareSort.variable)) {
        compareSort = { variable: selectedIndicators[0] || null, dir: 'desc' };
      }
      track('compare_indicators', { count: selectedIndicators.length, section: 'cdmx' });
      renderPicker();
      renderCompare();
    });

    document.addEventListener('click', (event) => {
      if (comparePicker?.open && !comparePicker.contains(event.target)) comparePicker.open = false;
    });
  }

  // ── Despachador de vistas ────────────────────────────────────────────────
  const applyViewMode = () => {
    const compareMode = selectedView === 'compare';
    if (selectLabel) selectLabel.hidden = compareMode;
    select.hidden = compareMode;
    if (comparePicker) {
      comparePicker.hidden = !compareMode;
      if (!compareMode) comparePicker.open = false;
    }
    // En Comparar, el "¿Qué mide?" de un solo indicador cede su lugar al bloque
    // que explica la vista y agrupa las descripciones de los seleccionados.
    if (indicatorWhatBox) indicatorWhatBox.hidden = compareMode;
    if (compareAside) compareAside.hidden = !compareMode;
    // El ranking lateral y el gradiente describen un solo indicador.
    if (sideTopTitle) sideTopTitle.hidden = compareMode;
    if (sideTop) sideTop.hidden = compareMode;
  };

  const render = () => {
    applyViewMode();
    if (selectedView === 'compare') {
      renderPicker();
      renderCompare();
    } else {
      renderIndicator(select.value);
    }
  };

  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      selectedView = view === 'bars' ? 'bars' : view === 'compare' ? 'compare' : 'map';
      viewButtons.forEach((b) => b.classList.toggle('active', b === btn));
      track('view_toggle', { view_type: selectedView, section: 'cdmx', variable: select.value });
      render();
    });
  });
  select.addEventListener('change', () => {
    track('indicator_select', { variable: select.value, section: 'cdmx' });
    renderIndicator(select.value);
  });
  render();
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
  const firstKey = items[0]?.key || '';
  const lastKey = items[items.length - 1]?.key || '';
  container.className = 'bars-stage';
  container.innerHTML = `
    <p class="bars-scroll-hint" aria-hidden="true">Desliza para ver el gráfico completo →</p>
    <div class="vbars-scroll">
      <div class="vbars-plot" style="--bar-count:${items.length};">
        ${items.map((item) => {
          const pct = (item.value / max) * 100;
          const active = item.key === selectedKey ? 'active' : '';
          const label = String(item.label || '').trim();
          const displayValue = typeof item.displayValue === 'string' ? item.displayValue : item.value.toFixed(1);
          const isMax = item.key === firstKey;
          const isMin = item.key === lastKey;
          const isExtremal = isMin || isMax;
          const extremal = isExtremal ? ' data-extremal="1"' : '';
          const extremalClass = isMax ? ' is-max' : (isMin ? ' is-min' : '');
          const unitText = item.unitSymbol || (item.unit ? ` ${item.unit}` : '');
          return `<button
            type="button"
            class="vbar-col ${active}"
            data-key="${escapeHtml(item.key)}"
            data-label="${escapeHtml(label)}"
            data-value-text="${escapeHtml(`${displayValue}${unitText}`)}"
          >
            <span class="vbar-label">${escapeHtml(label)}</span>
            <span class="vbar-track">
              ${isExtremal ? `<span class="vbar-extremal-value${extremalClass}" style="--bar-pct:${pct}%;">${escapeHtml(`${displayValue}${item.unitSymbol}`)}</span>` : ''}
              <span class="vbar-fill"${extremal} data-value="${escapeHtml(`${displayValue}${item.unitSymbol}`)}" style="--bar-pct:${pct}%;"></span>
            </span>
            <strong class="vbar-value">${displayValue}${escapeHtml(item.unitSymbol)}</strong>
          </button>`;
        }).join('')}
      </div>
    </div>
  `;

  const tooltip = getSharedChartTooltip();
  container.querySelectorAll('button[data-key]').forEach((btn) => {
    btn.addEventListener('mousemove', (event) => {
      const label = btn.dataset.label || 'Entidad';
      const valueText = btn.dataset.valueText || 'Sin dato';
      tooltip.innerHTML = `
        <div class="chart-tooltip-title">${escapeHtml(label)}</div>
        <div class="chart-tooltip-row">
          <span class="chart-tooltip-dot" style="background:#208070"></span>
          <span>${escapeHtml(valueText)}</span>
        </div>
      `;
      tooltip.hidden = false;
      positionSharedTooltip(tooltip, event.clientX, event.clientY);
    });
    btn.addEventListener('click', () => {
      onSelect(btn.dataset.key || '');
    });
    btn.addEventListener('mouseleave', () => {
      tooltip.hidden = true;
    });
  });
}

// Alterna visualización "Mapa" <-> "Barras", renderizando una sola a la vez.
// `view` acepta 'map' | 'bars' | 'compare'. Sigue admitiendo el booleano que
// usan los mapas de Entidad y STEM (true = mapa).
function setIndicatorStageView(svg, barsStage, view, compareStage = null) {
  const resolved = typeof view === 'boolean' ? (view ? 'map' : 'bars') : view;
  const mapVisible = resolved === 'map';
  const barsVisible = resolved === 'bars';
  const compareVisible = resolved === 'compare';

  svg.hidden = !mapVisible;
  svg.style.display = mapVisible ? 'block' : 'none';
  barsStage.hidden = !barsVisible;
  barsStage.style.display = barsVisible ? 'grid' : 'none';
  if (compareStage) {
    compareStage.hidden = !compareVisible;
    compareStage.style.display = compareVisible ? 'flex' : 'none';
  }

  const mapWrap = svg.closest('.mexico-map-wrap');
  if (mapWrap) {
    mapWrap.classList.toggle('bars-view', barsVisible);
    mapWrap.classList.toggle('compare-view', compareVisible);
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

// Dirección de lectura de un indicador: si un valor alto es mejor, peor, o si el
// indicador es puramente descriptivo y no admite juicio.
function getVariableDirection(variableName) {
  const normalized = normalizeCountry(variableName);
  const key = VARIABLE_DIRECTION_ALIASES[normalized] || normalized;
  if (NEUTRAL_DIRECTION_VARIABLES.has(key)) return 'neutral';
  return isHigherValueBetter(variableName) ? 'higher-better' : 'lower-better';
}

// Símbolo de unidad derivado del campo Unidad del dataset.
// Las excepciones por nombre son un puente mientras el Sheet marque "Porcentaje"
// en indicadores que son tasas por 100 mil u horas por semana; una vez corregido
// el origen, este bloque se reduce a la lectura de `unidad`.
function resolveUnitSymbol(variableName, unidad) {
  const u = String(unidad || '').toLowerCase();
  if (u.includes('hora')) return ' h';
  if (u.includes('100 mil') || u.includes('100mil') || u.includes('cada 100')) return '';
  if (shouldHidePercentSymbol(variableName)) return '';
  if (normalizeCountry(variableName).includes('delitos sexuales')) return '';
  if (u.includes('porcent') || u.includes('tasa')) return '%';
  return '';
}

// Percentil (0..1) del valor dentro de su propio indicador.
// Comparar 16 alcaldías con unidades distintas (%, horas, tasas por 100 mil) solo
// es honesto sobre una escala de rango: el percentil vuelve comparables columnas
// que en valor absoluto no lo son. Los empates comparten posición promedio.
function percentileRank(value, sortedValues) {
  const n = sortedValues.length;
  if (n <= 1) return 0.5;
  let below = 0;
  let equal = 0;
  for (const v of sortedValues) {
    if (v < value) below += 1;
    else if (v === value) equal += 1;
  }
  return (below + (equal - 1) / 2) / (n - 1);
}

// Color de celda de la matriz: divergente para indicadores con dirección,
// monocromo para los descriptivos.
function compareCellColor(percentile, direction) {
  if (direction === 'neutral') {
    return mixHex(COMPARE_COLOR_NEUTRAL_LOW, COMPARE_COLOR_NEUTRAL_HIGH, percentile);
  }
  const goodness = direction === 'higher-better' ? percentile : 1 - percentile;
  return goodness >= 0.5
    ? mixHex(COMPARE_COLOR_MID, COMPARE_COLOR_BEST, (goodness - 0.5) * 2)
    : mixHex(COMPARE_COLOR_MID, COMPARE_COLOR_WORST, (0.5 - goodness) * 2);
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
  const values = series.flatMap((s) => s.values).filter((v) => v !== null && Number.isFinite(Number(v)));
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
      <text x="10" y="${yPos + 4}" font-size="13" fill="#7b809a">${value.toFixed(0)}${data.unit || ''}</text>`;
  }).join('');

  const skipStep = isNarrow ? Math.ceil(labels.length / 5) : Math.ceil(labels.length / 10);
  const xTicks = labels.map((label, i) => {
    if (i % skipStep !== 0 && i !== labels.length - 1) return '';
    return `<text x="${x(i)}" y="${height - 10}" font-size="13" fill="#7b809a" text-anchor="middle">${label}</text>`;
  }).join('');

  const lines = series.map((line) => {
    const path = line.values.reduce((acc, value, i) => {
      if (value === null || !Number.isFinite(Number(value))) return acc;
      return `${acc}${acc === '' ? 'M' : ' L'}${x(i)},${y(value)}`;
    }, '');
    const points = line.values.map((value, i) => {
      if (value === null || !Number.isFinite(Number(value))) return '';
      return `
      <circle cx="${x(i)}" cy="${y(value)}" r="4.2" fill="${line.color}" class="line-point" />
      <circle
        cx="${x(i)}"
        cy="${y(value)}"
        r="13.5"
        fill="transparent"
        class="line-hit"
        data-label="${escapeHtml(labels[i])}"
        data-series="${escapeHtml(line.name)}"
        data-value="${Number(value).toFixed(2)}"
        data-unit="${escapeHtml(unit)}"
        data-color="${line.color}"
        data-cx="${x(i)}"
      />
    `;
    }).join('');
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
    const total = series.reduce((sum, s) => sum + Number(s.values[i] || 0), 0);
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
        data-total="${total.toFixed(2)}"
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
      const totalValue = Number(segment.dataset.total || 0);

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
        <div class="chart-tooltip-row">
          <span class="chart-tooltip-dot" style="background:#1f2340"></span>
          <span>Total: ${totalValue.toFixed(1)}${escapeHtml(unit)}</span>
        </div>
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

  if (section.key === 'stem-pisa-historico') {
    const grafica = data?.graficas?.find((g) => g.id === 'historico_pisa');
    if (!grafica) return data;
    const allVals = grafica.series.flatMap((s) => s.datos.filter((v) => v !== null && Number.isFinite(v)));
    return {
      unit: '',
      min: Math.floor(Math.min(...allVals) / 10) * 10 - 10,
      max: Math.ceil(Math.max(...allVals) / 10) * 10 + 10,
      labels: grafica.categorias,
      source: grafica.fuente || '',
      series: grafica.series.map((s) => ({
        name: s.nombre,
        color: s.color,
        values: s.datos.map((v) => (v === null || !Number.isFinite(v)) ? null : Number(v))
      }))
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

// ── STEM renderers ────────────────────────────────────────────────────────────

// Áreas STEM (normalizadas) para resaltarlas en el gráfico de matrícula.
const STEM_AREAS = new Set([
  'ciencias naturales matematicas y estadistica',
  'ingenieria manufactura y construccion',
  'tecnologias de la informacion'
]);

function wrapStemLabelLines(label, maxCharsPerLine = 26) {
  return String(label || '')
    .split('\n')
    .flatMap((segment) => {
      const words = segment.trim().split(/\s+/).filter(Boolean);
      if (!words.length) return [''];

      const lines = [];
      let currentLine = '';

      words.forEach((word) => {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;
        if (nextLine.length <= maxCharsPerLine) {
          currentLine = nextLine;
          return;
        }
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      });

      if (currentLine) lines.push(currentLine);
      return lines;
    });
}

// Barras horizontales agrupadas: nivel de desempeño en matemáticas por sexo.
function renderStemNivelMatematicas(data) {
  const grafica = data?.graficas?.find((g) => g.id === 'nivel_matematicas');
  if (!grafica) return '<div class="chart-wrap">Sin datos disponibles.</div>';

  const cats = [...grafica.categorias].reverse();
  const series = grafica.series
    .map((serie) => ({
      ...serie,
      datos: [...serie.datos].reverse()
    }))
    .sort((a, b) => {
      if (a.nombre === 'Mujeres') return -1;
      if (b.nombre === 'Mujeres') return 1;
      return 0;
    });
  const source = grafica.fuente || '';

  const W = 1180;
  const barH = 46;
  const innerGap = 14;
  const catGap = 40;
  const axisX = 360;
  const labelCenterX = 170;
  const rightPad = 44;
  const barAreaW = W - axisX - rightPad;
  const padTop = 12;

  const groupH = series.length * barH + (series.length - 1) * innerGap;
  const lineHeight = 20;
  const wrappedCats = cats.map((cat) => wrapStemLabelLines(cat));
  const rowHeights = wrappedCats.map((lines) => Math.max(groupH, lines.length * lineHeight));
  const totalRowsHeight = rowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0);
  const H = padTop + totalRowsHeight + catGap * Math.max(cats.length - 1, 0) + padTop + 10;

  let cursorY = padTop;
  const svgContent = cats.flatMap((cat, ci) => {
    const lines = wrappedCats[ci];
    const rowContentH = rowHeights[ci];
    const yTop = cursorY + (rowContentH - groupH) / 2;
    const centerY = cursorY + rowContentH / 2;

    const labelLines = lines.map((line, lineIndex) => {
      const ty = centerY + (lineIndex - (lines.length - 1) / 2) * lineHeight;
      return `<text x="${labelCenterX}" y="${ty}" text-anchor="middle" dominant-baseline="middle" class="stem-hbar-label" fill="#555">${escapeHtml(line)}</text>`;
    });

    const barEls = series.map((s, si) => {
      const v = s.datos[ci];
      const bw = Math.round(v * barAreaW);
      const yB = yTop + si * (barH + innerGap);
      const pct = (v * 100).toFixed(1);
      return [
        `<rect x="${axisX}" y="${yB}" width="${bw}" height="${barH}" rx="0" fill="${s.color}"
          class="stem-hbar-fill"
          data-label="${escapeHtml(cat.replace(/\n/g, ' '))}"
          data-series="${escapeHtml(s.nombre)}"
          data-value="${(v * 100).toFixed(2)}"
          data-color="${s.color}"
          data-unit="%"/>`,
        `<text x="${axisX + bw + 10}" y="${yB + barH / 2}" dominant-baseline="middle" class="stem-hbar-value" fill="#444" font-weight="600">${pct}%</text>`
      ].join('');
    });

    cursorY += rowContentH + catGap;

    return [...labelLines, ...barEls];
  });

  const legend = series.map((s) =>
    `<span><span class="legend-dot" style="background:${s.color}"></span>${escapeHtml(s.nombre)}</span>`
  ).join('');

  return `
    <p class="stem-scroll-hint" aria-hidden="true">Desliza para ver el gráfico completo →</p>
    <div class="stem-scroll-frame">
      <div class="chart-wrap stem-bar-scroll stem-hbars-wrap">
        <div class="chart-legend stem-hbars-legend">${legend}</div>
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg stem-hbars-svg" role="img" aria-label="Nivel de desempeño en matemáticas por sexo">
          <line x1="${axisX}" y1="${padTop - 4}" x2="${axisX}" y2="${H - padTop + 2}" stroke="#d9d9e6" stroke-width="1.5"/>
          ${svgContent.join('')}
        </svg>
      </div>
    </div>
    ${source ? `<p class="chart-source">${formatSourceWithNoteBreak(source)}</p>` : ''}
  `;
}

// Barras horizontales 100% apiladas: distribución de matrícula por área.
function renderStemMatriculaArea(data) {
  const grafica = data?.graficas?.find((g) => g.id === 'matricula_por_area');
  if (!grafica) return '<div class="chart-wrap">Sin datos disponibles.</div>';

  const cats = [...grafica.categorias].reverse();
  const series = grafica.series.map((serie) => ({
    ...serie,
    datos: [...serie.datos].reverse()
  }));
  const source = grafica.fuente || '';

  const W = 1040;
  const barH = 22;
  const catGap = 8;
  const labelW = 320;
  const stemW = 44;
  const rightPad = 12;
  const barAreaW = W - labelW - stemW - rightPad;
  const padTop = 12;

  const rowH = barH + catGap;
  const H = padTop + cats.length * rowH - catGap + padTop;

  const rows = cats.map((cat, ci) => {
    const yBar = padTop + ci * rowH;
    const isStem = STEM_AREAS.has(normalizeCountry(cat));

    // Widths acumulativos para evitar gaps por redondeo
    let xOff = labelW;
    const segments = series.map((s, si) => {
      const v = s.datos[ci];
      const isLast = si === series.length - 1;
      const bw = isLast
        ? (labelW + barAreaW) - xOff
        : Math.round(v * barAreaW);
      const pct = (v * 100).toFixed(0);
      const el = [
        `<rect x="${xOff}" y="${yBar}" width="${bw}" height="${barH}" fill="${s.color}"
          class="stem-stacked-fill"
          data-label="${escapeHtml(cat)}"
          data-series="${escapeHtml(s.nombre)}"
          data-value="${(v * 100).toFixed(1)}"
          data-color="${s.color}"
          data-unit="%"/>`,
        bw > 28
          ? `<text x="${xOff + bw / 2}" y="${yBar + barH / 2}" dominant-baseline="middle" text-anchor="middle" class="stem-stacked-value" fill="white" font-weight="600" pointer-events="none">${pct}%</text>`
          : ''
      ].join('');
      xOff += bw;
      return el;
    });

    const catLabel = `<text x="${labelW - 10}" y="${yBar + barH / 2}" dominant-baseline="middle" text-anchor="end" class="stem-stacked-label" fill="${isStem ? '#6f4fe8' : '#1f2340'}" font-weight="${isStem ? '600' : '400'}">${escapeHtml(cat)}</text>`;
    const stemBadge = isStem
      ? `<text x="${labelW + barAreaW + 6}" y="${yBar + barH / 2}" dominant-baseline="middle" class="stem-stacked-badge" fill="#6f4fe8" font-weight="700">STEM</text>`
      : '';

    return [catLabel, ...segments, stemBadge].join('');
  });

  const legend = series.map((s) =>
    `<span><span class="legend-dot" style="background:${s.color}"></span>${escapeHtml(s.nombre)}</span>`
  ).join('');

  return `
    <p class="stem-scroll-hint" aria-hidden="true">Desliza para ver el gráfico completo →</p>
    <div class="stem-scroll-frame">
      <div class="chart-wrap stem-bar-scroll">
        <div class="chart-legend">${legend}</div>
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg stem-stacked-svg" role="img" aria-label="Distribución de matrícula por área de estudio">
          ${rows.join('')}
        </svg>
      </div>
    </div>
    ${source ? `<p class="chart-source">${formatSourceWithNoteBreak(source)}</p>` : ''}
  `;
}

// Cascarón HTML para un mapa choropleth STEM.
function renderStemMapShell() {
  return `
    <div class="stem-map-panel">
      <div class="stem-map-toolbar">
        <div class="view-toggle" role="group" aria-label="Tipo de visualización">
          <button type="button" class="view-btn active" data-view="map">Mapa</button>
          <button type="button" class="view-btn" data-view="bars">Barras</button>
        </div>
      </div>
      <div class="stem-map-stage mexico-map-stage">
        <svg class="chart-svg stem-choropleth" role="img"></svg>
        <div class="bars-stage" hidden></div>
      </div>
      <div class="map-gradient"><span></span><div></div><span></span></div>
      <p class="chart-source stem-map-source" hidden></p>
    </div>
  `;
}

// Renderiza un mapa choropleth STEM.
async function attachStemMap(container, data, graphId) {
  const grafica = data?.graficas?.find((g) => g.id === graphId);
  const panel = container.querySelector('.stem-map-panel');
  if (!panel || !grafica) return;

  const sourceEl = panel.querySelector('.stem-map-source');
  const svg = panel.querySelector('.stem-choropleth');
  const barsStage = panel.querySelector('.bars-stage');
  const gradLabels = panel.querySelectorAll('.map-gradient span');
  const viewButtons = Array.from(panel.querySelectorAll('.view-btn'));
  if (!svg || !barsStage) return;

  if (sourceEl && grafica.fuente) {
    sourceEl.innerHTML = formatSourceWithNoteBreak(grafica.fuente);
    sourceEl.hidden = false;
  }

  let geojson;
  try {
    geojson = await fetchJSON(MEXICO_GEOJSON_URL);
  } catch {
    container.innerHTML = '<div class="chart-wrap">No fue posible cargar el mapa de México.</div>';
    return;
  }

  const features = extractMexicoFeatures(geojson);
  if (!features.length) return;

  const W = 540;
  const H = 360;
  const featureCollection = {
    type: 'FeatureCollection',
    features
  };
  const projection = geoMercator().fitExtent([[28, 24], [W - 28, H - 34]], featureCollection);
  projection.scale(projection.scale() * 0.93);
  let pathFn = geoPath(projection);
  const [[minX, minY], [maxX, maxY]] = pathFn.bounds(featureCollection);
  const boundsCenterX = (minX + maxX) / 2;
  const boundsCenterY = (minY + maxY) / 2;
  const [tx, ty] = projection.translate();
  projection.translate([tx + (W / 2 - boundsCenterX), ty + (H / 2 - boundsCenterY) - 6]);
  pathFn = geoPath(projection);
  const tooltip = getSharedChartTooltip();
  const records = Array.isArray(grafica.datos) ? grafica.datos : [];
  const byEntity = new Map(records.map((d) => [normalizeStateName(d.entidad), d.proporcion]));
  const vals = records.map((d) => d.proporcion);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const sortedItems = records
    .map((d) => ({
      key: normalizeStateName(d.entidad),
      label: formatStateDisplayName(d.entidad),
      value: Number(d.proporcion),
      displayValue: (Number(d.proporcion) * 100).toFixed(1),
      unitSymbol: '%'
    }))
    .sort((a, b) => b.value - a.value);
  let selectedKey = sortedItems[0]?.key || '';
  let selectedView = 'map';

  if (gradLabels.length >= 2) {
    gradLabels[0].textContent = `${(minV * 100).toFixed(0)}%`;
    gradLabels[1].textContent = `${(maxV * 100).toFixed(0)}%`;
  }

  const renderCurrentView = () => {
    const mapVisible = selectedView === 'map';
    setIndicatorStageView(svg, barsStage, mapVisible);

    if (mapVisible) {
      const paths = features.map((feature) => {
        const name = getFeatureName(feature);
        const key = normalizeStateName(name);
        const value = byEntity.get(key);
        const fill = Number.isFinite(value) ? colorFromValue(value, minV, maxV) : '#eceaf5';
        const d = pathFn(feature);
        if (!d) return '';
        const displayName = formatStateDisplayName(name);
        const pct = Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'Sin dato';
        const activeClass = key === selectedKey ? ' selected-state' : '';
        return `<path d="${d}" fill="${fill}" stroke="#ffffff" stroke-width="0.8"
          class="stem-map-path${activeClass}"
          data-state-key="${escapeHtml(key)}"
          data-label="${escapeHtml(displayName)}"
          data-value="${escapeHtml(pct)}"
        />`;
      }).join('');

      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('aria-label', grafica.titulo || 'Mapa STEM');
      svg.innerHTML = `<rect x="0" y="0" width="${W}" height="${H}" fill="#f8f7fe" rx="12"/>${paths}`;

      svg.querySelectorAll('.stem-map-path').forEach((path) => {
        path.addEventListener('mousemove', (e) => {
          tooltip.innerHTML = `
            <div class="chart-tooltip-title">${escapeHtml(path.dataset.label || '')}</div>
            <div class="chart-tooltip-row">
              <span class="chart-tooltip-dot" style="background:#6f4fe8"></span>
              <span>${escapeHtml(path.dataset.value || 'Sin dato')}</span>
            </div>
          `;
          tooltip.hidden = false;
          positionSharedTooltip(tooltip, e.clientX, e.clientY);
        });
        path.addEventListener('click', () => {
          selectedKey = path.dataset.stateKey || selectedKey;
          renderCurrentView();
        });
        path.addEventListener('mouseleave', () => { tooltip.hidden = true; });
      });
    } else {
      renderBarsStage(barsStage, sortedItems, selectedKey, (nextKey) => {
        selectedKey = nextKey;
        renderCurrentView();
      });
      svg.innerHTML = '';
    }
  };

  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedView = btn.dataset.view === 'bars' ? 'bars' : 'map';
      viewButtons.forEach((b) => b.classList.toggle('active', b === btn));
      renderCurrentView();
    });
  });

  renderCurrentView();
}

// Barras verticales agrupadas: indicadores del mercado laboral STEM.
function renderStemMercadoLaboral(data) {
  const grafica = data?.graficas?.find((g) => g.id === 'mercado_laboral_stem');
  if (!grafica) return '<div class="chart-wrap">Sin datos disponibles.</div>';

  const cats = grafica.categorias;
  const series = grafica.series;
  const source = grafica.fuente || '';

  const W = 920;
  const H = 310;
  const margin = { top: 22, right: 20, bottom: 58, left: 52 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const maxVal = Math.max(...series.flatMap((s) => s.datos));
  const yScale = (v) => margin.top + innerH - (v / (maxVal * 1.15)) * innerH;
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].filter((t) => t <= maxVal * 1.12);

  const grid = yTicks.map((v) => {
    const yPos = yScale(v);
    return `<line x1="${margin.left}" y1="${yPos}" x2="${W - margin.right}" y2="${yPos}" stroke="#ece9f8"/>
      <text x="${margin.left - 6}" y="${yPos}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="#7b809a">${(v * 100).toFixed(0)}%</text>`;
  }).join('');

  const groupW = innerW / cats.length;
  const barW = Math.min(52, Math.floor((groupW / series.length) * 0.88));
  const barGroupTotalW = series.length * barW + (series.length - 1) * 4;

  const bars = cats.flatMap((cat, ci) => {
    const groupCx = margin.left + ci * groupW + groupW / 2;
    const startX = groupCx - barGroupTotalW / 2;

    const catBars = series.map((s, si) => {
      const v = s.datos[ci];
      const xB = startX + si * (barW + 4);
      const yB = yScale(v);
      const bh = margin.top + innerH - yB;
      const pct = (v * 100).toFixed(0);
      return [
        `<rect x="${xB}" y="${yB}" width="${barW}" height="${bh}" rx="4" fill="${s.color}"
          class="stem-gbar-fill"
          data-label="${escapeHtml(cat)}"
          data-series="${escapeHtml(s.nombre)}"
          data-value="${(v * 100).toFixed(1)}"
          data-color="${s.color}"
          data-unit="%"/>`,
        `<text x="${xB + barW / 2}" y="${yB - 4}" text-anchor="middle" font-size="10" fill="${s.color}" font-weight="600">${pct}%</text>`
      ].join('');
    });

    // Split long labels onto two lines
    const labelParts = cat.length > 16
      ? (() => {
          const mid = Math.floor(cat.length / 2);
          let l = mid, r = mid;
          while (l > 0 && cat[l] !== ' ') l--;
          while (r < cat.length && cat[r] !== ' ') r++;
          const split = (mid - l <= r - mid) ? l : r;
          return split > 0 && split < cat.length
            ? [cat.slice(0, split).trim(), cat.slice(split).trim()]
            : [cat];
        })()
      : [cat];
    const labelY = H - margin.bottom + 14;
    const catLabel = labelParts.length === 2
      ? `<text x="${groupCx}" text-anchor="middle" font-size="10" fill="#1f2340">
          <tspan x="${groupCx}" y="${labelY}">${escapeHtml(labelParts[0])}</tspan>
          <tspan x="${groupCx}" dy="12">${escapeHtml(labelParts[1])}</tspan>
         </text>`
      : `<text x="${groupCx}" y="${labelY}" text-anchor="middle" font-size="10" fill="#1f2340">${escapeHtml(cat)}</text>`;
    return [...catBars, catLabel];
  });

  const legend = series.map((s) =>
    `<span><span class="legend-dot" style="background:${s.color}"></span>${escapeHtml(s.nombre)}</span>`
  ).join('');

  return `
    <p class="stem-scroll-hint" aria-hidden="true">Desliza para ver el gráfico completo →</p>
    <div class="stem-scroll-frame">
      <div class="chart-wrap stem-market-wrap stem-bar-scroll">
        <div class="chart-legend">${legend}</div>
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg stem-market-svg" overflow="visible" role="img" aria-label="Indicadores del mercado laboral para mujeres STEM">
          ${grid}${bars.join('')}
        </svg>
      </div>
    </div>
    ${source ? `<p class="chart-source">${formatSourceWithNoteBreak(source)}</p>` : ''}
  `;
}
