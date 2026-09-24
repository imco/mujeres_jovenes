// Construye public/data/brecha-salarial/monitor_brecha.json a partir de los
// Excel entregados por el área de datos (scripts/sources/brecha/).
//
//   npm run data:brecha
//
// Fuentes:
//   - Base_monitor_brecha_*.xlsx       → ingresos y brechas por corte
//   - Cortes y textos_*.xlsx           → matriz de cortes permitidos y textos
//
// El JSON resultante es todo lo que necesita la pestaña: el explorador corre
// en el cliente sin más peticiones.

import fs from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';

const ROOT = process.cwd();
const SOURCES_DIR = path.join(ROOT, 'scripts/sources/brecha');
const OUTPUT = path.join(ROOT, 'public/data/brecha-salarial/monitor_brecha.json');

// ── Catálogo de cortes ───────────────────────────────────────────────────────
// `aliases` cubre las variantes con que cada corte aparece en los nombres de
// hoja, en la matriz y en la hoja de textos.
const CORTES = [
  { id: 'nivel_ingresos', label: 'Nivel de ingresos',       aliases: ['nivel de ingresos'] },
  { id: 'ingreso_hora',   label: 'Ingreso por hora',        aliases: ['ingreso por hora'] },
  { id: 'estado',         label: 'Entidad federativa',      aliases: ['estado', 'entidad federativa'] },
  { id: 'jornada',        label: 'Jornada laboral',         aliases: ['duración de la jornada laboral', 'jornada'] },
  { id: 'informalidad',   label: 'Informalidad laboral',    aliases: ['condición de informalidad', 'informalidad'] },
  { id: 'puesto',         label: 'Nivel de puesto',         aliases: ['nivel de puesto'] },
  { id: 'escolaridad',    label: 'Escolaridad',             aliases: ['escolaridad'] },
  { id: 'edad',           label: 'Edad',                    aliases: ['edad'] },
  { id: 'maternidad',     label: 'Maternidad y paternidad', aliases: ['maternidad y paternidad', 'maternidad'] },
];

// Aclaraciones bajo el nombre de algunas categorías (tomadas del mockup y de
// las notas metodológicas de la hoja de textos).
const DESCRIPCIONES = {
  informalidad: {
    'empleo-formal': 'con acceso a seguridad social',
    'empleo-informal': 'sin acceso a seguridad social',
  },
  jornada: {
    'tiempo-completo': '35 horas o más a la semana',
    'tiempo-parcial': 'menos de 35 horas a la semana',
  },
  ingreso_hora: {
    total: 'todas las personas ocupadas',
    'tiempo-completo': '35 horas o más a la semana',
    'tiempo-parcial': 'menos de 35 horas a la semana',
  },
};

const norm = (s) => String(s ?? '').replace(/\*/g, '').trim().toLowerCase();

function corteIdFrom(name) {
  const n = norm(name);
  const hit = CORTES.find((c) => c.aliases.includes(n));
  if (!hit) throw new Error(`Corte desconocido: "${name}"`);
  return hit.id;
}

function slugify(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// "1a - Alta dirección" → "Alta dirección" (el código SINCO solo sirve para ordenar).
// Exige espacios alrededor del guion para no tocar rangos como "15-19".
const cleanLabel = (s) => String(s).trim().replace(/^\d+[a-z]?\s+-\s+/i, '');

const round = (v, d = 2) => (Number.isFinite(v) ? Number(v.toFixed(d)) : null);

// Brecha = (H − M) ÷ H × 100, con un decimal de precisión útil.
function brecha(m, h) {
  if (!Number.isFinite(m) || !Number.isFinite(h) || h === 0) return null;
  return round(((h - m) / h) * 100, 4);
}

function pair(m, h, decimals) {
  const mm = Number(m);
  const hh = Number(h);
  if (!Number.isFinite(mm) || !Number.isFinite(hh)) return null;
  return { m: round(mm, decimals), h: round(hh, decimals), b: brecha(mm, hh) };
}

const isRepr = (v) => v === true || String(v).trim().toLowerCase() === 'true';

function readSheet(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Falta la hoja "${name}"`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  const headers = (rows[1] || []).map((h) => String(h).trim());
  return rows.slice(2).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}

async function findSource(prefix) {
  const files = await fs.readdir(SOURCES_DIR);
  const hit = files.filter((f) => f.startsWith(prefix) && f.endsWith('.xlsx')).sort().pop();
  if (!hit) throw new Error(`No hay archivo "${prefix}*.xlsx" en ${SOURCES_DIR}`);
  return path.join(SOURCES_DIR, hit);
}

// ── Lectura ──────────────────────────────────────────────────────────────────
const basePath = await findSource('Base_monitor_brecha');
const textosPath = await findSource('Cortes y textos');
const base = XLSX.readFile(basePath);
const textosWb = XLSX.readFile(textosPath);
const warnings = [];

// Nacional + percentiles (hoja "Nivel de ingresos", una sola fila).
const [ni] = readSheet(base, 'Nivel de ingresos');
const nacional = {
  label: 'Nacional',
  descripcion: 'todas las personas ocupadas',
  media: pair(ni.ing_media_m, ni.ing_media_h, 2),
  mediana: pair(ni.ing_mediana_m, ni.ing_mediana_h, 2),
  percentiles: {
    p25: pair(ni.ing_p25_m, ni.ing_p25_h, 2),
    p50: pair(ni.ing_mediana_m, ni.ing_mediana_h, 2),
    p75: pair(ni.ing_p75_m, ni.ing_p75_h, 2),
  },
};

// ── Cortes únicos ────────────────────────────────────────────────────────────
const UNICO_SHEETS = {
  ingreso_hora: 'Ingreso por hora',
  estado: 'Estado',
  jornada: 'Duración de la jornada laboral',
  informalidad: 'Condición de Informalidad',
  puesto: 'Nivel de puesto',
  escolaridad: 'Escolaridad',
  edad: 'Edad',
  maternidad: 'Maternidad y paternidad',
};

const unicos = {};
const categorias = {};
let suppressedTotal = 0;

for (const [corteId, sheet] of Object.entries(UNICO_SHEETS)) {
  const decimals = corteId === 'ingreso_hora' ? 2 : 0;
  const rows = [];
  for (const r of readSheet(base, sheet)) {
    // En "Estado" la categoría vive en la columna entidad; en el resto, en corte_valor.
    const raw = corteId === 'estado' ? r.entidad : r.corte_valor;
    const label = String(raw ?? '').trim();
    // Filas de nota al pie (p. ej. "*Las clasificaciones se dan a partir del SINCO…").
    if (!label || label.startsWith('*')) continue;
    if (corteId === 'estado' && norm(label) === 'nacional') continue;
    const repr = isRepr(r.repr_95);
    if (!repr) suppressedTotal += 1;
    rows.push({
      id: slugify(cleanLabel(label)),
      label: cleanLabel(label),
      repr,
      media: repr ? pair(r.ing_media_m, r.ing_media_h, decimals) : null,
      mediana: repr ? pair(r.ing_mediana_m, r.ing_mediana_h, decimals) : null,
    });
  }
  unicos[corteId] = rows;
  categorias[corteId] = rows.map(({ id, label }) => ({
    id,
    label,
    ...(DESCRIPCIONES[corteId]?.[id] ? { descripcion: DESCRIPCIONES[corteId][id] } : {}),
  }));
}

// Validación de la fórmula: la brecha del Excel debe coincidir con (H−M)/H.
for (const r of readSheet(base, 'Condición de Informalidad')) {
  const own = brecha(Number(r.ing_media_m), Number(r.ing_media_h));
  if (Math.abs(own - Number(r.brecha_media) * 100) > 0.05) {
    warnings.push(`Brecha del Excel no coincide con (H−M)/H en informalidad/${r.corte_valor}`);
  }
}

// ── Cortes combinados ────────────────────────────────────────────────────────
// Cada hoja "A_x_B" se guarda bajo la clave "a|b" en el orden de la hoja; el
// cliente invierte el orden cuando el usuario elige B como corte 1.
const combinados = {};
for (const sheet of base.SheetNames.filter((n) => n.includes('_x_'))) {
  const [a, b] = sheet.split('_x_').map(corteIdFrom);
  const idsA = new Set(categorias[a].map((c) => c.id));
  const idsB = new Set(categorias[b].map((c) => c.id));
  const rows = [];
  for (const r of readSheet(base, sheet)) {
    const l1 = String(r.corte_valor_1 ?? '').trim();
    const l2 = String(r.corte_valor_2 ?? '').trim();
    if (!l1 || !l2 || l1.startsWith('*')) continue;
    const c1 = slugify(cleanLabel(l1));
    const c2 = slugify(cleanLabel(l2));
    if (!idsA.has(c1) || !idsB.has(c2)) {
      warnings.push(`${sheet}: categoría sin equivalente en cortes únicos (${l1} / ${l2})`);
    }
    const repr = isRepr(r.repr_95);
    if (!repr) suppressedTotal += 1;
    rows.push({
      c1,
      c2,
      repr,
      media: repr ? pair(r.ing_media_m, r.ing_media_h, 0) : null,
      mediana: repr ? pair(r.ing_mediana_m, r.ing_mediana_h, 0) : null,
      n: { m: Number(r.n_m) || null, h: Number(r.n_h) || null },
      pob: { m: Number(r.n_pob_m) || null, h: Number(r.n_pob_h) || null },
    });
  }
  combinados[`${a}|${b}`] = rows;
}

// ── Matriz de cortes permitidos ──────────────────────────────────────────────
const matriz = XLSX.utils.sheet_to_json(textosWb.Sheets.Cortes, { header: 1, blankrows: false, defval: '' });
const headerRow = matriz.find((r) => norm(r[1]) === 'cortes');
const colIds = headerRow.slice(2).map((h) => (String(h).trim() ? corteIdFrom(h) : null));
const soloMediana = new Set(
  headerRow.slice(2).filter((h) => String(h).includes('*')).map(corteIdFrom)
);
const combinables = {};
for (const row of matriz.slice(matriz.indexOf(headerRow) + 1)) {
  let rowId;
  try { rowId = corteIdFrom(row[1]); } catch { continue; }
  combinables[rowId] = [];
  row.slice(2).forEach((cell, i) => {
    if (colIds[i] && /^s[ií]/i.test(String(cell).trim())) combinables[rowId].push(colIds[i]);
  });
}

// ── Textos ───────────────────────────────────────────────────────────────────
const textosRows = XLSX.utils.sheet_to_json(textosWb.Sheets.Textos, { header: 1, blankrows: false, defval: '' });
const textos = {};
for (const r of textosRows.slice(2)) {
  if (!String(r[2]).trim()) continue;
  const c1 = corteIdFrom(r[2]);
  const c2 = String(r[3]).trim() && String(r[3]).trim() !== '—' ? corteIdFrom(r[3]) : '';
  const medicion = /mediana/i.test(r[4]) ? 'mediana' : 'media';
  textos[`${c1}|${c2}|${medicion}`] = {
    titulo: String(r[5]).trim(),
    subtitulo: String(r[6]).trim(),
    fuente: String(r[7]).trim(),
    ...(String(r[8]).trim() ? { cuadro: String(r[8]).trim() } : {}),
    ...(String(r[9]).trim() ? { nota: String(r[9]).trim() } : {}),
  };
}

// ── Coherencia entre matriz, datos y textos ─────────────────────────────────
const medicionesDe = (id) => (soloMediana.has(id) ? ['mediana'] : ['media', 'mediana']);
for (const c1 of Object.keys(combinables)) {
  for (const m of medicionesDe(c1)) {
    if (!textos[`${c1}||${m}`]) warnings.push(`Falta texto para ${c1} (${m})`);
  }
  for (const c2 of combinables[c1]) {
    if (!combinados[`${c1}|${c2}`] && !combinados[`${c2}|${c1}`]) {
      warnings.push(`La matriz permite ${c1} × ${c2} pero no hay hoja de datos`);
    }
    for (const m of ['media', 'mediana']) {
      if (!textos[`${c1}|${c2}|${m}`]) warnings.push(`Falta texto para ${c1} × ${c2} (${m})`);
    }
  }
}
const sinUso = Object.keys(combinados).filter((k) => {
  const [a, b] = k.split('|');
  return !combinables[a]?.includes(b) && !combinables[b]?.includes(a);
});
for (const k of sinUso) delete combinados[k];

// ── Salida ───────────────────────────────────────────────────────────────────
const output = {
  meta: {
    periodo: '3T2025',
    unidad: 'Pesos mensuales',
    fuentes: [path.basename(basePath), path.basename(textosPath)],
  },
  nacional,
  cortes: CORTES.map(({ id, label }) => ({
    id,
    label,
    soloMediana: soloMediana.has(id),
    unidad: id === 'ingreso_hora' ? 'hora' : 'mensual',
    // Fila de referencia al inicio de la gráfica: el total nacional, salvo en
    // ingreso por hora, donde el nacional mensual no es comparable y se usa "Total".
    referencia: id === 'ingreso_hora' ? 'total' : 'nacional',
    combinables: combinables[id] ?? [],
    categorias: categorias[id] ?? [],
  })),
  unicos,
  combinados,
  textos,
};

await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, `${JSON.stringify(output)}\n`, 'utf8');

const size = (await fs.stat(OUTPUT)).size;
console.log(`[ok] ${path.relative(ROOT, OUTPUT)} (${(size / 1024).toFixed(1)} KB)`);
console.log(`     cortes únicos: ${Object.keys(unicos).length} · combinados: ${Object.keys(combinados).length} · textos: ${Object.keys(textos).length}`);
console.log(`     filas no representativas ocultas: ${suppressedTotal}`);
if (sinUso.length) console.log(`     hojas descartadas por la matriz: ${sinUso.join(', ')}`);
for (const w of warnings) console.warn(`[aviso] ${w}`);
