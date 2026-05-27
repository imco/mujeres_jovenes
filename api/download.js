// GET /api/download
//
// Descarga todos los datos del spreadsheet de Google Sheets como un único XLSX
// con una hoja por cada fuente de datos. No requiere autenticación.

import * as XLSX from 'xlsx';
import { fetchRowsFromCsv } from './_lib.js';

const SPREADSHEET_ID = '18I_XYerve-1L6NVIRNiHkvbw6EudJ1DpB-5gBUOY4n0';

const ALL_SHEETS = [
  { name: 'Participacion_Global', gid: '0' },
  { name: 'TPE_Historica',        gid: '1159629718' },
  { name: 'Brecha_Salarial',      gid: '253482696' },
  { name: 'Informalidad',         gid: '761524869' },
  { name: 'Valor_Cuidados',       gid: '1495501902' },
  { name: 'Entidades',            gid: '1208416458' },
  { name: 'CDMX_Alcaldias',       gid: '207678363' },
  { name: 'PISA_Historico',       gid: '1191344712' },
  { name: 'Nivel_Matematicas',    gid: '1401655572' },
  { name: 'Matricula_Area',       gid: '386556375' },
  { name: 'Mapa_Matricula',       gid: '1577242925' },
  { name: 'Mapa_Profesionistas',  gid: '1469134912' },
  { name: 'Mercado_Laboral',      gid: '1471172721' },
];

export default async function handler(req, res) {
  try {
    const wb = XLSX.utils.book_new();

    for (const { name, gid } of ALL_SHEETS) {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
      const rows = await fetchRowsFromCsv(csvUrl);

      let ws;
      if (!rows.length) {
        ws = XLSX.utils.aoa_to_sheet([['Sin datos']]);
      } else {
        const headers = Object.keys(rows[0]);
        const matrix = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))];
        ws = XLSX.utils.aoa_to_sheet(matrix);
        ws['!cols'] = headers.map((h) => ({
          wch: Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length), 8),
        }));
      }

      XLSX.utils.book_append_sheet(wb, ws, name);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="monitor_mujeres_jovenes.xlsx"');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(Buffer.from(buf));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
