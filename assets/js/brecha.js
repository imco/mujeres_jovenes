// Pestaña "Brecha salarial".
//
// Explorador interactivo: dos variables y una medición definen la gráfica, sus
// textos y la descarga. La combinación de variables permitidas, los títulos y
// las notas salen de la base de textos del área de datos.
//
// Datos: public/data/brecha-salarial/monitor_brecha.json (npm run data:brecha).

const MEDICIONES = [
  { id: 'mediana', label: 'Mediana' },
  { id: 'media', label: 'Promedio' },
];

// Vista con la que abre el monitor. `medicion` es la preferencia del usuario:
// las variables que solo tienen mediana la ignoran sin perderla.
const DEFAULT_STATE = { c1: 'informalidad', c2: '', medicion: 'media' };

const BANNER_TEXT = 'Este monitor analiza la brecha salarial entre las personas ocupadas en México. Selecciona hasta dos variables para conocer cómo cambia la brecha según las distintas características laborales.';

// Listas con más filas que esto se sombrean en filas alternas para leerlas mejor.
const ZEBRA_MIN_ROWS = 6;

// Contenido de la burbuja (?) junto al título. Texto de la página 6 del mockup
// de Canva (Monitor Brecha Salarial_Mockup).
const HELP_HTML = `
  <h5>¿Qué es la brecha salarial?</h5>
  <p>Es la diferencia porcentual entre los ingresos de mujeres y hombres. Es decir, muestra cuánto menos o más perciben las mujeres en comparación con los hombres.</p>
  <p>Se calcula al restar el ingreso de las mujeres al de los hombres, dividir la diferencia entre el ingreso de los hombres y multiplicar el resultado por 100.</p>
  <h5>¿Qué son la mediana y el promedio?</h5>
  <p class="brecha-help-lead">La brecha puede medirse de dos formas</p>
  <p><strong>Promedio.</strong> Es la suma de los ingresos de todas las personas dividida entre el número total de personas.</p>
  <p><strong>Mediana.</strong> Es el ingreso que se ubica a la mitad de la muestra cuando ordenamos los ingresos de las personas de mayor a menor.</p>
`;

// Por debajo de esta separación relativa entre los dos puntos, la etiqueta de
// la brecha no cabe entre ellos y se coloca encima.
const GAP_INLINE_MIN_RATIO = 0.13;

// ── Formato ─────────────────────────────────────────────────────────────────
const moneyFormatters = {
  mensual: new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }),
  hora: new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};
const formatMoney = (value, unidad = 'mensual') => `$${moneyFormatters[unidad].format(value)}`;
// Un decimal y signo menos cuando la brecha es negativa (las mujeres ganan más).
const formatGap = (value) => `${Number(value).toFixed(1)}%`;

// Subtítulo con la medición en negritas: solo "ingreso mediano/promedio", no
// otras apariciones como "(percentil 25, mediana y percentil 75)".
const emphasizeMedicion = (text, escapeHtml) =>
  escapeHtml(text).replace(/\b(ingresos?)\s+(medianos?|promedios?)\b/gi, '$1 <strong>$2</strong>');

// "Brecha salarial: Informalidad laboral" → prefijo + parte resaltada en morado.
function splitTitle(title) {
  const idx = title.indexOf(':');
  return idx === -1 ? ['', title] : [title.slice(0, idx + 1), title.slice(idx + 1).trim()];
}

// Escala "bonita" para el eje: pasos de 1, 2, 2.5 o 5 × 10^k.
function niceScale(min, max, targetTicks = 6) {
  const span = Math.max(max - min, 1);
  const raw = span / targetTicks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return { lo, hi, step, ticks };
}

// ── Animaciones ─────────────────────────────────────────────────────────────
// Entrada: filas nuevas aparecen escalonadas (clase .anim-enter, en CSS).
// Transición: si una fila ya existía (misma data-mkey, p. ej. al cambiar de
// mediana a promedio), sus puntos, líneas y barras se deslizan de la posición
// anterior a la nueva y las cifras cuentan hasta el nuevo valor.
// Con "reducir movimiento" activado en el sistema no se anima nada.
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const MORPH_PARTS = [
  '.bd-line', '.bd-gap', '.bd-dot--h', '.bd-dot--m', '.bd-val--m', '.bd-val--h',
  '.ais-bar--h', '.ais-bar--m', '.ais-tail--h', '.ais-tail--m', '.ais-bracket', '.ais-gap',
];
const TWEEN_PARTS = ['.bd-val--m', '.bd-val--h', '.bd-gap', '.ais-bar--h span', '.ais-bar--m span', '.ais-gap'];
const MORPH_MS = 600;
const rowType = (row) => (row.classList.contains('ais-row') ? 'bar' : 'bd');

function snapshotRows(container) {
  const map = new Map();
  if (!container) return map;
  container.querySelectorAll('[data-mkey]').forEach((row) => {
    if (!row.dataset.mkey) return;
    const parts = {};
    MORPH_PARTS.forEach((sel) => {
      const el = row.querySelector(sel);
      if (el) parts[sel] = { style: el.style.cssText, className: el.className };
    });
    const texts = {};
    TWEEN_PARTS.forEach((sel) => {
      const el = row.querySelector(sel);
      if (el) texts[sel] = el.textContent;
    });
    map.set(`${rowType(row)}:${row.dataset.mkey}`, { parts, texts });
  });
  return map;
}

function animateRows(container, prev) {
  if (!container || prefersReducedMotion()) return;
  const morphs = [];
  let entering = 0;
  container.querySelectorAll('.bd-row, .ais-row').forEach((row) => {
    const old = row.dataset.mkey ? prev.get(`${rowType(row)}:${row.dataset.mkey}`) : null;
    if (!old || !Object.keys(old.parts).length) {
      // Tope al escalonamiento: con 33 filas (entidades) la última no debe tardar.
      row.style.setProperty('--i', String(Math.min(entering, 14)));
      row.classList.add('anim-enter');
      entering += 1;
      return;
    }
    const targets = [];
    Object.entries(old.parts).forEach(([sel, before]) => {
      const el = row.querySelector(sel);
      if (!el) return;
      targets.push([el, el.style.cssText, el.className]);
      el.style.cssText = before.style;
      el.className = before.className;
    });
    morphs.push({ row, targets, old });
  });
  if (!morphs.length) return;
  // Se fija el estado anterior, se activa la transición y en el siguiente cuadro
  // se aplica el nuevo: el navegador interpola left/width/transform.
  container.getBoundingClientRect();
  morphs.forEach(({ row }) => row.classList.add('anim-morph'));
  requestAnimationFrame(() => {
    morphs.forEach(({ row, targets, old }) => {
      targets.forEach(([el, css, className]) => {
        el.style.cssText = css;
        el.className = className;
      });
      Object.entries(old.texts).forEach(([sel, from]) => {
        const el = row.querySelector(sel);
        if (el) tweenText(el, from, el.textContent);
      });
    });
  });
}

// Cuenta de un número a otro conservando prefijo ($), sufijo (%) y decimales.
function tweenText(el, from, to) {
  const numRe = /-?[\d,]+(?:\.(\d+))?/;
  const a = String(from).match(numRe);
  const b = String(to).match(numRe);
  if (!a || !b) return;
  const start = Number(a[0].replace(/,/g, ''));
  const end = Number(b[0].replace(/,/g, ''));
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return;
  const decimals = b[1] ? b[1].length : 0;
  const fmt = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: b[0].includes(','),
  });
  const prefix = to.slice(0, b.index);
  const suffix = to.slice(b.index + b[0].length);
  const t0 = performance.now();
  const step = (now) => {
    if (!el.isConnected) return;
    const k = Math.min(1, (now - t0) / MORPH_MS);
    const eased = 1 - (1 - k) ** 3;
    el.textContent = k < 1 ? `${prefix}${fmt.format(start + (end - start) * eased)}${suffix}` : to;
    if (k < 1) requestAnimationFrame(step);
  };
  el.textContent = from;
  requestAnimationFrame(step);
}

// Reinicia una animación CSS de una sola vez (quitar, forzar reflow, poner).
function replayAnimation(el, className) {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

// ── Punto de entrada ────────────────────────────────────────────────────────
export function renderBrechaStory(data, ctx) {
  const { escapeHtml } = ctx;
  const root = document.createElement('div');
  root.className = 'brecha-story';

  const cortesById = new Map(data.cortes.map((c) => [c.id, c]));
  // chartType: 'dumbbell' (puntos) o 'bars' (barras agrupadas); se conserva al cambiar de variable.
  // medicion es la que se muestra; medicionPref, la que eligió el usuario.
  const state = { ...DEFAULT_STATE, medicionPref: DEFAULT_STATE.medicion, selected: null, chartType: 'dumbbell' };

  root.innerHTML = `
    <div class="brecha-banner"><span>${escapeHtml(BANNER_TEXT)}</span></div>
    <div class="brecha-controls" role="group" aria-label="Selección de variables">
      <label class="brecha-select">
        <span class="brecha-select-label">Variable 1</span>
        <select data-role="c1"></select>
      </label>
      <label class="brecha-select">
        <span class="brecha-select-label">Variable 2</span>
        <select data-role="c2"></select>
      </label>
      <label class="brecha-select">
        <span class="brecha-select-label">Medición</span>
        <select data-role="medicion"></select>
      </label>
    </div>
    <article class="brecha-card brecha-chart-card">
      <header class="brecha-chart-head">
        <div class="brecha-title-row">
          <h3 class="brecha-chart-title" data-role="title"></h3>
          <div class="brecha-help">
            <button type="button" class="brecha-help-btn" data-role="help-btn"
                    aria-expanded="false" aria-controls="brecha-help-panel"
                    title="¿Qué son la mediana, el promedio y la brecha?">?</button>
            <div class="brecha-help-panel" id="brecha-help-panel" role="dialog"
                 aria-label="Cómo se calcula la brecha" data-role="help-panel" hidden>${HELP_HTML}</div>
          </div>
        </div>
        <p class="brecha-chart-subtitle" data-role="subtitle"></p>
        <div class="brecha-legend-row">
          <div class="brecha-legend" data-role="legend"></div>
          <div class="view-toggle" role="group" aria-label="Tipo de gráfica" data-role="chart-toggle">
            <button type="button" class="view-btn" data-type="dumbbell">Puntos</button>
            <button type="button" class="view-btn" data-type="bars">Barras</button>
          </div>
        </div>
      </header>
      <div class="brecha-chart-body" data-role="chart"></div>
      <footer class="brecha-chart-foot">
        <p data-role="nota" hidden></p>
        <p data-role="fuente"></p>
      </footer>
    </article>
    <section class="brecha-aislados" data-role="aislados" hidden>
      <div class="brecha-aislados-grid" data-role="aislados-grid"></div>
    </section>
  `;

  const $ = (role) => root.querySelector(`[data-role="${role}"]`);
  const selMedicion = $('medicion');
  const selC1 = $('c1');
  const selC2 = $('c2');

  selC1.innerHTML = data.cortes
    .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`)
    .join('');

  // ── Datos de la selección actual ──────────────────────────────────────────
  const getTexto = () => data.textos[`${state.c1}|${state.c2}|${state.medicion}`] || null;

  // Filas de un cruce en el orden elegido por el usuario. Los datos se guardan
  // una sola vez por par; si el usuario eligió el orden inverso, se voltean.
  function getCombinado(c1, c2) {
    if (data.combinados[`${c1}|${c2}`]) return data.combinados[`${c1}|${c2}`];
    return (data.combinados[`${c2}|${c1}`] || []).map((r) => ({ ...r, c1: r.c2, c2: r.c1 }));
  }

  // Filas del dumbbell: [{ group, rows: [{ key, label, descripcion, pair, reference }] }]
  function buildGroups() {
    const c1 = cortesById.get(state.c1);
    const med = state.medicion;

    if (state.c1 === 'nivel_ingresos') {
      const p = data.nacional.percentiles;
      return [{
        group: null,
        rows: [
          { key: 'p25', label: 'Percentil 25', descripcion: 'menores ingresos', pair: p.p25 },
          { key: 'p50', label: 'Mediana', descripcion: 'punto medio', pair: p.p50 },
          { key: 'p75', label: 'Percentil 75', descripcion: 'mayores ingresos', pair: p.p75 },
        ],
      }];
    }

    // Ingreso por hora: la hoja ya trae el desglose por jornada. Sola se ve el
    // total; con "Jornada laboral" como segunda variable, el total como referencia
    // y después tiempo completo y parcial.
    if (state.c1 === 'ingreso_hora') {
      const all = (data.unicos.ingreso_hora || []).map((r) => ({
        key: r.id,
        label: r.label,
        descripcion: c1.categorias.find((c) => c.id === r.id)?.descripcion || '',
        pair: r.repr ? r[med] : null,
        reference: r.id === c1.referencia,
      }));
      const total = all.filter((r) => r.reference);
      return [{ group: null, rows: state.c2 === 'jornada' ? [...total, ...all.filter((r) => !r.reference)] : total }];
    }

    if (!state.c2) {
      const rows = data.unicos[state.c1] || [];
      const cats = new Map(c1.categorias.map((c) => [c.id, c]));
      const reference = c1.referencia === 'nacional'
        ? {
          key: 'nacional',
          label: data.nacional.label,
          descripcion: data.nacional.descripcion,
          pair: data.nacional[med],
          reference: true,
        }
        : null;
      const list = rows.map((r) => ({
        key: r.id,
        label: r.label,
        descripcion: cats.get(r.id)?.descripcion || '',
        pair: r.repr ? r[med] : null,
        reference: c1.referencia === r.id,
      }));
      // La fila de referencia va siempre primero (Nacional, o "Total" en ingreso por hora).
      const refFromRows = list.filter((r) => r.reference);
      const others = list.filter((r) => !r.reference);
      return [{ group: null, rows: [...(reference ? [reference] : []), ...refFromRows, ...others] }];
    }

    const c2 = cortesById.get(state.c2);
    const rows = getCombinado(state.c1, state.c2);
    return c1.categorias
      .map((cat1) => ({
        group: cat1.label,
        rows: c2.categorias
          .map((cat2) => {
            const r = rows.find((x) => x.c1 === cat1.id && x.c2 === cat2.id);
            if (!r) return null;
            return {
              key: `${cat1.id}|${cat2.id}`,
              label: cat2.label,
              descripcion: '',
              pair: r.repr ? r[med] : null,
              reference: false,
            };
          })
          .filter(Boolean),
      }))
      // Una categoría sin ninguna subcategoría con observaciones no aporta nada: se omite.
      .filter((g) => g.rows.some((r) => r.pair));
  }

  // ── Controles ─────────────────────────────────────────────────────────────
  function syncControls() {
    const c1 = cortesById.get(state.c1);
    state.medicion = c1.soloMediana ? 'mediana' : state.medicionPref;
    if (state.c2 && !c1.combinables.includes(state.c2)) state.c2 = '';

    // Variables que solo se miden con la mediana: el menú dice "No aplica".
    selMedicion.disabled = c1.soloMediana;
    selMedicion.innerHTML = c1.soloMediana
      ? '<option value="mediana">No aplica</option>'
      : MEDICIONES.map((m) => `<option value="${m.id}">${m.label}</option>`).join('');
    selMedicion.value = state.medicion;
    selC1.value = state.c1;

    if (c1.combinables.length) {
      selC2.disabled = false;
      selC2.innerHTML = `<option value="">Sin segunda variable</option>${c1.combinables
        .map((id) => `<option value="${escapeHtml(id)}">${escapeHtml(cortesById.get(id).label)}</option>`)
        .join('')}`;
    } else {
      selC2.disabled = true;
      selC2.innerHTML = '<option value="">No disponible con esta variable</option>';
    }
    selC2.value = state.c2;
  }

  // ── Render principal ──────────────────────────────────────────────────────
  function render() {
    syncControls();
    const texto = getTexto();
    const c1 = cortesById.get(state.c1);
    const [prefix, accent] = splitTitle(texto?.titulo || `Brecha salarial: ${c1.label}`);

    const titleHtml = `${escapeHtml(prefix)} <span>${escapeHtml(accent)}</span>`;
    const subtitleHtml = emphasizeMedicion(texto?.subtitulo || '', escapeHtml);
    // Título y subtítulo se desvanecen al cambiar; con la misma selección no se animan.
    if ($('title').innerHTML !== titleHtml) replayAnimation($('title'), 'anim-swap');
    if ($('subtitle').innerHTML !== subtitleHtml) replayAnimation($('subtitle'), 'anim-swap');
    $('title').innerHTML = titleHtml;
    $('subtitle').innerHTML = subtitleHtml;
    $('nota').textContent = texto?.nota || '';
    $('nota').hidden = !texto?.nota;
    $('fuente').textContent = texto?.fuente || '';

    // La distribución de ingresos tiene su propia gráfica (dumbbell vertical).
    const isDistribucion = state.c1 === 'nivel_ingresos';
    const toggle = $('chart-toggle');
    toggle.hidden = isDistribucion;
    toggle.querySelectorAll('.view-btn').forEach((b) => b.classList.toggle('active', b.dataset.type === state.chartType));
    $('legend').innerHTML = `
      <span class="brecha-key brecha-key--m">Mujeres</span>
      <span class="brecha-key brecha-key--h">Hombres</span>
      <span class="brecha-key brecha-key--gap"><i>%</i>Brecha</span>`;

    const chart = $('chart');
    // Posiciones y cifras actuales, para animar la transición hacia la nueva selección.
    const prevChart = snapshotRows(chart);
    const prevAislados = snapshotRows($('aislados-grid'));
    const groups = buildGroups();
    let graph;
    if (isDistribucion) graph = renderVerticalDumbbell(groups[0]?.rows || [], c1.unidad, state.selected, escapeHtml);
    else if (state.chartType === 'bars') graph = renderGroupedBars(groups, c1.unidad, state.selected, escapeHtml);
    else graph = renderDumbbell(groups, c1.unidad, state.selected, escapeHtml);
    chart.innerHTML = texto?.cuadro
      ? `<div class="pc-layout"><div class="pc-main">${graph}</div><aside class="pc-box"><p>${escapeHtml(texto.cuadro)}</p></aside></div>`
      : graph;
    chart.classList.toggle('is-long', groups.reduce((n, g) => n + g.rows.length, 0) > ZEBRA_MIN_ROWS);
    bindRowSelection(chart);
    animateRows(chart, prevChart);

    renderAislados();
    animateRows($('aislados-grid'), prevAislados);
  }

  function bindRowSelection(chart) {
    chart.querySelectorAll('.bd-row[data-key], .gb-row[data-key], .vd-col[data-key]').forEach((row) => {
      const select = () => {
        state.selected = state.selected === row.dataset.key ? null : row.dataset.key;
        chart.querySelectorAll('.bd-row, .gb-row, .vd-col').forEach((r) => {
          const on = r.dataset.key === state.selected;
          r.classList.toggle('is-selected', on);
          r.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        if (state.selected) ctx.track('brecha_group_select', { group: state.selected, c1: state.c1, c2: state.c2 });
      };
      row.addEventListener('click', select);
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      });
    });
  }

  // Cortes aislados: con dos variables, la brecha de cada una por separado.
  // El ingreso por hora con jornada no es un cruce real (es un desglose de la
  // misma hoja), así que no lleva tarjetas.
  function renderAislados() {
    const section = $('aislados');
    if (!state.c2 || state.c1 === 'ingreso_hora') {
      section.hidden = true;
      $('aislados-grid').innerHTML = '';
      return;
    }
    if (section.hidden) {
      replayAnimation(section, 'anim-reveal');
      // Las tarjetas se reconstruyen en cada cambio: sin quitar la marca, volverían
      // a entrar al cambiar de medición mientras sus barras solo se deslizan.
      window.setTimeout(() => section.classList.remove('anim-reveal'), 700);
    }
    section.hidden = false;
    // Subtítulo de la variable sola; nota y fuente propias de este cruce
    // (columnas "Nota/Fuente - Corte 1/2" de la base) o, si faltan, las de la variable sola.
    const cruce = getTexto()?.aislados || [];
    $('aislados-grid').innerHTML = [state.c1, state.c2]
      .map((id, i) => {
        const solo = data.textos[`${id}||${state.medicion}`] || {};
        const propio = cruce[i] || {};
        return renderAislado(
          cortesById.get(id),
          data.unicos[id] || [],
          state.medicion,
          { subtitulo: solo.subtitulo, nota: propio.nota || solo.nota, fuente: propio.fuente || solo.fuente },
          escapeHtml
        );
      })
      .join('');
  }

  // ── Eventos ───────────────────────────────────────────────────────────────
  $('chart-toggle').addEventListener('click', (event) => {
    const btn = event.target.closest('.view-btn');
    if (!btn || btn.dataset.type === state.chartType) return;
    state.chartType = btn.dataset.type;
    ctx.track('brecha_chart_type', { type: state.chartType, c1: state.c1, c2: state.c2 });
    render();
  });
  selMedicion.addEventListener('change', () => {
    state.medicionPref = selMedicion.value;
    ctx.track('brecha_medicion', { medicion: state.medicion, c1: state.c1, c2: state.c2 });
    render();
  });
  selC1.addEventListener('change', () => {
    state.c1 = selC1.value;
    state.selected = null;
    ctx.track('brecha_corte', { c1: state.c1, c2: state.c2 });
    render();
  });
  selC2.addEventListener('change', () => {
    state.c2 = selC2.value;
    state.selected = null;
    ctx.track('brecha_corte', { c1: state.c1, c2: state.c2 });
    render();
  });
  setupHelp(root, ctx);

  ctx.setDownloadHandler(() => downloadSelection(data, state, cortesById, getTexto(), buildGroups, ctx));

  render();
  return root;
}

// ── Burbuja (?) ─────────────────────────────────────────────────────────────
function setupHelp(root, ctx) {
  const btn = root.querySelector('[data-role="help-btn"]');
  const panel = root.querySelector('[data-role="help-panel"]');
  const setOpen = (open) => {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = panel.hidden;
    setOpen(open);
    if (open) ctx.track('brecha_help_open');
  });
  // Clic fuera o Escape la cierran. Los listeners se dan de baja solos cuando
  // la pestaña se destruye al cambiar de vista.
  const onDocClick = (event) => {
    if (!root.isConnected) return cleanup();
    if (!panel.hidden && !panel.contains(event.target)) setOpen(false);
  };
  const onKey = (event) => {
    if (!root.isConnected) return cleanup();
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      btn.focus();
    }
  };
  const cleanup = () => {
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKey);
  };
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
}

// ── Dumbbell (uno o dos cortes, y distribución de ingresos) ─────────────────
function renderDumbbell(groups, unidad, selectedKey, escapeHtml) {
  const values = groups.flatMap((g) => g.rows).flatMap((r) => (r.pair ? [r.pair.m, r.pair.h] : []));
  if (!values.length) return '<p class="brecha-empty">No hay datos disponibles para esta selección.</p>';

  const scale = niceScale(Math.min(...values), Math.max(...values), 6);
  const pos = (v) => ((v - scale.lo) / (scale.hi - scale.lo)) * 100;

  const renderRow = (r) => {
    const selected = selectedKey === r.key;
    const label = `
      <div class="bd-label">
        <span class="bd-label-name">${escapeHtml(r.label)}</span>
        ${r.descripcion ? `<span class="bd-label-desc">${escapeHtml(r.descripcion)}</span>` : ''}
      </div>`;
    if (!r.pair) {
      return `
        <div class="bd-row bd-row--nd${r.reference ? ' is-ref' : ''}">
          ${label}
          <div class="bd-plot"><span class="bd-nd">Sin observaciones suficientes para una estimación confiable</span></div>
        </div>`;
    }
    const { m, h, b } = r.pair;
    const pm = pos(m);
    const ph = pos(h);
    const lo = Math.min(pm, ph);
    const hi = Math.max(pm, ph);
    const mLeft = m <= h;
    const gapAbove = (hi - lo) / 100 < GAP_INLINE_MIN_RATIO;
    const aria = `${r.label}: mujeres ${formatMoney(m, unidad)}, hombres ${formatMoney(h, unidad)}, brecha ${formatGap(b)}`;
    return `
      <div class="bd-row${r.reference ? ' is-ref' : ''}${selected ? ' is-selected' : ''}" data-key="${escapeHtml(r.key)}" data-mkey="${escapeHtml(r.key)}"
           role="button" tabindex="0" aria-pressed="${selected}" aria-label="${escapeHtml(aria)}">
        ${label}
        <div class="bd-plot">
          <div class="bd-track">
            <span class="bd-line" style="left:${lo}%;width:${hi - lo}%"></span>
            <span class="bd-gap${gapAbove ? ' bd-gap--above' : ''}" style="left:${(lo + hi) / 2}%">${formatGap(b)}</span>
            <span class="bd-dot bd-dot--h" style="left:${ph}%"></span>
            <span class="bd-dot bd-dot--m" style="left:${pm}%"></span>
            <span class="bd-val bd-val--m ${mLeft ? 'is-left' : 'is-right'}" style="left:${pm}%">${formatMoney(m, unidad)}</span>
            <span class="bd-val bd-val--h ${mLeft ? 'is-right' : 'is-left'}" style="left:${ph}%">${formatMoney(h, unidad)}</span>
          </div>
        </div>
      </div>`;
  };

  const body = groups.map((g) => `
    <div class="bd-group${g.group ? '' : ' bd-group--flat'}">
      ${g.group ? `<p class="bd-group-title">${escapeHtml(g.group)}</p>` : ''}
      ${g.rows.map(renderRow).join('')}
    </div>
  `).join('');

  const axis = scale.ticks
    .map((t) => `<span class="bd-tick" style="left:${pos(t)}%">${formatMoney(t, unidad)}</span>`)
    .join('');

  return `
    <div class="bd-chart">
      ${body}
      <div class="bd-axis" aria-hidden="true">
        <div></div>
        <div class="bd-plot"><div class="bd-track bd-axis-track">${axis}</div></div>
      </div>
    </div>`;
}

// ── Distribución de ingresos: dumbbell vertical ─────────────────────────────
// Una columna por punto de la distribución (P25, mediana, P75). Los dos puntos
// se unen con una línea vertical, las cifras van a los lados y la brecha en una
// burbuja por debajo.
function renderVerticalDumbbell(rows, unidad, selectedKey, escapeHtml) {
  const values = rows.flatMap((r) => (r.pair ? [r.pair.m, r.pair.h] : []));
  if (!values.length) return '<p class="brecha-empty">No hay datos disponibles para esta selección.</p>';
  const scale = niceScale(Math.min(...values), Math.max(...values), 5);
  const pos = (v) => ((v - scale.lo) / (scale.hi - scale.lo)) * 100;

  const ticks = scale.ticks
    .map((t) => `<span class="vd-tick" style="bottom:${pos(t)}%"><em>${formatMoney(t, unidad)}</em></span>`)
    .join('');
  const cols = rows.map((r) => {
    if (!r.pair) return '<div class="vd-col vd-col--nd"><span class="bd-nd">Sin datos</span></div>';
    const { m, h, b } = r.pair;
    const pm = pos(m);
    const ph = pos(h);
    const lo = Math.min(pm, ph);
    const hi = Math.max(pm, ph);
    const selected = selectedKey === r.key;
    const aria = `${r.label}: mujeres ${formatMoney(m, unidad)}, hombres ${formatMoney(h, unidad)}, brecha ${formatGap(b)}`;
    return `
      <div class="vd-col${selected ? ' is-selected' : ''}" data-key="${escapeHtml(r.key)}" role="button" tabindex="0"
           aria-pressed="${selected}" aria-label="${escapeHtml(aria)}">
        <span class="vd-line" style="bottom:${lo}%;height:${hi - lo}%"></span>
        <span class="vd-dot bd-dot--h" style="bottom:${ph}%"></span>
        <span class="vd-dot bd-dot--m" style="bottom:${pm}%"></span>
        <span class="vd-val vd-val--m" style="bottom:${pm}%">${formatMoney(m, unidad)}</span>
        <span class="vd-val vd-val--h" style="bottom:${ph}%">${formatMoney(h, unidad)}</span>
        <span class="vd-gap" style="bottom:${lo}%">${formatGap(b)}</span>
      </div>`;
  }).join('');
  const labels = rows.map((r) => `
    <div class="vd-label">
      <span class="bd-label-name">${escapeHtml(r.label)}</span>
      ${r.descripcion ? `<span class="bd-label-desc">${escapeHtml(r.descripcion)}</span>` : ''}
    </div>`).join('');

  return `
    <div class="vd-chart" style="--vd-cols:${rows.length}">
      <div class="vd-plot">
        <div class="vd-area">
          <div class="vd-grid" aria-hidden="true">${ticks}</div>
          <div class="vd-cols">${cols}</div>
        </div>
      </div>
      <div class="vd-labels">${labels}</div>
    </div>`;
}

// ── Barras agrupadas ────────────────────────────────────────────────────────
// Una fila por grupo con la barra de hombres, la de mujeres y una llave punteada
// que lleva a la brecha. La usan la vista "Barras" del explorador y los cortes
// aislados. `scale` convierte un monto en % del ancho; la barra más larga ocupa
// el 68%, el resto queda para la llave y la cifra de la brecha.
function renderBarsRow(r, unidad, scale, selectedKey, escapeHtml) {
  const label = `
    <div class="ais-label">
      <span class="ais-label-name">${escapeHtml(r.label)}</span>
      ${r.descripcion ? `<span class="bd-label-desc">${escapeHtml(r.descripcion)}</span>` : ''}
    </div>`;
  const selectable = r.key !== undefined;
  const mkey = ` data-mkey="${escapeHtml(r.mkey ?? r.key ?? '')}"`;
  const cls = `ais-row${selectable ? ' gb-row' : ''}${r.reference ? ' is-ref' : ''}${selectable && selectedKey === r.key ? ' is-selected' : ''}`;
  if (!r.pair) {
    return `<div class="${cls} gb-row--nd"${mkey}>${label}<div class="ais-plot ais-plot--nd"><span class="bd-nd">Sin observaciones suficientes para una estimación confiable</span></div></div>`;
  }
  const { m, h, b } = r.pair;
  const wh = scale(h);
  const wm = scale(m);
  const bracket = Math.max(wh, wm) + 6;
  const aria = `${r.label}: hombres ${formatMoney(h, unidad)}, mujeres ${formatMoney(m, unidad)}, brecha ${formatGap(b)}`;
  const attrs = selectable
    ? ` data-key="${escapeHtml(r.key)}" role="button" tabindex="0" aria-pressed="${selectedKey === r.key}" aria-label="${escapeHtml(aria)}"`
    : '';
  return `
    <div class="${cls}"${attrs}${mkey}>
      ${label}
      <div class="ais-plot"${selectable ? '' : ` role="img" aria-label="${escapeHtml(aria)}"`}>
        <div class="ais-bar ais-bar--h" style="width:${wh}%"><span>${formatMoney(h, unidad)}</span></div>
        <div class="ais-bar ais-bar--m" style="width:${wm}%"><span>${formatMoney(m, unidad)}</span></div>
        <span class="ais-tail ais-tail--h" style="left:${wh}%;width:calc(${bracket - wh}% - 10px)"></span>
        <span class="ais-tail ais-tail--m" style="left:${wm}%;width:calc(${bracket - wm}% - 10px)"></span>
        <span class="ais-bracket" style="left:calc(${bracket}% - 10px)"></span>
        <span class="ais-gap" style="left:calc(${bracket}% + 8px)">${formatGap(b)}</span>
      </div>
    </div>`;
}

const barScale = (values) => {
  const max = Math.max(...values, 1);
  return (v) => (v / max) * 68;
};

function renderGroupedBars(groups, unidad, selectedKey, escapeHtml) {
  const values = groups.flatMap((g) => g.rows).flatMap((r) => (r.pair ? [r.pair.m, r.pair.h] : []));
  if (!values.length) return '<p class="brecha-empty">No hay datos disponibles para esta selección.</p>';
  const scale = barScale(values);
  return `<div class="gb-chart">${groups.map((g) => `
    <div class="gb-group">
      ${g.group ? `<p class="bd-group-title">${escapeHtml(g.group)}</p>` : ''}
      ${g.rows.map((r) => renderBarsRow(r, unidad, scale, selectedKey, escapeHtml)).join('')}
    </div>`).join('')}</div>`;
}

// ── Cortes aislados ─────────────────────────────────────────────────────────
function renderAislado(corte, rows, medicion, texto, escapeHtml) {
  const items = rows
    .filter((r) => r.repr && r[medicion])
    .map((r) => ({ label: r.label, pair: r[medicion], mkey: `${corte.id}|${r.id}` }));
  const scale = barScale(items.flatMap((r) => [r.pair.m, r.pair.h]));
  return `
    <article class="brecha-card ais-card">
      <h5 class="ais-title">${escapeHtml(corte.label)}</h5>
      ${texto?.subtitulo ? `<p class="ais-subtitle">${emphasizeMedicion(texto.subtitulo, escapeHtml)}</p>` : ''}
      <div class="brecha-legend ais-legend">
        <span class="brecha-key brecha-key--h">Hombres</span>
        <span class="brecha-key brecha-key--m">Mujeres</span>
      </div>
      ${items.map((r) => renderBarsRow(r, corte.unidad, scale, null, escapeHtml)).join('') || '<p class="brecha-empty">Sin datos para este corte.</p>'}
      ${texto?.nota || texto?.fuente ? `
        <footer class="brecha-chart-foot ais-foot">
          ${texto.nota ? `<p>${escapeHtml(texto.nota)}</p>` : ''}
          ${texto.fuente ? `<p>${escapeHtml(texto.fuente)}</p>` : ''}
        </footer>` : ''}
    </article>`;
}

// ── Descarga de la selección ────────────────────────────────────────────────
async function downloadSelection(data, state, cortesById, texto, buildGroups, ctx) {
  const XLSX = await import('xlsx');
  const c1 = cortesById.get(state.c1);
  const c2 = state.c2 ? cortesById.get(state.c2) : null;
  const medicion = MEDICIONES.find((m) => m.id === state.medicion);
  const unidadLabel = c1.unidad === 'hora' ? 'pesos por hora' : 'pesos mensuales';
  const gap = (b) => (Number.isFinite(b) ? Number(b.toFixed(1)) : '');
  const NO_DATA = 'Sin observaciones suficientes';

  const groups = buildGroups();
  const header = c2
    ? [c1.label, c2.label, 'Ingreso mujeres', 'Ingreso hombres', 'Brecha (%)']
    : [c1.label, 'Ingreso mujeres', 'Ingreso hombres', 'Brecha (%)'];
  const body = groups.flatMap((g) => g.rows.map((r) => {
    const values = r.pair ? [r.pair.m, r.pair.h, gap(r.pair.b)] : [NO_DATA, '', ''];
    return c2 ? [g.group, r.label, ...values] : [r.label, ...values];
  }));

  const aoa = [
    [texto?.titulo || `Brecha salarial: ${c1.label}`],
    [texto?.subtitulo || ''],
    [`Medición: ${medicion.label} · Montos en ${unidadLabel} · Brecha = (H − M) ÷ H × 100`],
    [],
    header,
    ...body,
    [],
    ...(texto?.cuadro ? [[texto.cuadro]] : []),
    ...(texto?.nota ? [[texto.nota]] : []),
    [texto?.fuente || ''],
    [`Cita: ${ctx.citation()}`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = header.map((h, i) => ({ wch: i < header.length - 3 ? 34 : 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Brecha salarial');
  const filename = ['brecha_salarial', state.c1, state.c2, state.medicion].filter(Boolean).join('_');
  XLSX.writeFile(wb, `${filename}.xlsx`);
  ctx.track('file_download', { file_name: `${filename}.xlsx`, section: 'Brecha salarial' });
}
