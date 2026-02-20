/**
 * main.js – Scrollytelling engine
 * Mujeres en la Economía | IMCO Monitor 2025
 *
 * Capítulos:
 *  0 – Hero
 *  1 – México en el mundo (world map)
 *  2 – 20 años sin moverse (line chart TPE)
 *  3 – Brecha salarial (line chart)
 *  4 – Informalidad (line chart dual)
 *  5 – El trabajo invisible (stacked bars)
 *  6 – CTA final
 */

import { geoNaturalEarth1, geoPath } from 'https://cdn.jsdelivr.net/npm/d3-geo@3/+esm';

/* ─── Rutas de datos ─────────────────────────────────────── */
const BASE = '/data/dashboard-nacional/';
const DATA = {
  worldMap:      BASE + 'participacion_economica_mujeres_por_pais.json',
  tpe:           BASE + 'participacion-mexico-historica.json',
  brecha:        BASE + 'evolucion_brecha_salarial_genero_mexico_fuente.json',
  informalidad:  BASE + 'evolucion_informalidad_laboral_por_sexo_fuente.json',
  cuidados:      BASE + 'valor_economico_cuidados_fuente.json',
  worldGeoJSON:  'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson',
};

/* ─── Paleta ────────────────────────────────────────────── */
const C = {
  primary:  '#6f4fe8',
  accent:   '#ff7b53',
  good:     '#2f9e88',
  women:    '#7f79fb',
  men:      '#ff7b53',
  neutral:  '#aab0c4',
  muted:    '#7b809a',
  grid:     '#ece9f8',
  bgLight:  '#f9f7ff',
};

/* ─── Helpers ────────────────────────────────────────────── */
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
  return r.json();
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function lerp(a, b, t) { return a + (b - a) * t; }

function normVal(v, min, max) {
  if (max === min) return 0;
  return (v - min) / (max - min);
}

function colorFromValue(v, min, max, stops = ['#e5e4fe', '#7f79fb']) {
  const t = normVal(v, min, max);
  // simple two-stop linear interpolation in RGB
  const parseHex = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r0,g0,b0] = parseHex(stops[0]);
  const [r1,g1,b1] = parseHex(stops[1]);
  const r = Math.round(lerp(r0, r1, t));
  const g = Math.round(lerp(g0, g1, t));
  const b = Math.round(lerp(b0, b1, t));
  return `rgb(${r},${g},${b})`;
}

function makeSvgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function buildLinePathD(pts) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
}

/* ─── SCROLL PROGRESS BAR ──────────────────────────────── */
const progressBar = document.getElementById('scroll-progress-bar');

function updateProgress() {
  const scrollTop = window.scrollY;
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docH > 0 ? (scrollTop / docH) * 100 : 0;
  progressBar.style.width = `${Math.min(100, pct).toFixed(2)}%`;
}

/* ─── NAV DOTS ──────────────────────────────────────────── */
const navDots    = document.querySelectorAll('.nav-dot');
const navLabel   = document.getElementById('nav-label-pill');
const navHome    = document.getElementById('nav-home');
const chapters   = document.querySelectorAll('[data-chapter-idx]');

navHome.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
document.getElementById('hero-cta').addEventListener('click', () => {
  document.getElementById('chapter-1').scrollIntoView({ behavior: 'smooth' });
});
navDots.forEach((dot) => {
  dot.addEventListener('click', () => {
    const idx = Number(dot.dataset.chapter);
    const target = document.getElementById(`chapter-${idx}`);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
  dot.addEventListener('mouseenter', () => {
    navLabel.textContent = dot.dataset.label || '';
    navLabel.style.opacity = '1';
  });
  dot.addEventListener('mouseleave', () => {
    navLabel.style.opacity = '0';
  });
});

function setActiveNav(idx) {
  navDots.forEach((d, i) => d.classList.toggle('active', i === idx));
}

// Observe which chapter is most in view
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const idx = Number(entry.target.dataset.chapterIdx);
      setActiveNav(idx);
    }
  });
}, { threshold: 0.35 });
chapters.forEach((c) => navObserver.observe(c));

/* ─── NARRATIVE STEP OBSERVER ──────────────────────────── */
// On mobile, all blocks are always visible. On desktop, we fade them in based on scroll.
function setupNarrativeObserver() {
  if (window.innerWidth <= 900) return; // mobile: all blocks visible

  const blocks = document.querySelectorAll('.narrative-block');
  const blockObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const block = entry.target;
      if (entry.isIntersecting) {
        // Deactivate siblings, activate this one
        const siblings = block.closest('.chapter-scroll-body')?.querySelectorAll('.narrative-block') || [];
        siblings.forEach((s) => {
          if (s === block) {
            s.classList.add('active');
            s.classList.remove('seen');
          } else if (s.getBoundingClientRect().top < entry.boundingClientRect.top) {
            s.classList.remove('active');
            s.classList.add('seen');
          } else {
            s.classList.remove('active', 'seen');
          }
        });
      }
    });
  }, { threshold: 0.55 });

  blocks.forEach((b) => blockObs.observe(b));
}

/* ─── CHAPTER VISUAL LOADER ────────────────────────────── */
// Cada capítulo carga su gráfica lazy cuando entra al viewport.
const visualsLoaded = new Set();

const chapterObs = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const id = entry.target.id;
    if (visualsLoaded.has(id)) return;
    visualsLoaded.add(id);
    loadChapterVisual(id);
  });
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

[1, 2, 3, 4, 5].forEach((n) => {
  const el = document.getElementById(`chapter-${n}`);
  if (el) chapterObs.observe(el);
});

async function loadChapterVisual(chapterId) {
  switch (chapterId) {
    case 'chapter-1': return renderCh1();
    case 'chapter-2': return renderCh2();
    case 'chapter-3': return renderCh3();
    case 'chapter-4': return renderCh4();
    case 'chapter-5': return renderCh5();
  }
}

/* ─── CH1: WORLD MAP ────────────────────────────────────── */
async function renderCh1() {
  const panel = document.getElementById('visual-ch1');
  try {
    const [data, geo] = await Promise.all([fetchJSON(DATA.worldMap), fetchJSON(DATA.worldGeoJSON)]);

    // Build value map
    const items = Array.isArray(data)
      ? data.filter((d) => typeof d.tpe === 'number').map((d) => ({ name: d.pais, value: d.tpe }))
      : [];
    if (!items.length) throw new Error('No hay datos');

    const min = Math.min(...items.map((d) => d.value));
    const max = Math.max(...items.map((d) => d.value));
    const valueMap = new Map(items.map((d) => [normalizeStr(d.name), d.value]));
    const labelMap = new Map(items.map((d) => [normalizeStr(d.name), d.name]));

    const features = (geo.features || []).filter((f) => {
      const n = normalizeStr(getFeatureName(f));
      return n !== 'antarctica' && n !== 'antartida';
    });

    const W = 900, H = 440;
    const projection = geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], {
      type: 'FeatureCollection', features
    });
    projection.scale(projection.scale() * 1.1);
    const [tx, ty] = projection.translate();
    projection.translate([tx, ty + 10]);
    const pathGen = geoPath(projection);

    // Build SVG
    panel.innerHTML = `
      <div class="chart-title">Participación económica femenina por país (%)</div>
      <div class="chart-svg-wrap" style="position:relative">
        <svg viewBox="0 0 ${W} ${H}" id="world-svg" class="chart-svg" role="img" aria-label="Mapa mundial de participación económica femenina">
          <rect x="0" y="0" width="${W}" height="${H}" fill="#f4f2fc" rx="12"/>
        </svg>
        <div id="map-tooltip" style="position:fixed;z-index:500;background:rgba(31,35,64,.92);color:#fff;padding:.4rem .7rem;border-radius:10px;font-size:.75rem;pointer-events:none;display:none;line-height:1.45"></div>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;font-size:.7rem;color:${C.muted};margin-top:.4rem">
        <span>0%</span>
        <div style="flex:1;height:8px;border-radius:999px;background:linear-gradient(90deg,#e5e4fe,#7f79fb)"></div>
        <span>~90%</span>
        <span style="margin-left:.5rem"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#eceaf5;margin-right:.25rem"></span>Sin dato</span>
      </div>
      <div class="chart-source-text">Fuente: IMCO con datos del Banco Mundial, último dato disponible para 184 países.</div>
    `;

    const svg = panel.querySelector('#world-svg');
    const tooltip = panel.querySelector('#map-tooltip');

    // Render paths
    features.forEach((f) => {
      const d = pathGen(f);
      if (!d) return;
      const norm = normalizeStr(getFeatureName(f));
      const value = valueMap.get(norm) ?? null;
      const label = labelMap.get(norm) || getFeatureName(f);
      const fill = value === null ? '#eceaf5' : colorFromValue(value, min, max);
      const isMexico = norm === 'mexico' || norm === 'méxico';

      const path = makeSvgEl('path', {
        d,
        fill,
        stroke: isMexico ? C.accent : '#fff',
        'stroke-width': isMexico ? '1.8' : '0.5',
        'data-name': label,
        'data-value': value === null ? '' : value.toFixed(1),
        'data-mx': isMexico ? '1' : '',
      });
      if (isMexico) {
        path.classList.add('highlight-mx');
        path.style.filter = 'drop-shadow(0 0 5px rgba(255,123,83,0.7))';
      }
      svg.appendChild(path);
    });

    // Tooltip
    svg.addEventListener('mousemove', (e) => {
      const t = e.target;
      if (!(t instanceof SVGPathElement)) { tooltip.style.display = 'none'; return; }
      const name = t.dataset.name || '';
      const val  = t.dataset.value;
      tooltip.innerHTML = `<strong>${escHtml(name)}</strong><br>Participación ec. femenina: ${val ? val + '%' : 'Sin dato'}`;
      tooltip.style.display = 'block';
      tooltip.style.left = `${e.clientX + 10}px`;
      tooltip.style.top  = `${e.clientY + 10}px`;
    });
    svg.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

    // México label
    const mxPath = svg.querySelector('[data-mx="1"]');
    if (mxPath) {
      const bbox = mxPath.getBBox();
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2 - 8;
      const label = makeSvgEl('text', {
        x: cx, y: cy,
        'text-anchor': 'middle',
        'font-size': '9',
        'font-weight': '700',
        fill: C.accent,
        'pointer-events': 'none',
      });
      label.textContent = 'MX 42.3%';
      svg.appendChild(label);
    }
  } catch {
    panel.innerHTML = '<div class="visual-loading">No fue posible cargar el mapa.</div>';
  }
}

/* ─── CH2: TPE HISTÓRICA ───────────────────────────────── */
async function renderCh2() {
  const panel = document.getElementById('visual-ch2');
  try {
    const data = await fetchJSON(DATA.tpe);
    const labels = data.labels || [];
    const series = data.series || [];

    const W = 560, H = 280;
    const pad = { top: 20, right: 30, bottom: 38, left: 42 };
    const w = W - pad.left - pad.right;
    const h = H - pad.top - pad.bottom;

    const allValues = series.flatMap((s) => s.values).filter((v) => typeof v === 'number');
    const yMin = Math.max(0, Math.min(...allValues) - 4);
    const yMax = Math.min(100, Math.max(...allValues) + 4);
    const xStep = w / Math.max(labels.length - 1, 1);

    const toX = (i) => pad.left + i * xStep;
    const toY = (v) => pad.top + h - ((v - yMin) / (yMax - yMin)) * h;

    panel.innerHTML = `
      <div class="chart-title">Tasa de Participación Económica por sexo (%)</div>
      <div class="chart-legend-row">
        ${series.map((s) => `<span><span class="legend-dot" style="background:${s.color}"></span>${escHtml(s.name)}</span>`).join('')}
      </div>
      <div class="chart-svg-wrap">
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg" id="tpe-svg" role="img" aria-label="Evolución TPE por sexo"></svg>
      </div>
      <div class="chart-source-text">Fuente: IMCO con datos ENOE INEGI, 3T 2005–2025.</div>
    `;

    const svg = panel.querySelector('#tpe-svg');

    // Grid lines & year labels
    const yTicks = [40, 50, 60, 70, 80];
    yTicks.forEach((v) => {
      if (v < yMin || v > yMax) return;
      const y = toY(v);
      const line = makeSvgEl('line', { x1: pad.left, y1: y, x2: pad.left + w, y2: y, stroke: C.grid, 'stroke-width': 1 });
      const text = makeSvgEl('text', { x: pad.left - 6, y: y + 4, 'text-anchor': 'end', fill: C.muted, 'font-size': '9' });
      text.textContent = v + '%';
      svg.appendChild(line);
      svg.appendChild(text);
    });

    // X axis labels every 5 years
    labels.forEach((lbl, i) => {
      const year = parseInt(lbl);
      if (year % 5 !== 0) return;
      const x = toX(i);
      const text = makeSvgEl('text', { x, y: H - 8, 'text-anchor': 'middle', fill: C.muted, 'font-size': '9' });
      text.textContent = lbl;
      svg.appendChild(text);
    });

    // Brecha area (fill between men & women)
    const womenSeries = series.find((s) => s.name === 'Mujeres');
    const menSeries   = series.find((s) => s.name === 'Hombres');
    if (womenSeries && menSeries) {
      const areaPoints = [
        ...womenSeries.values.map((v, i) => [toX(i), toY(v)]),
        ...menSeries.values.map((v, i) => [toX(menSeries.values.length - 1 - i), toY(v)]).reverse().map(([x, y], i, arr) => [toX(arr.length - 1 - i), y])
      ];
      // Rebuild properly
      const wPts = womenSeries.values.map((v, i) => [toX(i), toY(v)]);
      const mPts = menSeries.values.map((v, i) => [toX(i), toY(v)]);
      const areaD = wPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
        + ' ' + [...mPts].reverse().map((p, i) => `${i === 0 ? 'L' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
        + ' Z';
      const area = makeSvgEl('path', {
        d: areaD,
        fill: 'rgba(111,79,232,0.07)',
        stroke: 'none',
      });
      svg.appendChild(area);
    }

    // Series lines with animation
    series.forEach((s, si) => {
      const pts = s.values.map((v, i) => [toX(i), toY(v)]);
      const pathD = buildLinePathD(pts);

      const path = makeSvgEl('path', {
        d: pathD,
        fill: 'none',
        stroke: s.color,
        'stroke-width': si === 0 ? '2.5' : '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        class: 'line-path-animated',
      });

      // Measure path length for animation
      svg.appendChild(path);
      const len = path.getTotalLength ? path.getTotalLength() : 3000;
      path.style.setProperty('--path-len', len);
      path.setAttribute('stroke-dasharray', len);
      path.setAttribute('stroke-dashoffset', len);

      // Animate shortly after
      setTimeout(() => path.classList.add('drawn'), 100 + si * 200);

      // End-point dot
      const last = pts[pts.length - 1];
      const dot = makeSvgEl('circle', { cx: last[0], cy: last[1], r: '4', fill: s.color });
      dot.style.opacity = '0';
      setTimeout(() => { dot.style.transition = 'opacity .4s ease'; dot.style.opacity = '1'; }, 2100 + si * 200);
      svg.appendChild(dot);

      // Label at end
      const label = makeSvgEl('text', {
        x: last[0] + 5, y: last[1] + 4,
        fill: s.color, 'font-size': '10', 'font-weight': '700',
      });
      label.textContent = s.name === 'Mujeres' ? `${s.values[s.values.length-1].toFixed(1)}%` : `${s.values[s.values.length-1].toFixed(1)}%`;
      label.style.opacity = '0';
      setTimeout(() => { label.style.transition = 'opacity .4s ease'; label.style.opacity = '1'; }, 2300 + si * 200);
      svg.appendChild(label);
    });

    // Series name labels
    const nameLabels = [
      { s: womenSeries, offset: -10 },
      { s: menSeries, offset: 10 },
    ];
    nameLabels.forEach(({ s, offset }) => {
      if (!s) return;
      const mid = Math.floor(s.values.length / 2);
      const x = toX(mid);
      const y = toY(s.values[mid]) + offset;
      const t = makeSvgEl('text', { x, y, 'text-anchor': 'middle', fill: s.color, 'font-size': '10', 'font-weight': '700' });
      t.textContent = s.name;
      t.style.opacity = '0';
      setTimeout(() => { t.style.transition = 'opacity .4s ease'; t.style.opacity = '1'; }, 2500);
      svg.appendChild(t);
    });

  } catch (e) {
    console.error(e);
    panel.innerHTML = '<div class="visual-loading">No fue posible cargar los datos.</div>';
  }
}

/* ─── CH3: BRECHA SALARIAL ─────────────────────────────── */
async function renderCh3() {
  const panel = document.getElementById('visual-ch3');
  try {
    const raw = await fetchJSON(DATA.brecha);
    const rows = (raw?.sheets?.Hoja1 || []).filter((r) => typeof r.Año === 'number' && r.Brecha !== null);
    const labels = rows.map((r) => String(r.Año));
    const values = rows.map((r) => r.Brecha * 100); // convert to %

    const W = 560, H = 260;
    const pad = { top: 20, right: 30, bottom: 38, left: 46 };
    const w = W - pad.left - pad.right;
    const h = H - pad.top  - pad.bottom;
    const yMin = 0, yMax = 25;
    const toX = (i) => pad.left + (i / (labels.length - 1)) * w;
    const toY = (v) => pad.top + h - ((v - yMin) / (yMax - yMin)) * h;

    panel.innerHTML = `
      <div class="chart-title">Brecha salarial de género en México (%)</div>
      <p style="font-size:.78rem;color:${C.muted};margin:.2rem 0 .5rem">Diferencia porcentual del ingreso promedio hombre vs. mujer</p>
      <div class="chart-svg-wrap">
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg" id="brecha-svg" role="img" aria-label="Evolución brecha salarial"></svg>
      </div>
      <div class="chart-source-text">Fuente: IMCO con promedio cuatro trimestres ENOE, INEGI, 2005–2025.</div>
    `;
    const svg = panel.querySelector('#brecha-svg');

    // Grid
    [5, 10, 15, 20].forEach((v) => {
      const y = toY(v);
      const gl = makeSvgEl('line', { x1: pad.left, y1: y, x2: pad.left+w, y2: y, stroke: C.grid, 'stroke-width': 1 });
      const gt = makeSvgEl('text', { x: pad.left - 5, y: y+4, 'text-anchor': 'end', fill: C.muted, 'font-size': '9' });
      gt.textContent = v + '%';
      svg.appendChild(gl); svg.appendChild(gt);
    });
    // x label every 5 yrs
    labels.forEach((l, i) => {
      if (parseInt(l) % 5 !== 0) return;
      const xt = makeSvgEl('text', { x: toX(i), y: H - 8, 'text-anchor': 'middle', fill: C.muted, 'font-size': '9' });
      xt.textContent = l;
      svg.appendChild(xt);
    });

    // Area under curve
    const pts = values.map((v, i) => [toX(i), toY(v)]);
    const baseline = toY(0);
    const areaD = pts.map((p, i) => `${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
      + ` L${pts[pts.length-1][0].toFixed(1)},${baseline} L${pts[0][0].toFixed(1)},${baseline} Z`;
    const area = makeSvgEl('path', { d: areaD, fill: 'rgba(255,123,83,0.12)', stroke:'none' });
    svg.appendChild(area);

    // Line
    const pathD = buildLinePathD(pts);
    const linePath = makeSvgEl('path', {
      d: pathD, fill:'none', stroke: C.accent, 'stroke-width':'2.5',
      'stroke-linecap':'round', 'stroke-linejoin':'round', class:'line-path-animated',
    });
    svg.appendChild(linePath);
    const len = linePath.getTotalLength ? linePath.getTotalLength() : 3000;
    linePath.style.setProperty('--path-len', len);
    linePath.setAttribute('stroke-dasharray', len);
    linePath.setAttribute('stroke-dashoffset', len);
    setTimeout(() => linePath.classList.add('drawn'), 100);

    // Annotate peak and last
    const peakIdx = values.indexOf(Math.max(...values));
    const peakX = toX(peakIdx); const peakY = toY(values[peakIdx]);
    const peakDot = makeSvgEl('circle', { cx: peakX, cy: peakY, r: '5', fill: C.accent });
    svg.appendChild(peakDot);
    const peakLabel = makeSvgEl('text', { x: peakX, y: peakY - 10, 'text-anchor':'middle', fill: C.accent, 'font-size':'10', 'font-weight':'700' });
    peakLabel.textContent = `Pico: ${values[peakIdx].toFixed(1)}%`;
    svg.appendChild(peakLabel);

    // 2020 COVID mark
    const covidIdx = labels.indexOf('2020');
    if (covidIdx >= 0) {
      const cx = toX(covidIdx);
      const cline = makeSvgEl('line', { x1:cx, y1:pad.top, x2:cx, y2:pad.top+h, stroke:'rgba(47,158,136,.5)', 'stroke-width':'1.5', 'stroke-dasharray':'4 3' });
      const ctext = makeSvgEl('text', { x:cx+3, y:pad.top+12, fill: C.good, 'font-size':'9' });
      ctext.textContent = 'COVID';
      svg.appendChild(cline); svg.appendChild(ctext);
    }

  } catch(e) {
    console.error(e);
    panel.innerHTML = '<div class="visual-loading">No fue posible cargar los datos.</div>';
  }
}

/* ─── CH4: INFORMALIDAD ────────────────────────────────── */
async function renderCh4() {
  const panel = document.getElementById('visual-ch4');
  try {
    const raw = await fetchJSON(DATA.informalidad);
    // Use annual averages (take every 4th row ~ annual)
    const rows = (raw?.sheets?.Hoja1 || []).filter((r) => r.Trimestre && typeof r.Hombres === 'number');
    // Reduce to ~annual by taking first trimestre of each year
    const annual = rows.filter((r) => r.Trimestre.startsWith('1T') || r.Trimestre.startsWith('3T 2020'));
    const labels = annual.map((r) => r.Trimestre.slice(3)); // extract year
    const wValues = annual.map((r) => r.Mujeres * 100);
    const mValues = annual.map((r) => r.Hombres * 100);

    const W = 560, H = 270;
    const pad = { top: 20, right: 30, bottom: 38, left: 46 };
    const w = W - pad.left - pad.right;
    const h = H - pad.top - pad.bottom;
    const yMin = 40, yMax = 70;
    const toX = (i) => pad.left + (i / (labels.length - 1)) * w;
    const toY = (v) => pad.top + h - ((v - yMin) / (yMax - yMin)) * h;

    panel.innerHTML = `
      <div class="chart-title">Informalidad laboral por sexo (%)</div>
      <div class="chart-legend-row">
        <span><span class="legend-dot" style="background:${C.women}"></span>Mujeres</span>
        <span><span class="legend-dot" style="background:${C.men}"></span>Hombres</span>
      </div>
      <div class="chart-svg-wrap">
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg" id="inf-svg" role="img" aria-label="Informalidad por sexo"></svg>
      </div>
      <div class="chart-source-text">Fuente: IMCO con datos trimestrales ENOE, INEGI, 2005–2025.</div>
    `;
    const svg = panel.querySelector('#inf-svg');

    // Grid
    [45, 50, 55, 60, 65].forEach((v) => {
      if (v < yMin || v > yMax) return;
      const y = toY(v);
      const gl = makeSvgEl('line', { x1:pad.left, y1:y, x2:pad.left+w, y2:y, stroke: C.grid, 'stroke-width':1 });
      const gt = makeSvgEl('text', { x:pad.left-5, y:y+4, 'text-anchor':'end', fill: C.muted, 'font-size':'9' });
      gt.textContent = v + '%';
      svg.appendChild(gl); svg.appendChild(gt);
    });
    labels.forEach((l, i) => {
      if (i % 3 !== 0) return;
      const xt = makeSvgEl('text', { x:toX(i), y:H-8, 'text-anchor':'middle', fill: C.muted, 'font-size':'9' });
      xt.textContent = l;
      svg.appendChild(xt);
    });

    // Area between series
    const wPts = wValues.map((v, i) => [toX(i), toY(v)]);
    const mPts = mValues.map((v, i) => [toX(i), toY(v)]);
    const areaD = wPts.map((p, i) => `${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
      + ' ' + [...mPts].reverse().map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z';
    svg.appendChild(makeSvgEl('path', { d:areaD, fill:'rgba(111,79,232,0.07)', stroke:'none' }));

    // Lines
    [{ pts:wPts, color:C.women, name:'Mujeres' }, { pts:mPts, color:C.men, name:'Hombres' }].forEach(({ pts, color, name }, si) => {
      const pathD = buildLinePathD(pts);
      const lp = makeSvgEl('path', {
        d:pathD, fill:'none', stroke:color, 'stroke-width':'2.5',
        'stroke-linecap':'round', 'stroke-linejoin':'round', class:'line-path-animated',
      });
      svg.appendChild(lp);
      const len = lp.getTotalLength ? lp.getTotalLength() : 2000;
      lp.style.setProperty('--path-len', len);
      lp.setAttribute('stroke-dasharray', len);
      lp.setAttribute('stroke-dashoffset', len);
      setTimeout(() => lp.classList.add('drawn'), 100 + si * 200);

      // End labels
      const last = pts[pts.length - 1];
      const dot = makeSvgEl('circle', { cx:last[0], cy:last[1], r:'4', fill:color });
      svg.appendChild(dot);
      const lt = makeSvgEl('text', { x:last[0]+5, y:last[1]+4, fill:color, 'font-size':'10', 'font-weight':'700' });
      lt.textContent = name;
      svg.appendChild(lt);
    });

  } catch(e) {
    console.error(e);
    panel.innerHTML = '<div class="visual-loading">No fue posible cargar los datos.</div>';
  }
}

/* ─── CH5: CUIDADOS (STACKED BARS) ─────────────────────── */
async function renderCh5() {
  const panel = document.getElementById('visual-ch5');
  try {
    const raw = await fetchJSON(DATA.cuidados);
    const rows = (raw?.sheets?.Hoja1 || []).filter((r) => typeof r.Año === 'number');
    const maxTotal = Math.max(...rows.map((r) => r.Total));

    panel.innerHTML = `
      <div class="chart-title">Trabajo no remunerado en hogares (% del PIB)</div>
      <div class="chart-legend-row">
        <span><span class="legend-dot" style="background:${C.women}"></span>Mujeres</span>
        <span><span class="legend-dot" style="background:${C.accent}"></span>Hombres</span>
      </div>
      <div id="care-bars" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:.28rem;padding:.2rem 0;"></div>
      <div class="chart-source-text">Fuente: IMCO con datos INEGI Cuenta Satélite del Trabajo No Remunerado, 2003–2024.</div>
    `;
    const container = panel.querySelector('#care-bars');

    rows.forEach((row, idx) => {
      // Only show every other year to keep it readable
      if (idx % 2 !== 0) return;
      const wPct = (row.Mujeres / maxTotal) * 100;
      const mPct = (row.Hombres / maxTotal) * 100;
      const wrap = document.createElement('div');
      wrap.className = 'care-bar-row';
      wrap.innerHTML = `
        <div class="care-bar-year">${row.Año} — Total: ${(row.Total * 100).toFixed(0)}% PIB</div>
        <div class="care-bar-track" title="${row.Año}: Mujeres ${(row.Mujeres*100).toFixed(0)}%, Hombres ${(row.Hombres*100).toFixed(0)}%">
          <div class="care-bar-fill women" style="width:${wPct.toFixed(1)}%;transition-delay:${idx*30}ms"></div>
          <div class="care-bar-fill men"   style="width:${mPct.toFixed(1)}%;transition-delay:${idx*30+60}ms"></div>
        </div>
      `;
      container.appendChild(wrap);
    });

    // Animate with IntersectionObserver on the panel itself
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        panel.querySelectorAll('.care-bar-fill').forEach((el) => el.classList.add('drawn'));
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(panel);

  } catch(e) {
    console.error(e);
    panel.innerHTML = '<div class="visual-loading">No fue posible cargar los datos.</div>';
  }
}

/* ─── COUNTRY HELPERS (for world map) ──────────────────── */
function normalizeStr(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

const COUNTRY_ALIAS = {
  'mexico': 'mexico',
  'mxico': 'mexico',
  'brazil': 'brasil',
  'united states of america': 'estados unidos',
  'united states': 'estados unidos',
  'russia': 'rusia',
  'russian federation': 'rusia',
  'czechia': 'republica checa',
  'czech republic': 'republica checa',
  'south korea': 'corea del sur',
  'north korea': 'corea del norte',
};

function getFeatureName(f) {
  return f?.properties?.name || f?.properties?.NAME || '';
}

/* ─── SCROLL LISTENER ───────────────────────────────────── */
window.addEventListener('scroll', updateProgress, { passive: true });

/* ─── INIT ──────────────────────────────────────────────── */
updateProgress();
setupNarrativeObserver();
