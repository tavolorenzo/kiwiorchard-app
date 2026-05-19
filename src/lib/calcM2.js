/**
 * calcM2.js v1.1.1
 * ─────────────────────────────────────────────────────────────
 * m² = bays_seleccionados × prom_m2_per_bay del block
 * El prom_m2_per_bay viene del sheet "blocks" via blockMap.
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Calcula m² desde selecciones — lee el campo bays_selected.
 * Usado en RowSelector para el preview en tiempo real.
 *
 * @param {Array}  rowSelections  - [{ row_id, bays_selected }]
 * @param {Object} blockMap       - { block_id: prom_m2_per_bay }
 * @param {Object} rowToBlock     - { row_id: block_id }
 * @returns {number}
 */
export function calcM2(rowSelections, blockMap, rowToBlock) {
  if (!rowSelections?.length) return 0;

  const result = rowSelections.reduce((sum, { row_id, bays_selected }) => {
    const blockId = rowToBlock[row_id];
    const promM2 = blockMap[blockId] ?? 0;
    const bays = Number(bays_selected) || 0;
    return sum + bays * promM2;
  }, 0);

  console.log("[calcM2]", {
    rowSelections,
    blockMap,
    rowToBlock,
    result,
    sampleBlockId: rowToBlock[rowSelections[0]?.row_id],
    samplePromM2: blockMap[rowToBlock[rowSelections[0]?.row_id]],
  });

  return result;
}

/**
 * Calcula m² desde DELTAS — lee el campo bays_delta.
 * Usado en JobForm para el cálculo de trabajo nuevo a guardar.
 *
 * @param {Array}  deltaRows  - resultado de applyDelta() → [{ row_id, bays_delta }]
 * @param {Object} blockMap   - { block_id: prom_m2_per_bay }
 * @param {Object} rowToBlock - { row_id: block_id }
 * @returns {number}
 */
export function calcM2FromDelta(deltaRows, blockMap, rowToBlock) {
  if (!deltaRows?.length) return 0;

  const result = deltaRows.reduce((sum, { row_id, bays_delta }) => {
    const blockId = rowToBlock[row_id];
    const promM2 = blockMap[blockId] ?? 0;
    const bays = Number(bays_delta) || 0;
    return sum + bays * promM2;
  }, 0);

  console.log("[calcM2FromDelta]", {
    deltaRows,
    blockMap,
    rowToBlock,
    result,
    sampleBlockId: rowToBlock[deltaRows[0]?.row_id],
    samplePromM2: blockMap[rowToBlock[deltaRows[0]?.row_id]],
  });

  return result;
}

/**
 * Suma total de bays seleccionados.
 * @param {Array} rowSelections - [{ bays_selected }] o [{ bays_delta }]
 * @returns {number}
 */
export function countBays(rowSelections) {
  if (!rowSelections?.length) return 0;
  return rowSelections.reduce((s, r) => {
    // Acepta tanto bays_selected como bays_delta
    const val = r.bays_delta ?? r.bays_selected ?? 0;
    return s + (Number(val) || 0);
  }, 0);
}

/**
 * Bays por hora.
 */
export function calcBaysPerHr(totalBays, hours) {
  if (!hours || hours === 0) return 0;
  return Math.round((totalBays / hours) * 100) / 100;
}

/**
 * Costo total: total_bays × bay_rate.
 */
export function calcCost(totalBays, bayRate) {
  return Math.round(totalBays * bayRate * 100) / 100;
}

/**
 * Calcula el delta de bays (trabajo nuevo vs. ya registrado).
 * El slider tiene como piso el valor preloaded — nunca negativo.
 *
 * @param {Array}  rowSelections  - [{ row_id, bays_selected }]
 * @param {Object} preloadedBays  - { row_id: bays_ya_registrados }
 * @returns {Array} - [{ row_id, bays_selected, bays_delta }]
 */
export function applyDelta(rowSelections, preloadedBays = {}) {
  const result = rowSelections
    .map(({ row_id, bays_selected }) => {
      const prev = Number(preloadedBays[row_id] ?? 0);
      const delta = Math.max(0, Number(bays_selected) - prev);
      return { row_id, bays_selected, bays_delta: delta };
    })
    .filter(r => r.bays_delta > 0);

  console.log("[applyDelta]", { rowSelections, preloadedBays, result });
  return result;
}

/**
 * Serializa la selección para guardar en Sheets (guarda DELTAS).
 */
export function serializeRows(rowSelectionsWithDelta) {
  return JSON.stringify(
    rowSelectionsWithDelta.map(({ row_id, bays_delta }) => ({
      row_id,
      bays: bays_delta,
    }))
  );
}

/**
 * Deserializa rows_json guardado en Sheets.
 */
export function deserializeRows(json) {
  if (!json) return [];
  try { return JSON.parse(json); }
  catch { return []; }
}