/**
 * sheets.js v1.1
 * Lectura de Google Sheets públicos via gviz.
 * Escritura via Apps Script Web App.
 *
 * Cambios v1.1:
 *   - buildRowMap() reemplaza buildBayMap()
 *   - buildBlockMap() nuevo — expone prom_m2_per_bay por block
 *   - buildRowToBlock() nuevo — lookup row_id → block_id
 *   - appendJob() usa rows_json en lugar de bays_csv
 */

export const SHEET_IDS = {
  config: import.meta.env.VITE_CONFIG_SHEET_ID,
  cas: import.meta.env.VITE_CAS_SHEET_ID,
  bro: import.meta.env.VITE_BRO_SHEET_ID,
  gra: import.meta.env.VITE_GRA_SHEET_ID,
  jam: import.meta.env.VITE_JAM_SHEET_ID,
  mar: import.meta.env.VITE_MAR_SHEET_ID,
  oce: import.meta.env.VITE_OCE_SHEET_ID,
  web: import.meta.env.VITE_WEB_SHEET_ID,
  whi: import.meta.env.VITE_WHI_SHEET_ID,
};

export const JOBS_API_URL = import.meta.env.VITE_JOBS_API_URL;

// ── LECTURA ──────────────────────────────────────────────────

export async function readSheet(spreadsheetId, sheetName) {
  if (!spreadsheetId) {
    throw new Error(`Sheet ID no configurado para: "${sheetName}". Verificá el .env`);
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq` +
    `?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(
      `No se pudo conectar a Google Sheets (${sheetName}). ` +
      `Verificá que el sheet esté compartido como público (Viewer). ` +
      `Error: ${err.message}`
    );
  }

  if (!res.ok) {
    throw new Error(
      `Error HTTP ${res.status} leyendo "${sheetName}". ` +
      `Verificá que el workbook esté compartido como "Anyone with the link → Viewer".`
    );
  }

  const text = await res.text();

  if (!text.includes("google.visualization")) {
    throw new Error(
      `El sheet "${sheetName}" no está compartido como público. ` +
      `Abrí el workbook en Drive → Share → "Anyone with the link" → Viewer.`
    );
  }

  const json = JSON.parse(
    text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
  );

  return parseGvizTable(json.table);
}

function parseGvizTable(table) {
  if (!table?.cols || !table?.rows) return [];
  const headers = table.cols.map(col => col.label || col.id);
  return table.rows
    .map(row =>
      Object.fromEntries(
        headers.map((h, i) => {
          const cell = row.c?.[i];
          return [h, cell?.v ?? null];
        })
      )
    )
    .filter(row => Object.values(row).some(v => v !== null && v !== ""));
}


// ── BUILDERS — construyen los mapas en memoria ────────────────

/**
 * row_id → total_bays (cuántos bays hay en esa row).
 * Construido desde el sheet "map" (v1.1: columnas row_id, block_id, total_bays).
 *
 * @param {Array} mapRows
 * @returns {Object} { "S-1": 14.5, "N-SKIRT": 2, ... }
 */
export function buildRowMap(mapRows) {
  console.debug("[buildRowMap] raw rows sample:", mapRows.slice(0, 3));
  const map = Object.fromEntries(
    mapRows
      .filter(r => r.row_id)
      .map(r => [r.row_id, Number(r.total_bays)])
  );
  console.debug("[buildRowMap] result sample:", Object.entries(map).slice(0, 3));
  return map;
}

/**
 * block_id → prom_m2_per_bay.
 * Construido desde el sheet "blocks" (v1.1: columna prom_m2_per_bay).
 *
 * @param {Array} blockRows
 * @returns {Object} { "cas-S": 13.4, "cas-N": 21.0, ... }
 */
export function buildBlockMap(blockRows) {
  console.debug("[buildBlockMap] raw rows:", blockRows);
  const map = Object.fromEntries(
    blockRows
      .filter(r => r.block_id)
      .map(r => [r.block_id, Number(r.prom_m2_per_bay)])
  );
  console.debug("[buildBlockMap] result:", map);
  return map;
}

/**
 * row_id → block_id.
 * Permite saber a qué block pertenece cada row para obtener prom_m2_per_bay.
 *
 * @param {Array} mapRows
 * @returns {Object} { "S-1": "cas-S", "N-1": "cas-N", ... }
 */
export function buildRowToBlock(mapRows) {
  console.debug("[buildRowToBlock] raw rows sample:", mapRows.slice(0, 3));
  const map = Object.fromEntries(
    mapRows
      .filter(r => r.row_id && r.block_id)
      .map(r => [r.row_id, r.block_id])
  );
  console.debug("[buildRowToBlock] result sample:", Object.entries(map).slice(0, 3));
  return map;
}


// ── ESCRITURA — Apps Script Web App ──────────────────────────

/**
 * Appendea un job en el sheet "jobs" del orchard.
 * v1.1: usa rows_json en lugar de bays_csv.
 */
export async function appendJob(jobData) {
  if (!JOBS_API_URL) {
    throw new Error(
      "VITE_JOBS_API_URL no está configurado en .env. " +
      "Deployá el Apps Script como Web App y pegá la URL."
    );
  }

  const res = await fetch(JOBS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "appendJob", payload: jobData }),
  });

  if (!res.ok) throw new Error(`Error en Jobs API: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}
