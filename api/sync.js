// POST /api/sync
// Body JSON: { "password": "...", "section": "nombre_opcional" }
//
// Descarga cada sección desde Google Sheets (CSV público), aplica el
// transform correspondiente y guarda el resultado en @vercel/blob.
// Las secciones UPSERT (acumulativas) fusionan filas nuevas con las
// existentes sin borrar historial; el resto se reemplazan completamente.

import { put, list } from '@vercel/blob';
import { fetchRowsFromCsv, applyTransform } from './_lib.js';

const SPREADSHEET_ID = '18I_XYerve-1L6NVIRNiHkvbw6EudJ1DpB-5gBUOY4n0';
const BLOB_PREFIX    = 'mj';

// ── Metadatos fijos del JSON de STEM (no vienen de Sheets) ───────────────────
const STEM_META = {
  monitor: 'Mujeres en STEM',
  subtitulo: 'Ciencia, Tecnología, Ingeniería y Matemáticas',
  version: '1.0',
};

// Colores de series STEM
const STEM_COLORS = {
  Mujeres: '#7f79fb', Hombres: '#ff7b53',
  Matemáticas: '#7f79fb', Lectura: '#ff7b53', Ciencias: '#6d6e70',
  'Profesionistas STEM': '#7f79fb', Profesionistas: '#ff7b53', Nacional: '#6d6e70',
};

// ── Definición de secciones ───────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'participacion_global',
    gid: '0',
    transform: { type: 'array' },
  },
  {
    id: 'brecha_salarial',
    gid: '253482696',
    transform: {
      type: 'sheet-wrapper',
      sheetName: 'Hoja1',
      sourceFile: 'evolucion de la brecha salarial por genero en mexico.xlsx',
    },
  },
  {
    id: 'informalidad',
    gid: '761524869',
    transform: {
      type: 'sheet-wrapper',
      sheetName: 'Hoja1',
      sourceFile: 'Evolución de la informalidad laboral por sexo.xlsx',
    },
  },
  {
    id: 'valor_cuidados',
    gid: '1495501902',
    transform: {
      type: 'sheet-wrapper',
      sheetName: 'Hoja1',
      sourceFile: 'tnr pib.xlsx',
    },
  },
  {
    id: 'entidad_enriched',
    gid: '1208416458',
    transform: {
      type: 'entity-enriched',
      sheetName: 'Sheet1',
      sourceFile: 'Variables_Monitor_Entidad_Tableau_FINAL.xlsx',
    },
  },
  {
    id: 'cdmx_indicadores',
    gid: '207678363',
    transform: {
      type: 'scope-data-wrapper',
      scope: 'cdmx_alcaldia',
      sourceFile: 'Monitor_pestaña cdmx.xlsx',
    },
  },
  // ── TPE histórica (serie anual por sexo) ───────────────────────────────────
  {
    id: 'tpe_historica',
    gid: '1159629718',
    transform: {
      type: 'tpe-line',
      min: 35, max: 85,
      source: 'Fuente: Elaborado por el IMCO con datos del tercer trimestre de la Encuesta Nacional de Ocupación y Empleo (ENOE) del INEGI de 2005 a 2025.',
    },
  },
  // ── STEM (multi-sheet: 6 hojas → 1 blob monitor_stem.json) ────────────────
  {
    id: 'stem',
    type: 'multi-sheet',
    sheets: {
      pisa:               '1191344712',
      nivel_mat:          '1401655572',
      matricula_area:     '386556375',
      mapa_matricula:     '1577242925',
      mapa_profesionistas:'1469134912',
      mercado_laboral:    '1471172721',
    },
    transform: { type: 'stem-combined' },
  },
];

// Secciones ACUMULATIVAS: solo agrega filas, nunca borra historial.
// Upsert por clave compuesta — si la clave ya existe, actualiza el valor.
const UPSERT_SECTIONS = new Set(['informalidad']);
const SECTION_KEYS = {
  informalidad: ['Trimestre'],
};

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, section } = req.body ?? {};

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const targets = section
    ? SECTIONS.filter((s) => s.id === section)
    : SECTIONS;

  if (!targets.length) {
    return res.status(400).json({ error: `Sección '${section}' no encontrada` });
  }

  // Cargar manifest existente para conservar URLs de secciones no tocadas
  const manifest = await loadManifest();

  // Procesar todas las secciones en paralelo
  const results = await Promise.allSettled(targets.map((cfg) => syncSection(cfg, manifest)));

  const synced = [];
  const errors = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const id = targets[i].id;
    if (r.status === 'fulfilled') {
      manifest[id] = r.value.url;
      synced.push({ id, rows: r.value.rows, url: r.value.url });
    } else {
      errors.push({ id, error: r.reason?.message ?? String(r.reason) });
    }
  }

  // Guardar manifest actualizado
  await put(`${BLOB_PREFIX}/manifest.json`, JSON.stringify(manifest), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });

  const status = synced.length === 0 ? 500 : 200;
  return res.status(status).json({ synced, errors, manifest });
}

// ── Sincroniza una sección ────────────────────────────────────────────────────
async function syncSection(cfg, manifest) {
  // Sección multi-sheet (STEM): descarga varias hojas y las combina
  if (cfg.type === 'multi-sheet') {
    return syncMultiSheet(cfg);
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${cfg.gid}`;
  const newRows = await fetchRowsFromCsv(csvUrl);

  const finalRows = UPSERT_SECTIONS.has(cfg.id)
    ? await upsertRows(cfg, newRows, manifest)
    : newRows;

  const data = applyTransform(finalRows, cfg.transform);

  const { url } = await put(
    `${BLOB_PREFIX}/${cfg.id}.json`,
    JSON.stringify(data),
    { access: 'public', addRandomSuffix: false, contentType: 'application/json' }
  );

  return { url, rows: newRows.length };
}

// ── Multi-sheet: descarga N hojas y aplica transform stem-combined ────────────
async function syncMultiSheet(cfg) {
  const csvUrl = (gid) =>
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;

  const [pisa, nivelMat, matriculaArea, mapaMat, mapaProf, mercado] =
    await Promise.all([
      fetchRowsFromCsv(csvUrl(cfg.sheets.pisa)),
      fetchRowsFromCsv(csvUrl(cfg.sheets.nivel_mat)),
      fetchRowsFromCsv(csvUrl(cfg.sheets.matricula_area)),
      fetchRowsFromCsv(csvUrl(cfg.sheets.mapa_matricula)),
      fetchRowsFromCsv(csvUrl(cfg.sheets.mapa_profesionistas)),
      fetchRowsFromCsv(csvUrl(cfg.sheets.mercado_laboral)),
    ]);

  const data = buildStemJson({ pisa, nivelMat, matriculaArea, mapaMat, mapaProf, mercado });

  const { url } = await put(
    `${BLOB_PREFIX}/${cfg.id}.json`,
    JSON.stringify(data),
    { access: 'public', addRandomSuffix: false, contentType: 'application/json' }
  );

  const totalRows = pisa.length + nivelMat.length + matriculaArea.length +
    mapaMat.length + mapaProf.length + mercado.length;
  return { url, rows: totalRows };
}

// ── Reconstruye monitor_stem.json desde las 6 hojas de Sheets ────────────────
function buildStemJson({ pisa, nivelMat, matriculaArea, mapaMat, mapaProf, mercado }) {
  const color = (name) => STEM_COLORS[name] ?? '#888888';

  // historico_pisa: columnas = Año + series
  const pisaCols = Object.keys(pisa[0] ?? {}).filter((k) => k !== 'Año');
  const pisaGrafica = {
    id: 'historico_pisa', tipo: 'linea_multiple',
    titulo: 'Histórico de puntajes obtenidos por México entre 2003 y 2022',
    fuente: 'PISA, OCDE', unidad: 'Puntaje',
    categorias: pisa.map((r) => String(r['Año'])),
    series: pisaCols.map((col) => ({
      nombre: col, color: color(col),
      datos: pisa.map((r) => r[col] ?? null),
    })),
  };

  // nivel_matematicas: columnas = Nivel + series
  const nivelCols = Object.keys(nivelMat[0] ?? {}).filter((k) => k !== 'Nivel');
  const nivelGrafica = {
    id: 'nivel_matematicas', tipo: 'barra_horizontal_agrupada',
    titulo: 'Nivel de desempeño en matemáticas por sexo',
    fuente: 'PISA, OCDE', unidad: 'Proporción',
    categorias: nivelMat.map((r) => r['Nivel']),
    series: nivelCols.map((col) => ({
      nombre: col, color: color(col),
      datos: nivelMat.map((r) => r[col] ?? null),
    })),
  };

  // matricula_area: columnas = Area + series
  const matCols = Object.keys(matriculaArea[0] ?? {}).filter((k) => k !== 'Area');
  const matriculaGrafica = {
    id: 'matricula_por_area', tipo: 'barra_apilada_horizontal_100',
    titulo: 'Distribución de matrícula de hombres y mujeres por área de estudio',
    fuente: 'SEP', unidad: 'Proporción',
    categorias: matriculaArea.map((r) => r['Area']),
    series: matCols.map((col) => ({
      nombre: col, color: color(col),
      datos: matriculaArea.map((r) => r[col] ?? null),
    })),
  };

  // mapa_matricula
  const mapaMatGrafica = {
    id: 'mapa_matricula_stem', tipo: 'mapa_choropleth_mexico',
    titulo: 'Proporción de mujeres que estudian una carrera STEM respecto al total de alumnas',
    fuente: 'SEP', unidad: 'Proporción',
    categorias: [],
    datos: mapaMat.map((r) => ({
      entidad: r['Entidad'], codigo_iso: r['Codigo_ISO'],
      alumnas_stem: r['Alumnas_STEM'], total_alumnas: r['Total_Alumnas'],
      proporcion: r['Proporcion'],
    })),
  };

  // mapa_profesionistas
  const mapaProfGrafica = {
    id: 'mapa_profesionistas_stem', tipo: 'mapa_choropleth_mexico',
    titulo: 'Proporción de profesionistas STEM respecto al total de profesionistas por estado',
    fuente: 'ENOE, INEGI', unidad: 'Proporción',
    categorias: [],
    datos: mapaProf.map((r) => ({
      entidad: r['Entidad'], codigo_iso: r['Codigo_ISO'],
      profesionistas_stem: r['Profesionistas_STEM'],
      total_profesionistas: r['Total_Profesionistas'],
      proporcion: r['Proporcion'],
    })),
  };

  // mercado_laboral: columnas = Categoria + series + Ingreso_Promedio_STEM
  const mercadoCols = Object.keys(mercado[0] ?? {})
    .filter((k) => k !== 'Categoria' && k !== 'Ingreso_Promedio_STEM');
  const ingresoRow = mercado.find((r) => r['Ingreso_Promedio_STEM']);
  const mercadoGrafica = {
    id: 'mercado_laboral_stem', tipo: 'barra_agrupada',
    titulo: 'Indicadores del mercado laboral para mujeres por área de estudios',
    fuente: 'ENOE, INEGI', unidad: 'Proporción',
    ingreso_promedio_stem: ingresoRow?.['Ingreso_Promedio_STEM'] ?? null,
    categorias: mercado.map((r) => r['Categoria']),
    series: mercadoCols.map((col) => ({
      nombre: col, color: color(col),
      datos: mercado.map((r) => r[col] ?? null),
    })),
  };

  return {
    ...STEM_META,
    fecha_datos: String(new Date().getFullYear()),
    graficas: [nivelGrafica, pisaGrafica, matriculaGrafica,
               mapaMatGrafica, mapaProfGrafica, mercadoGrafica],
  };
}

// ── Upsert: fusiona nuevas filas con las existentes sin borrar historial ──────
async function upsertRows(cfg, newRows, manifest) {
  const existingData = await fetchBlobData(manifest[cfg.id]);
  if (!existingData) return newRows;

  // Extraer filas crudas del blob (antes del transform)
  let existingRows = [];
  if (cfg.transform.type === 'sheet-wrapper') {
    existingRows = existingData?.sheets?.[cfg.transform.sheetName] ?? [];
  } else if (cfg.transform.type === 'scope-data-wrapper') {
    existingRows = existingData?.data ?? [];
  } else if (cfg.transform.type === 'array') {
    existingRows = Array.isArray(existingData) ? existingData : [];
  }

  const keys = SECTION_KEYS[cfg.id] ?? [];
  if (!keys.length) return newRows;

  const makeKey = (row) => keys.map((k) => row[k]).join('|');
  const map = new Map(existingRows.map((r) => [makeKey(r), r]));
  for (const r of newRows) map.set(makeKey(r), r);

  return [...map.values()];
}

// ── Helpers de blob ───────────────────────────────────────────────────────────
async function fetchBlobData(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function loadManifest() {
  try {
    const { blobs } = await list({ prefix: `${BLOB_PREFIX}/manifest.json`, limit: 1 });
    if (!blobs.length) return {};
    const res = await fetch(blobs[0].url);
    return res.ok ? res.json() : {};
  } catch {
    return {};
  }
}
