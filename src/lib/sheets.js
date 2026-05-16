/**
 * sheets.js
 * Utilidades para leer Google Sheets públicos via URL gviz
 * y escribir via el Apps Script Web App.
 *
 * Sin API Key, sin Google Cloud — solo URLs públicas + Apps Script.
 */

// ── CONFIG ───────────────────────────────────────────────────
// Estos valores vienen del .env (Vite los inyecta en build time)
export const SHEET_IDS = {
  config: import.meta.env.VITE_CONFIG_SHEET_ID,
  cas:    import.meta.env.VITE_CAS_SHEET_ID,
  bro:    import.meta.env.VITE_BRO_SHEET_ID,
  gra:    import.meta.env.VITE_GRA_SHEET_ID,
  jam:    import.meta.env.VITE_JAM_SHEET_ID,
  mar:    import.meta.env.VITE_MAR_SHEET_ID,
  oce:    import.meta.env.VITE_OCE_SHEET_ID,
  web:    import.meta.env.VITE_WEB_SHEET_ID,
  whi:    import.meta.env.VITE_WHI_SHEET_ID,
};

// URL del Apps Script Web App (para escritura)
export const JOBS_API_URL = import.meta.env.VITE_JOBS_API_URL;


// ── LECTURA — URL pública gviz ───────────────────────────────

/**
 * Lee un sheet público de Google Sheets.
 * @param {string} spreadsheetId  - ID del workbook
 * @param {string} sheetName      - Nombre del sheet (ej: "map", "workers")
 * @returns {Promise<Array>}      - Array de objetos con los datos
 */
export async function readSheet(spreadsheetId, sheetName) {
  const url =
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq` +
    `?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error leyendo sheet "${sheetName}": ${res.status}`);

  const text = await res.text();

  // Google devuelve JSONP: google.visualization.Query.setResponse({...})
  // Hay que extraer el JSON del medio
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));

  return parseGvizTable(json.table);
}

/**
 * Convierte la tabla gviz en un array de objetos planos.
 * Las columnas se toman de la primera fila (headers).
 */
function parseGvizTable(table) {
  if (!table || !table.cols || !table.rows) return [];

  // Extraer nombres de columna desde los headers del sheet
  const headers = table.cols.map(col => col.label || col.id);

  return table.rows
    .map(row =>
      Object.fromEntries(
        headers.map((header, i) => {
          const cell = row.c[i];
          return [header, cell ? cell.v : null];
        })
      )
    )
    // Filtrar filas completamente vacías
    .filter(row => Object.values(row).some(v => v !== null && v !== ""));
}


// ── ESCRITURA — Apps Script Web App ─────────────────────────

/**
 * Appendea un job en el sheet "jobs" del orchard correspondiente.
 * @param {Object} jobData - Datos del job (ver schema en JobsAPI_WebApp.gs)
 * @returns {Promise<Object>} - { success, job_id, created_at }
 */
export async function appendJob(jobData) {
  if (!JOBS_API_URL) {
    throw new Error("VITE_JOBS_API_URL no está configurado en .env");
  }

  const res = await fetch(JOBS_API_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ action: "appendJob", payload: jobData }),
  });

  if (!res.ok) throw new Error(`Error en Jobs API: ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return data;
}


// ── HELPERS ──────────────────────────────────────────────────

/**
 * Construye el diccionario bay_id → m² desde el sheet "map".
 * @param {Array} mapRows - Filas del sheet map
 * @returns {Object} - { "S-1": 21, "N-SKIRT": 11, ... }
 */
export function buildBayMap(mapRows) {
  return Object.fromEntries(
    mapRows
      .filter(row => row.bay_id)
      .map(row => [row.bay_id, Number(row.m2)])
  );
}

/**
 * Calcula el m² total de una lista de bay_ids.
 * Replica la fórmula VLOOKUP+ARRAYFORMULA del Excel original.
 * @param {string} baysCsv  - "S-1,S-2,N-SKIRT-2"
 * @param {Object} bayMap   - Diccionario { bay_id: m2 }
 * @returns {number}
 */
export function calcM2(baysCsv, bayMap) {
  if (!baysCsv) return 0;
  return baysCsv
    .split(",")
    .map(id => id.trim())
    .filter(Boolean)
    .reduce((sum, id) => sum + (bayMap[id] ?? 0), 0);
}

/**
 * Cuenta los bays en un CSV.
 * @param {string} baysCsv
 * @returns {number}
 */
export function countBays(baysCsv) {
  if (!baysCsv) return 0;
  return baysCsv.split(",").map(s => s.trim()).filter(Boolean).length;
}
