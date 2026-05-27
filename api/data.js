// GET /api/data?s=<section_id>
//
// Sirve el JSON de una sección desde @vercel/blob.
// Si el blob aún no existe (primer deploy antes del primer sync)
// redirige a los archivos estáticos en public/data/ como fallback.

import { list } from '@vercel/blob';

const BLOB_PREFIX = 'mj';

// Secciones válidas y sus archivos estáticos de fallback
const STATIC_FALLBACKS = {
  participacion_global:  '/data/dashboard-nacional/participacion_economica_mujeres_por_pais.json',
  brecha_salarial:       '/data/dashboard-nacional/evolucion_brecha_salarial_genero_mexico_fuente.json',
  informalidad:          '/data/dashboard-nacional/evolucion_informalidad_laboral_por_sexo_fuente.json',
  valor_cuidados:        '/data/dashboard-nacional/valor_economico_cuidados_fuente.json',
  entidad_enriched:      '/data/estadisticas-entidad/variables_monitor_entidad_enriched.json',
  cdmx_indicadores:      '/data/cdmx-alcaldia/monitor_cdmx_indicadores.json',
  tpe_historica:         '/data/dashboard-nacional/participacion-mexico-historica.json',
  stem:                  '/data/stem/monitor_stem.json',
};

export default async function handler(req, res) {
  const sectionId = req.query.s;

  if (!sectionId || !(sectionId in STATIC_FALLBACKS)) {
    return res.status(400).json({ error: 'Sección inválida o no especificada' });
  }

  try {
    const { blobs } = await list({
      prefix: `${BLOB_PREFIX}/${sectionId}.json`,
      limit: 1,
    });

    // Blob no existe todavía → redirige al archivo estático
    if (!blobs.length) {
      return res.redirect(302, STATIC_FALLBACKS[sectionId]);
    }

    const blobRes = await fetch(blobs[0].url);
    if (!blobRes.ok) {
      return res.redirect(302, STATIC_FALLBACKS[sectionId]);
    }

    const data = await blobRes.json();

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.json(data);
  } catch (err) {
    // En caso de error del blob, fallback a archivo estático
    return res.redirect(302, STATIC_FALLBACKS[sectionId]);
  }
}
