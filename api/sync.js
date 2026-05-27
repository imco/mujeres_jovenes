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
