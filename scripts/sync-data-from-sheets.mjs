import fs from 'node:fs/promises';
import path from 'node:path';

const CONFIG_PATH = path.resolve(process.cwd(), 'scripts/data-sources.config.json');
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const configRaw = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = JSON.parse(configRaw);
  const sources = Array.isArray(config.sources) ? config.sources : [];

  if (!sources.length) {
    console.log('No hay fuentes configuradas en scripts/data-sources.config.json');
    return;
  }

  let processed = 0;
  for (const sourceConfig of sources) {
    if (!sourceConfig || sourceConfig.enabled !== true) continue;

    const sourceInfo = await readSourceData(sourceConfig.source || {});
    if (!sourceInfo) {
      console.warn(`[skip] ${sourceConfig.id}: falta source.localJsonPath o source.csvUrl o source.spreadsheetId + gid`);
      continue;
    }

    console.log(`[sync] ${sourceConfig.id} <- ${sourceInfo.debugLabel}`);
    const outputData = applyTransform(sourceInfo.data, sourceConfig.transform || {});

    const outputPath = path.resolve(process.cwd(), sourceConfig.output);
    if (DRY_RUN) {
      const count = Array.isArray(sourceInfo.data) ? sourceInfo.data.length : 1;
      console.log(`[dry-run] ${sourceConfig.id}: ${count} registros -> ${sourceConfig.output}`);
      processed += 1;
      continue;
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(outputData, null, 2)}\n`, 'utf8');
    console.log(`[ok] ${sourceConfig.output}`);
    processed += 1;
  }

  console.log(`Finalizado. Fuentes procesadas: ${processed}`);
}

async function readSourceData(source) {
  const localJsonPath = String(source.localJsonPath || '').trim();
  if (localJsonPath) {
    const resolved = path.resolve(process.cwd(), localJsonPath);
    const raw = await fs.readFile(resolved, 'utf8');
    return {
      data: JSON.parse(raw),
      debugLabel: localJsonPath
    };
  }

  const sourceUrl = buildSourceUrl(source || {});
  if (!sourceUrl) return null;

  return {
    data: await fetchRowsFromCsv(sourceUrl),
    debugLabel: sourceUrl
  };
}

function buildSourceUrl(source) {
  if (source.sheetUrl && String(source.sheetUrl).trim()) {
    const parsed = parseGoogleSheetUrl(String(source.sheetUrl).trim());
    if (parsed?.spreadsheetId && parsed?.gid) {
      return `https://docs.google.com/spreadsheets/d/${parsed.spreadsheetId}/export?format=csv&gid=${parsed.gid}`;
    }
  }

  if (source.csvUrl && String(source.csvUrl).trim()) {
    return String(source.csvUrl).trim();
  }

  const spreadsheetId = String(source.spreadsheetId || '').trim();
  const gid = String(source.gid || '').trim();
  if (!spreadsheetId || !gid) return '';

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

function parseGoogleSheetUrl(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    const spreadsheetId = match?.[1] || '';
    const gid = parsed.searchParams.get('gid') || '';
    if (!spreadsheetId || !gid) return null;
    return { spreadsheetId, gid };
  } catch {
    return null;
  }
}

async function fetchRowsFromCsv(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar CSV (${response.status}) de ${url}`);
  }

  const csv = await response.text();
  const matrix = parseCsv(csv);
  if (!matrix.length) return [];

  const headers = matrix[0].map((header) => String(header || '').trim());
  const rows = [];

  for (let i = 1; i < matrix.length; i += 1) {
    const rawRow = matrix[i];
    if (!rawRow || rawRow.every((cell) => String(cell || '').trim() === '')) continue;

    const row = {};
    for (let c = 0; c < headers.length; c += 1) {
      const key = headers[c] || `col_${c + 1}`;
      row[key] = autoType(rawRow[c] ?? '');
    }
    rows.push(row);
  }

  return rows;
}

function applyTransform(inputData, transform) {
  const type = transform.type || 'array';

  if (type === 'array') {
    return inputData;
  }

  if (type === 'sheet-wrapper') {
    if (!Array.isArray(inputData)) {
      throw new Error('sheet-wrapper requiere un array de filas');
    }
    const sheetName = transform.sheetName || 'Hoja1';
    return {
      source_file: transform.sourceFile || '',
      sheets: {
        [sheetName]: inputData
      }
    };
  }

  if (type === 'scope-data-wrapper') {
    if (!Array.isArray(inputData)) {
      throw new Error('scope-data-wrapper requiere un array de filas');
    }
    return {
      source_file: transform.sourceFile || '',
      scope: transform.scope || '',
      data: inputData
    };
  }

  if (type === 'entity-enriched') {
    if (!Array.isArray(inputData)) {
      throw new Error('entity-enriched requiere un array de filas');
    }
    return buildEntityEnriched(inputData, transform);
  }

  if (type === 'tpe-line') {
    return buildTpeLineChart(inputData, transform);
  }

  throw new Error(`Transform type no soportado: ${type}`);
}

function buildEntityEnriched(rows, transform) {
  const cleanedRows = rows
    .map((row) => ({
      Entidad: String(row.Entidad || '').trim(),
      Variable: String(row.Variable || '').trim(),
      Valor: Number(row.Valor),
      Que_mide: String(row.Que_mide || '').trim(),
      Unidad: String(row.Unidad || '').trim()
    }))
    .filter((row) => row.Entidad && row.Variable && Number.isFinite(row.Valor));

  const entidades = [...new Set(cleanedRows.map((row) => row.Entidad))]
    .sort((a, b) => a.localeCompare(b, 'es'));

  const variableMap = new Map();
  for (const row of cleanedRows) {
    if (variableMap.has(row.Variable)) continue;
    variableMap.set(row.Variable, {
      key: slugify(row.Variable),
      label: row.Variable,
      unidad: row.Unidad,
      queMide: row.Que_mide
    });
  }

  const values = {};
  for (const entidad of entidades) {
    values[entidad] = {};
  }
  for (const row of cleanedRows) {
    values[row.Entidad][row.Variable] = row.Valor;
  }

  return {
    source_file: transform.sourceFile || '',
    sheet: transform.sheetName || 'Sheet1',
    rows: cleanedRows.length,
    columns: ['Entidad', 'Variable', 'Valor', 'Que_mide', 'Unidad'],
    entidades,
    variables: [...variableMap.values()],
    values,
    data: cleanedRows
  };
}

function buildTpeLineChart(inputData, transform) {
  const rows = Array.isArray(inputData) ? inputData : [];
  const parsedRows = rows
    .map((row) => ({
      year: Number(row?.Año ?? row?.Ano ?? row?.Anio ?? row?.year),
      mujeres: normalizeRateToPercent(row?.Mujeres ?? row?.mujeres),
      hombres: normalizeRateToPercent(row?.Hombres ?? row?.hombres)
    }))
    .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.mujeres) && Number.isFinite(row.hombres))
    .sort((a, b) => a.year - b.year);

  return {
    unit: '%',
    min: Number.isFinite(transform.min) ? transform.min : 35,
    max: Number.isFinite(transform.max) ? transform.max : 85,
    source: transform.source || '',
    labels: parsedRows.map((row) => String(row.year)),
    series: [
      {
        name: 'Mujeres',
        color: '#7f79fb',
        values: parsedRows.map((row) => +row.mujeres.toFixed(2))
      },
      {
        name: 'Hombres',
        color: '#6d6e70',
        values: parsedRows.map((row) => +row.hombres.toFixed(2))
      }
    ]
  };
}

function normalizeRateToPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return n <= 1 ? n * 100 : n;
}

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function autoType(value) {
  const text = String(value ?? '').trim();
  if (text === '') return null;

  const normalized = text.replace(/\u00a0/g, ' ').replace(/,/g, '');
  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    const n = Number(normalized);
    if (Number.isFinite(n)) return n;
  }

  if (/^(true|false)$/i.test(text)) {
    return text.toLowerCase() === 'true';
  }

  return text;
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  if (!(row.length === 1 && row[0] === '')) {
    rows.push(row);
  }

  return rows;
}

main().catch((error) => {
  console.error(`Error en data:sync -> ${error.message}`);
  process.exitCode = 1;
});
