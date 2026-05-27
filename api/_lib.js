// Utilidades de transformación compartidas entre api/sync.js
// y el script local scripts/sync-data-from-sheets.mjs.
// Sin dependencias de sistema de archivos.

export async function fetchRowsFromCsv(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CSV no disponible (${response.status}) en ${url}`);
  }
  const csv = await response.text();
  const matrix = parseCsv(csv);
  if (!matrix.length) return [];

  const headers = matrix[0].map((h) => String(h ?? '').trim());
  const rows = [];
  for (let i = 1; i < matrix.length; i++) {
    const raw = matrix[i];
    if (!raw || raw.every((c) => String(c ?? '').trim() === '')) continue;
    const row = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c] || `col_${c + 1}`] = autoType(raw[c] ?? '');
    }
    rows.push(row);
  }
  return rows;
}

export function applyTransform(inputData, transform) {
  const type = transform.type || 'array';

  if (type === 'array') return inputData;

  if (type === 'sheet-wrapper') {
    if (!Array.isArray(inputData)) throw new Error('sheet-wrapper requiere array');
    return {
      source_file: transform.sourceFile || '',
      sheets: { [transform.sheetName || 'Hoja1']: inputData },
    };
  }

  if (type === 'scope-data-wrapper') {
    if (!Array.isArray(inputData)) throw new Error('scope-data-wrapper requiere array');
    return {
      source_file: transform.sourceFile || '',
      scope: transform.scope || '',
      data: inputData,
    };
  }

  if (type === 'entity-enriched') {
    if (!Array.isArray(inputData)) throw new Error('entity-enriched requiere array');
    return buildEntityEnriched(inputData, transform);
  }

  if (type === 'tpe-line') return buildTpeLineChart(inputData, transform);

  throw new Error(`Transform no soportado: ${type}`);
}

// ── Transforms internos ───────────────────────────────────────────────────────

function buildEntityEnriched(rows, transform) {
  const cleaned = rows
    .map((r) => ({
      Entidad: String(r.Entidad ?? '').trim(),
      Variable: String(r.Variable ?? '').trim(),
      Valor: Number(r.Valor),
      Que_mide: String(r.Que_mide ?? '').trim(),
      Unidad: String(r.Unidad ?? '').trim(),
      Fuente: String(r.Fuente ?? '').trim(),
    }))
    .filter((r) => r.Entidad && r.Variable && Number.isFinite(r.Valor));

  const entidades = [...new Set(cleaned.map((r) => r.Entidad))].sort((a, b) =>
    a.localeCompare(b, 'es')
  );

  const varMap = new Map();
  for (const r of cleaned) {
    if (varMap.has(r.Variable)) continue;
    varMap.set(r.Variable, {
      key: slugify(r.Variable),
      label: r.Variable,
      unidad: r.Unidad,
      queMide: r.Que_mide,
    });
  }

  const values = Object.fromEntries(entidades.map((e) => [e, {}]));
  for (const r of cleaned) values[r.Entidad][r.Variable] = r.Valor;

  return {
    source_file: transform.sourceFile || '',
    sheet: transform.sheetName || 'Sheet1',
    rows: cleaned.length,
    columns: ['Entidad', 'Variable', 'Valor', 'Que_mide', 'Unidad'],
    entidades,
    variables: [...varMap.values()],
    values,
    data: cleaned,
  };
}

function buildTpeLineChart(inputData, transform) {
  const rows = (Array.isArray(inputData) ? inputData : [])
    .map((r) => ({
      year: Number(r?.Año ?? r?.Ano ?? r?.year),
      mujeres: normalizeRateToPercent(r?.Mujeres ?? r?.mujeres),
      hombres: normalizeRateToPercent(r?.Hombres ?? r?.hombres),
    }))
    .filter((r) => [r.year, r.mujeres, r.hombres].every(Number.isFinite))
    .sort((a, b) => a.year - b.year);

  return {
    unit: '%',
    min: Number.isFinite(transform.min) ? transform.min : 35,
    max: Number.isFinite(transform.max) ? transform.max : 85,
    source: transform.source || '',
    labels: rows.map((r) => String(r.year)),
    series: [
      { name: 'Mujeres', color: '#7f79fb', values: rows.map((r) => +r.mujeres.toFixed(2)) },
      { name: 'Hombres', color: '#6d6e70', values: rows.map((r) => +r.hombres.toFixed(2)) },
    ],
  };
}

function normalizeRateToPercent(v) {
  const n = Number(v);
  return Number.isFinite(n) ? (n <= 1 ? n * 100 : n) : NaN;
}

function slugify(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function autoType(value) {
  const text = String(value ?? '').trim();
  if (text === '') return null;
  const norm = text.replace(/ /g, ' ').replace(/,/g, '');
  if (/^-?\d+(\.\d+)?$/.test(norm)) {
    const n = Number(norm);
    if (Number.isFinite(n)) return n;
  }
  if (/^(true|false)$/i.test(text)) return text.toLowerCase() === 'true';
  return text;
}

function parseCsv(input) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i], next = input[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') { cell += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) { row.push(cell); cell = ''; continue; }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (!(row.length === 1 && row[0] === '')) rows.push(row);
  return rows;
}
