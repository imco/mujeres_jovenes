// Pestaña "Brecha salarial".
//
// Dos pantallas en scroll vertical (scrollytelling):
//   1. Sección explicativa: contenido fijo + dos tarjetas con el dato nacional.
//   2. Sección interactiva: medición + dos cortes → gráfica, textos y descarga.
//
// Al hacer scroll, la pantalla 1 queda fija y la 2 sube cubriéndola; el recuadro
// morado es el puente entre ambas: aparece al pie de la primera y queda como
// encabezado de la segunda.
//
// Datos: public/data/brecha-salarial/monitor_brecha.json (npm run data:brecha).

const MEDICIONES = [
  { id: 'mediana', label: 'Mediana', adjetivo: 'mediano' },
  { id: 'media', label: 'Promedio', adjetivo: 'promedio' },
];

const BANNER_TEXT = [
  'En este monitor analizamos la brecha salarial entre las personas que tienen un empleo en México.',
  'Selecciona hasta dos variables en los menús desplegables y compara cómo cambian entre distintos grupos.',
];

const SOLO_MEDIANA_HINT = 'Para este corte solo está disponible la mediana, ya que es menos sensible a valores extremos de ingreso.';

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

// "Brecha salarial: Nivel de ingresos" → prefijo + parte resaltada en morado.
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

// ── Punto de entrada ────────────────────────────────────────────────────────
export function renderBrechaStory(data, ctx) {
  const { escapeHtml } = ctx;
  const root = document.createElement('div');
  root.className = 'brecha-story';

  const cortesById = new Map(data.cortes.map((c) => [c.id, c]));
  const state = { medicion: 'mediana', c1: 'nivel_ingresos', c2: '', selected: null };

  root.innerHTML = `
    ${renderIntro(data, escapeHtml)}
    <div class="brecha-explorer">
      <button type="button" class="brecha-banner" data-role="banner">
        <span>${escapeHtml(BANNER_TEXT[0])}</span>
        <span>${escapeHtml(BANNER_TEXT[1])}</span>
        <span class="brecha-banner-hint" aria-hidden="true">Desliza para explorar ↓</span>
      </button>
      <div class="brecha-controls" role="group" aria-label="Selección de corte">
        <label class="brecha-select">
          <span class="brecha-select-label">Medición</span>
          <select data-role="medicion"></select>
        </label>
        <label class="brecha-select">
          <span class="brecha-select-label">Corte 1</span>
          <select data-role="c1"></select>
        </label>
        <label class="brecha-select">
          <span class="brecha-select-label">Corte 2</span>
          <select data-role="c2"></select>
        </label>
        <p class="brecha-controls-hint" data-role="controls-hint" hidden></p>
      </div>
      <article class="brecha-card brecha-chart-card">
        <header class="brecha-chart-head">
          <h3 class="brecha-chart-title" data-role="title"></h3>
          <p class="brecha-chart-subtitle" data-role="subtitle"></p>
          <div class="brecha-legend" data-role="legend"></div>
        </header>
        <div class="brecha-chart-body" data-role="chart"></div>
        <footer class="brecha-chart-foot">
          <p data-role="nota" hidden></p>
          <p data-role="fuente"></p>
        </footer>
      </article>
      <section class="brecha-aislados" data-role="aislados" hidden>
        <h4 class="brecha-aislados-title">Cortes aislados</h4>
        <div class="brecha-aislados-grid" data-role="aislados-grid"></div>
      </section>
    </div>
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

    if (!state.c2) {
      const rows = data.unicos[state.c1] || [];
      const cats = new Map(c1.categorias.map((c) => [c.id, c]));
      let reference = null;
      if (c1.referencia === 'nacional') {
        reference = {
          key: 'nacional',
          label: data.nacional.label,
          descripcion: data.nacional.descripcion,
          pair: data.nacional[med],
          reference: true,
        };
      }
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
    return c1.categorias.map((cat1) => ({
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
    })).filter((g) => g.rows.length);
  }

  // ── Controles ─────────────────────────────────────────────────────────────
  function syncControls() {
    const c1 = cortesById.get(state.c1);
    if (c1.soloMediana) state.medicion = 'mediana';
    if (state.c2 && !c1.combinables.includes(state.c2)) state.c2 = '';

    selMedicion.innerHTML = MEDICIONES.map((m) => {
      const disabled = c1.soloMediana && m.id !== 'mediana';
      return `<option value="${m.id}"${disabled ? ' disabled' : ''}>${m.label}</option>`;
    }).join('');
    selMedicion.value = state.medicion;
    selC1.value = state.c1;

    if (c1.combinables.length) {
      selC2.disabled = false;
      selC2.innerHTML = `<option value="">Sin segundo corte</option>${c1.combinables
        .map((id) => `<option value="${escapeHtml(id)}">${escapeHtml(cortesById.get(id).label)}</option>`)
        .join('')}`;
    } else {
      selC2.disabled = true;
      selC2.innerHTML = '<option value="">No disponible con este corte</option>';
    }
    selC2.value = state.c2;

    const hint = $('controls-hint');
    hint.textContent = c1.soloMediana ? SOLO_MEDIANA_HINT : '';
    hint.hidden = !c1.soloMediana;
  }

  // ── Render principal ──────────────────────────────────────────────────────
  function render() {
    syncControls();
    const texto = getTexto();
    const c1 = cortesById.get(state.c1);
    const [prefix, accent] = splitTitle(texto?.titulo || `Brecha salarial: ${c1.label}`);

    $('title').innerHTML = `${escapeHtml(prefix)} <span>${escapeHtml(accent)}</span>`;
    $('subtitle').textContent = texto?.subtitulo || '';
    $('nota').textContent = texto?.nota || '';
    $('nota').hidden = !texto?.nota;
    $('fuente').textContent = texto?.fuente || '';

    const isPercentiles = state.c1 === 'nivel_ingresos';
    $('legend').innerHTML = `
      <span class="brecha-key brecha-key--m">Mujeres</span>
      <span class="brecha-key brecha-key--h">Hombres</span>
      ${isPercentiles ? '<span class="brecha-key brecha-key--avg">Promedio de cada grupo</span>' : ''}
    `;

    const chart = $('chart');
    if (isPercentiles) {
      chart.innerHTML = renderPercentiles(data.nacional, texto?.cuadro || '', escapeHtml);
    } else {
      chart.innerHTML = renderDumbbell(buildGroups(), c1.unidad, state.selected, escapeHtml);
      bindRowSelection(chart);
    }

    renderAislados();
  }

  function bindRowSelection(chart) {
    chart.querySelectorAll('.bd-row[data-key]').forEach((row) => {
      const select = () => {
        state.selected = state.selected === row.dataset.key ? null : row.dataset.key;
        chart.querySelectorAll('.bd-row').forEach((r) => {
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
  function renderAislados() {
    const section = $('aislados');
    if (!state.c2) {
      section.hidden = true;
      $('aislados-grid').innerHTML = '';
      return;
    }
    section.hidden = false;
    $('aislados-grid').innerHTML = [state.c1, state.c2]
      .map((id) => renderAislado(cortesById.get(id), data.unicos[id] || [], state.medicion, escapeHtml))
      .join('');
  }

  // ── Eventos ───────────────────────────────────────────────────────────────
  selMedicion.addEventListener('change', () => {
    state.medicion = selMedicion.value;
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

  ctx.setDownloadHandler(() => downloadSelection(data, state, cortesById, getTexto(), buildGroups, ctx));

  render();
  setupScrollStory(root);
  return root;
}

// ── Pantalla 1: sección explicativa ─────────────────────────────────────────
function renderIntro(data, escapeHtml) {
  const card = (pair) => `
    <div class="brecha-mini" aria-hidden="true">
      <div class="brecha-mini-line">
        <span class="brecha-mini-val brecha-mini-val--m">${formatMoney(pair.m)}</span>
        <span class="brecha-mini-dot brecha-mini-dot--m"></span>
        <span class="brecha-mini-gap">${formatGap(pair.b)}</span>
        <span class="brecha-mini-dot brecha-mini-dot--h"></span>
        <span class="brecha-mini-val brecha-mini-val--h">${formatMoney(pair.h)}</span>
      </div>
      <div class="brecha-mini-labels"><span>Mujeres</span><span>Hombres</span></div>
    </div>
  `;
  const { mediana, media } = data.nacional;
  const sr = (label, pair) => `<span class="sr-only">${label}: mujeres ${formatMoney(pair.m)}, hombres ${formatMoney(pair.h)}, brecha de ${formatGap(pair.b)}.</span>`;

  return `
    <section class="brecha-intro brecha-card" aria-labelledby="brecha-intro-title">
      <div class="brecha-intro-top">
        <div>
          <p class="brecha-eyebrow">Conceptos</p>
          <h3 id="brecha-intro-title" class="brecha-intro-title">¿Qué es la brecha salarial?</h3>
          <p>La <strong>brecha salarial</strong> se refiere a la diferencia promedio entre los salarios de hombres y mujeres, es decir, el ingreso obtenido a través del empleo. Cuando la brecha está expresada en términos positivos, las mujeres ganan menos que los hombres, de lo contrario, las mujeres ganan más.</p>
        </div>
        <aside class="brecha-formula">
          <h4>¿Cómo se calcula?</h4>
          <p>Se resta el ingreso de las mujeres al de los hombres y se divide entre el ingreso de los hombres.</p>
          <p class="brecha-formula-eq">Brecha = (ingreso de hombres − ingreso de mujeres) ÷ ingreso de hombres × 100</p>
        </aside>
      </div>
      <h4 class="brecha-intro-subtitle">La brecha puede medirse de dos formas</h4>
      <div class="brecha-measures">
        <div class="brecha-measure">
          <p><strong>Mediana.</strong> Es el ingreso de la persona que queda justo a la mitad cuando se ordena a todas de menor a mayor ingreso: la mitad gana menos y la otra mitad gana más.</p>
          ${card(mediana)}${sr('Mediana nacional', mediana)}
        </div>
        <div class="brecha-measure">
          <p><strong>Media.</strong> También conocida como el <strong>promedio</strong>, que es la suma de todos los ingresos entre el total de personas.</p>
          ${card(media)}${sr('Promedio nacional', media)}
        </div>
      </div>
      <h4 class="brecha-intro-question">¿Por qué la mediana y el promedio muestran brechas distintas?</h4>
      <p>La mediana y el promedio pueden mostrar brechas distintas. Cuando existen salarios muy altos o muy bajos, estos valores pueden llevar el promedio hacia arriba o hacia abajo, mientras que la mediana se mantiene más estable. Por eso la mediana es una medida más estable y refleja mejor a la persona típica. El promedio, en cambio, muestra lo que pasa con todos los ingresos, incluidos los más altos. Ninguna es incorrecta: usar una u otra depende de la distribución de los datos y de la pregunta que queremos responder.</p>
      <p class="brecha-intro-source">${escapeHtml(`Fuente: Elaborado por el IMCO con datos de la ENOE (INEGI), ${data.meta.periodo}.`)}</p>
    </section>
  `;
}

// ── Gráfica de percentiles (solo "Nivel de ingresos") ───────────────────────
function renderPercentiles(nacional, cuadro, escapeHtml) {
  const points = [
    { key: 'p25', label: 'Percentil 25', ...nacional.percentiles.p25 },
    { key: 'p50', label: 'Mediana', ...nacional.percentiles.p50 },
    { key: 'p75', label: 'Percentil 75', ...nacional.percentiles.p75 },
  ];
  const avg = nacional.media;
  const W = 760;
  const H = 440;
  const x0 = 110;
  const x1 = 560;
  const yTop = 40;
  const yBottom = 320;
  const values = points.flatMap((p) => [p.m, p.h]).concat([avg.m, avg.h]);
  const scale = niceScale(Math.min(...values), Math.max(...values), 4);
  const y = (v) => yBottom - ((v - scale.lo) / (scale.hi - scale.lo)) * (yBottom - yTop);
  const x = (i) => x0 + (i * (x1 - x0)) / (points.length - 1);

  const grid = scale.ticks.map((t) => `
    <line class="pc-grid" x1="${x0 - 40}" x2="${x1 + 40}" y1="${y(t)}" y2="${y(t)}"></line>
    <text class="pc-tick" x="${x0 - 50}" y="${y(t) + 4}" text-anchor="end">${formatMoney(t)}</text>
  `).join('');

  const lineM = points.map((p, i) => `${x(i)},${y(p.m)}`).join(' ');
  const lineH = points.map((p, i) => `${x(i)},${y(p.h)}`).join(' ');
  const area = `${lineH} ${points.map((p, i) => `${x(i)},${y(p.m)}`).reverse().join(' ')}`;

  // Etiquetas: el valor del grupo mayor va arriba de su punto, el menor abajo.
  const pointMarks = points.map((p, i) => {
    const hHigher = p.h >= p.m;
    return `
      <circle class="pc-dot pc-dot--h" cx="${x(i)}" cy="${y(p.h)}" r="8"><title>Hombres, ${p.label}: ${formatMoney(p.h)}</title></circle>
      <circle class="pc-dot pc-dot--m" cx="${x(i)}" cy="${y(p.m)}" r="8"><title>Mujeres, ${p.label}: ${formatMoney(p.m)}</title></circle>
      <text class="pc-val pc-val--h ${hHigher ? 'is-above' : 'is-below'}" x="${x(i)}" y="${y(p.h) + (hHigher ? -16 : 28)}" text-anchor="middle">${formatMoney(p.h)}</text>
      <text class="pc-val pc-val--m ${hHigher ? 'is-below' : 'is-above'}" x="${x(i)}" y="${y(p.m) + (hHigher ? 28 : -16)}" text-anchor="middle">${formatMoney(p.m)}</text>
      <text class="pc-cat" x="${x(i)}" y="${yBottom + 44}" text-anchor="middle">${p.label.toUpperCase()}</text>
      <rect class="pc-gap-bg" x="${x(i) - 34}" y="${yBottom + 64}" width="68" height="26" rx="13"></rect>
      <text class="pc-gap" x="${x(i)}" y="${yBottom + 82}" text-anchor="middle">${formatGap(p.b)}</text>
    `;
  }).join('');

  // Las etiquetas de promedio se separan si las líneas quedan demasiado juntas.
  const yAvgH = y(avg.h);
  let yAvgM = y(avg.m);
  if (Math.abs(yAvgM - yAvgH) < 36) yAvgM = yAvgH + 36;

  const svg = `
    <svg class="pc-svg" viewBox="-30 0 ${W + 30} ${H}" role="img" aria-label="Ingreso mediano mensual por sexo en el percentil 25, la mediana y el percentil 75">
      ${grid}
      <line class="pc-axis" x1="${x0 - 40}" x2="${x1 + 40}" y1="${yBottom}" y2="${yBottom}"></line>
      <polygon class="pc-area" points="${area}"></polygon>
      <line class="pc-avg pc-avg--h" x1="${x0 - 40}" x2="${x1 + 50}" y1="${yAvgH}" y2="${yAvgH}"></line>
      <line class="pc-avg pc-avg--m" x1="${x0 - 40}" x2="${x1 + 50}" y1="${y(avg.m)}" y2="${y(avg.m)}"></line>
      <text class="pc-avg-label pc-avg-label--h" x="${x1 + 60}" y="${yAvgH - 2}">Promedio hombres</text>
      <text class="pc-avg-value" x="${x1 + 60}" y="${yAvgH + 14}">${formatMoney(avg.h)}</text>
      <text class="pc-avg-label pc-avg-label--m" x="${x1 + 60}" y="${yAvgM - 2}">Promedio mujeres</text>
      <text class="pc-avg-value" x="${x1 + 60}" y="${yAvgM + 14}">${formatMoney(avg.m)}</text>
      <polyline class="pc-line pc-line--h" points="${lineH}"></polyline>
      <polyline class="pc-line pc-line--m" points="${lineM}"></polyline>
      <text class="pc-row-label" x="${x0 - 50}" y="${yBottom + 82}" text-anchor="end">BRECHA</text>
      ${pointMarks}
      <text class="pc-dir" x="${x0 - 40}" y="${H - 6}">← Menores ingresos</text>
      <text class="pc-dir" x="${x1 + 40}" y="${H - 6}" text-anchor="end">Mayores ingresos →</text>
    </svg>
  `;

  return `
    <div class="pc-layout">
      <div class="pc-scroll">
        ${svg}
        <p class="pc-avg-note">
          <span class="pc-avg-note--m">Promedio mujeres ${formatMoney(avg.m)}</span>
          <span>Promedio hombres ${formatMoney(avg.h)}</span>
        </p>
      </div>
      ${cuadro ? `<aside class="pc-box"><p>${escapeHtml(cuadro)}</p></aside>` : ''}
    </div>
  `;
}

// ── Dumbbell (uno o dos cortes) ─────────────────────────────────────────────
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
      <div class="bd-row${r.reference ? ' is-ref' : ''}${selected ? ' is-selected' : ''}" data-key="${escapeHtml(r.key)}"
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

// ── Cortes aislados (barras) ────────────────────────────────────────────────
function renderAislado(corte, rows, medicion, escapeHtml) {
  const items = rows.filter((r) => r.repr && r[medicion]);
  const max = Math.max(...items.flatMap((r) => [r[medicion].m, r[medicion].h]), 1);
  // La barra más larga ocupa el 68% del ancho: el resto es para la llave y la brecha.
  const w = (v) => (v / max) * 68;

  const rowsHtml = items.map((r) => {
    const { m, h, b } = r[medicion];
    const wh = w(h);
    const wm = w(m);
    const bracket = Math.max(wh, wm) + 6;
    return `
      <div class="ais-row">
        <p class="ais-label">${escapeHtml(r.label)}</p>
        <div class="ais-plot" aria-label="${escapeHtml(`${r.label}: hombres ${formatMoney(h)}, mujeres ${formatMoney(m)}, brecha ${formatGap(b)}`)}" role="img">
          <div class="ais-bar ais-bar--h" style="width:${wh}%"><span>${formatMoney(h)}</span></div>
          <div class="ais-bar ais-bar--m" style="width:${wm}%"><span>${formatMoney(m)}</span></div>
          <span class="ais-tail ais-tail--h" style="left:${wh}%;width:calc(${bracket - wh}% - 10px)"></span>
          <span class="ais-tail ais-tail--m" style="left:${wm}%;width:calc(${bracket - wm}% - 10px)"></span>
          <span class="ais-bracket" style="left:calc(${bracket}% - 10px)"></span>
          <span class="ais-gap" style="left:calc(${bracket}% + 8px)">${formatGap(b)}</span>
        </div>
      </div>`;
  }).join('');

  return `
    <article class="brecha-card ais-card">
      <h5 class="ais-title">${escapeHtml(corte.label)}</h5>
      <div class="brecha-legend ais-legend">
        <span class="brecha-key brecha-key--h">Hombres</span>
        <span class="brecha-key brecha-key--m">Mujeres</span>
      </div>
      ${rowsHtml || '<p class="brecha-empty">Sin datos para este corte.</p>'}
    </article>`;
}

// ── Scrollytelling ──────────────────────────────────────────────────────────
// La pantalla explicativa se fija cuando su borde inferior (más el recuadro
// morado) alcanza el pie del viewport; desde ahí la sección interactiva sube y
// la cubre mientras la primera se desvanece.
function setupScrollStory(root) {
  const intro = root.querySelector('.brecha-intro');
  const explorer = root.querySelector('.brecha-explorer');
  const banner = root.querySelector('.brecha-banner');
  const hint = root.querySelector('.brecha-banner-hint');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let frame = 0;

  const layout = () => {
    const pinTop = Math.min(0, window.innerHeight - intro.offsetHeight - banner.offsetHeight - 24);
    intro.style.top = `${pinTop}px`;
  };

  const update = () => {
    frame = 0;
    const viewport = window.innerHeight;
    const start = viewport - banner.offsetHeight - 24;
    const top = explorer.getBoundingClientRect().top;
    const progress = Math.max(0, Math.min(1, (start - top) / Math.max(start, 1)));
    if (!reduceMotion) {
      intro.style.opacity = String(1 - 0.6 * progress);
      intro.style.transform = `scale(${1 - 0.03 * progress})`;
    }
    hint.style.opacity = progress > 0.08 ? '0' : '1';
    root.classList.toggle('is-exploring', progress >= 0.98);
  };

  const onScroll = () => {
    // La pestaña se destruye al cambiar de vista: el listener se da de baja solo.
    if (!root.isConnected) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      return;
    }
    if (!frame) frame = window.requestAnimationFrame(update);
  };
  const onResize = () => {
    if (!root.isConnected) return onScroll();
    layout();
    onScroll();
  };

  banner.addEventListener('click', () => {
    explorer.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  // El alto de la intro se conoce hasta que el nodo está en el documento.
  window.requestAnimationFrame(() => {
    layout();
    update();
  });
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

  let header;
  let body;
  if (state.c1 === 'nivel_ingresos') {
    const p = data.nacional.percentiles;
    header = ['Punto de la distribución', 'Ingreso mujeres', 'Ingreso hombres', 'Brecha (%)'];
    body = [
      ['Percentil 25', p.p25.m, p.p25.h, gap(p.p25.b)],
      ['Mediana', p.p50.m, p.p50.h, gap(p.p50.b)],
      ['Percentil 75', p.p75.m, p.p75.h, gap(p.p75.b)],
      ['Promedio', data.nacional.media.m, data.nacional.media.h, gap(data.nacional.media.b)],
    ];
  } else {
    header = c2
      ? [c1.label, c2.label, 'Ingreso mujeres', 'Ingreso hombres', 'Brecha (%)']
      : [c1.label, 'Ingreso mujeres', 'Ingreso hombres', 'Brecha (%)'];
    body = buildGroups().flatMap((g) => g.rows.map((r) => {
      const values = r.pair ? [r.pair.m, r.pair.h, gap(r.pair.b)] : [NO_DATA, '', ''];
      return c2 ? [g.group, r.label, ...values] : [r.label, ...values];
    }));
  }

  const aoa = [
    [texto?.titulo || `Brecha salarial: ${c1.label}`],
    [texto?.subtitulo || ''],
    [`Medición: ${medicion.label} · Montos en ${unidadLabel} · Brecha = (H − M) ÷ H × 100`],
    [],
    header,
    ...body,
    [],
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
