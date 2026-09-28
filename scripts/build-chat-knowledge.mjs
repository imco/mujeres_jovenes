// Construye api/_chat-knowledge.js: el conocimiento que usa el asistente de IA
// (api/chat.js) para responder sobre el monitor.
//
//   npm run data:chat        (también corre antes de cada `npm run build`)
//
// Condensa los datos de public/data/ en texto compacto —tablas en una línea por
// fila, cifras redondeadas— porque se envía completo en cada pregunta y la capa
// gratuita de Gemini limita los tokens por minuto. Incluye el mapa del sitio con
// los identificadores de pestaña y sección que el modelo usa para proponer enlaces.

import fs from 'node:fs/promises';
import path from 'node:path';
import { TABS } from '../assets/js/tabs.js';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'public/data');
const OUTPUT = path.join(ROOT, 'api/_chat-knowledge.js');

const read = async (rel) => JSON.parse(await fs.readFile(path.join(DATA, rel), 'utf8'));
const r1 = (v) => (Number.isFinite(v) ? Number(v.toFixed(1)) : 'sin dato');
const pct = (v) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : 'sin dato');
const money = (v) => (Number.isFinite(v) ? `$${Math.round(v).toLocaleString('en-US')}` : 'sin dato');
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const out = [];
const h = (text) => out.push(`\n## ${text}`);
const line = (text) => out.push(text);

// ── Mapa del sitio ───────────────────────────────────────────────────────────
line('# MAPA DEL SITIO');
line('Cada sección tiene un identificador de pestaña (pestana) y de sección (seccion) para proponer enlaces.');
for (const tab of TABS) {
  line(`- Pestaña "${tab.label}" → pestana="${tab.id}"${tab.title ? ` (encabezado: ${tab.title})` : ''}`);
  for (const s of tab.sections) {
    const titulo = clean(s.title) || clean(s.subtitle) || s.key;
    line(`  - seccion="${s.key}": ${titulo}${s.subtitle && s.title ? ` — ${clean(s.subtitle)}` : ''}`);
  }
}

out.push('\n# DATOS POR SECCIÓN');

// ── Nacional ────────────────────────────────────────────────────────────────
{
  const paises = await read('dashboard-nacional/participacion_economica_mujeres_por_pais.json');
  const rows = paises.filter((p) => Number.isFinite(p.tpe)).sort((a, b) => b.tpe - a.tpe);
  const mx = rows.find((p) => /m[eé]xico/i.test(p.pais));
  h('Nacional > participacion-global (mapa mundial)');
  line('Tasa de participación económica de las mujeres por país (%), ordenada de mayor a menor.');
  if (mx) line(`México: ${r1(mx.tpe)}%, lugar ${rows.indexOf(mx) + 1} de ${rows.length}.`);
  line(rows.map((p, i) => `${i + 1}. ${p.pais} ${r1(p.tpe)}`).join('; '));

  const tpe = await read('dashboard-nacional/participacion-mexico-historica.json');
  h('Nacional > evolucion-tpe (línea)');
  line(`Tasa de participación económica en México por sexo (%), tercer trimestre. ${clean(tpe.source)}`);
  for (const serie of tpe.series) {
    line(`${serie.name}: ${tpe.labels.map((y, i) => `${y} ${r1(serie.values[i])}`).join(', ')}`);
  }

  const brecha = await read('dashboard-nacional/evolucion_brecha_salarial_genero_mexico_fuente.json');
  h('Nacional > brecha-salarial-genero (línea)');
  line('Brecha salarial por género en México (%), promedio de los cuatro trimestres de la ENOE.');
  line(brecha.sheets.Hoja1.map((r) => `${r['Año']} ${pct(r.Brecha)}`).join(', '));

  const inf = await read('dashboard-nacional/evolucion_informalidad_laboral_por_sexo_fuente.json');
  const infRows = inf.sheets.Hoja1;
  h('Nacional > informalidad-laboral-sexo (línea)');
  line('Tasa de informalidad laboral (TIL2) por sexo, trimestral. Se muestran los terceros trimestres y el último dato.');
  const pick = infRows.filter((r, i) => /^3T/.test(r.Trimestre) || i === infRows.length - 1);
  line(pick.map((r) => `${r.Trimestre}: mujeres ${pct(r.Mujeres)}, hombres ${pct(r.Hombres)}`).join('; '));

  const cuid = await read('dashboard-nacional/valor_economico_cuidados_fuente.json');
  h('Nacional > valor-cuidados (barras apiladas)');
  line('Valor del trabajo no remunerado de los hogares como % del PIB (total, aportado por mujeres y por hombres).');
  line(cuid.sheets.Hoja1.map((r) => `${r['Año']}: total ${pct(r.Total)} (mujeres ${pct(r.Mujeres)}, hombres ${pct(r.Hombres)})`).join('; '));
}

// ── Indicadores por entidad o alcaldía (formato Entidad/Variable/Valor) ───────
function indicatorBlock(title, rows, placeLabel) {
  h(title);
  const variables = [...new Set(rows.map((r) => r.Variable))];
  line(`Selecciona el indicador con el campo "indicador" usando el nombre exacto. ${variables.length} indicadores por ${placeLabel}.`);
  for (const v of variables) {
    const sub = rows.filter((r) => r.Variable === v && Number.isFinite(r.Valor));
    const first = sub[0] || {};
    const sorted = sub.slice().sort((a, b) => b.Valor - a.Valor);
    line(`\n### Indicador "${v}" (${clean(first.Unidad)})`);
    if (first.Que_mide) line(`Qué mide: ${clean(first.Que_mide)}`);
    if (first.Fuente) line(`Fuente: ${clean(first.Fuente)}`);
    line(`Valores de mayor a menor: ${sorted.map((r) => `${r.Entidad} ${r1(r.Valor)}`).join('; ')}`);
  }
}

{
  const ent = await read('estadisticas-entidad/variables_monitor_entidad_enriched.json');
  indicatorBlock('Estatal > mapa-indicadores-entidad (Estados #ConLupaDeGénero)', ent.data, 'entidad federativa');
  const cdmx = await read('cdmx-alcaldia/monitor_cdmx_indicadores.json');
  indicatorBlock('CDMX > mapa-indicadores-cdmx (mujeres jóvenes de 15 a 29 años por alcaldía)', cdmx.data, 'alcaldía');
}

// ── STEM ────────────────────────────────────────────────────────────────────
{
  const stem = await read('stem/monitor_stem.json');
  const g = Object.fromEntries(stem.graficas.map((x) => [x.id, x]));
  const series = (graf, fmt) => graf.series.map((s) =>
    `${s.nombre}: ${graf.categorias.map((c, i) => `${clean(c)} ${fmt(s.datos[i])}`).join('; ')}`);

  h('STEM > stem-pisa-historico');
  line(`${g.historico_pisa.titulo}. ${clean(g.historico_pisa.fuente)}`);
  series(g.historico_pisa, (v) => (v == null ? 'sin dato' : v)).forEach(line);

  h('STEM > stem-nivel-matematicas');
  line(`${g.nivel_matematicas.titulo}. ${clean(g.nivel_matematicas.fuente)}`);
  series(g.nivel_matematicas, pct).forEach(line);

  h('STEM > stem-matricula-area');
  line(`${g.matricula_por_area.titulo}. ${clean(g.matricula_por_area.fuente)}`);
  series(g.matricula_por_area, pct).forEach(line);

  h('STEM > stem-map-matricula');
  line(`${g.mapa_matricula_stem.titulo}. ${clean(g.mapa_matricula_stem.fuente)}`);
  line(g.mapa_matricula_stem.datos.slice().sort((a, b) => b.proporcion - a.proporcion)
    .map((d) => `${d.entidad} ${pct(d.proporcion)}`).join('; '));

  h('STEM > stem-map-profesionistas');
  line(`${g.mapa_profesionistas_stem.titulo}. ${clean(g.mapa_profesionistas_stem.fuente)}`);
  line(g.mapa_profesionistas_stem.datos.slice().sort((a, b) => b.proporcion - a.proporcion)
    .map((d) => `${d.entidad} ${pct(d.proporcion)}`).join('; '));

  h('STEM > stem-mercado-laboral');
  line(`${g.mercado_laboral_stem.titulo}. ${clean(g.mercado_laboral_stem.fuente)}`);
  series(g.mercado_laboral_stem, pct).forEach(line);
  if (g.mercado_laboral_stem.ingreso_promedio_stem) {
    line(`Ingreso promedio mensual de las profesionistas STEM: ${money(g.mercado_laboral_stem.ingreso_promedio_stem)}.`);
  }
}

// ── Brecha salarial (explorador) ────────────────────────────────────────────
{
  const b = await read('brecha-salarial/monitor_brecha.json');
  const cortes = new Map(b.cortes.map((c) => [c.id, c]));
  const catLabel = (corteId, catId) => cortes.get(corteId)?.categorias.find((c) => c.id === catId)?.label || catId;
  const pair = (p) => (p ? `M ${money(p.m)} / H ${money(p.h)} / brecha ${p.b.toFixed(1)}%` : 'sin observaciones suficientes');

  h('Brecha salarial > brecha-salarial (explorador interactivo)');
  line('Ingresos mensuales por sexo (M = mujeres, H = hombres) y brecha = (H − M) ÷ H × 100. Universo: personas ocupadas que trabajan 30 horas o más a la semana. Fuente: ENOE (INEGI), 3T2025.');
  line('Para enlazar una vista usa variable1, variable2 (opcional) y medicion ("mediana" o "media"). Identificadores de variable:');
  for (const c of b.cortes) {
    line(`- variable="${c.id}": ${c.label}${c.soloMediana ? ' (solo mediana)' : ''}${c.combinables.length ? `; combinable con: ${c.combinables.join(', ')}` : '; no admite segunda variable'}`);
  }
  const n = b.nacional;
  line(`Nacional: mediana ${pair(n.mediana)}; promedio ${pair(n.media)}.`);
  line(`Distribución de ingresos (variable nivel_ingresos, mediana): percentil 25 ${pair(n.percentiles.p25)}; mediana ${pair(n.percentiles.p50)}; percentil 75 ${pair(n.percentiles.p75)}.`);

  for (const [id, rows] of Object.entries(b.unicos)) {
    line(`\n### ${cortes.get(id).label} (variable1="${id}")`);
    for (const r of rows) {
      line(`${r.label}: mediana ${pair(r.mediana)}; promedio ${pair(r.media)}`);
    }
  }
  for (const [key, rows] of Object.entries(b.combinados)) {
    const [a, c] = key.split('|');
    line(`\n### ${cortes.get(a).label} × ${cortes.get(c).label} (variable1="${a}", variable2="${c}"; también en orden inverso)`);
    for (const r of rows) {
      line(`${catLabel(a, r.c1)} / ${catLabel(c, r.c2)}: mediana ${pair(r.mediana)}; promedio ${pair(r.media)}`);
    }
  }
}

// ── Investigaciones ─────────────────────────────────────────────────────────
{
  const inv = await read('investigaciones/investigaciones.json');
  h('Investigaciones > investigaciones');
  for (const i of inv) line(`- ${i.titulo} (${i.fecha}): ${clean(i.resumen)} URL: ${i.url}`);
}

// ── Salida ──────────────────────────────────────────────────────────────────
const knowledge = out.join('\n').trim();
const siteMap = TABS.map((t) => ({
  id: t.id,
  label: t.label,
  sections: t.sections.map((s) => s.key),
}));

await fs.writeFile(OUTPUT, `// Generado por scripts/build-chat-knowledge.mjs — no editar a mano.
export const SITE_MAP = ${JSON.stringify(siteMap)};

export const KNOWLEDGE = ${JSON.stringify(knowledge)};
`, 'utf8');

const kb = (Buffer.byteLength(knowledge) / 1024).toFixed(1);
console.log(`[ok] ${path.relative(ROOT, OUTPUT)} (${kb} KB de texto, ~${Math.round(knowledge.length / 3.6 / 1000)}k tokens)`);
