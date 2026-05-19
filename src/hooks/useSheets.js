/**
 * useSheets.js v1.1
 * Carga CONFIG, MAP y BLOCKS al iniciar la SPA.
 * Expone rowMap, blockMap y rowToBlock para cada orchard.
 */

import { useState, useEffect, useCallback } from "react";
import {
  readSheet, SHEET_IDS,
  buildRowMap, buildBlockMap, buildRowToBlock,
} from "../lib/sheets";

const cache = {
  config:      null,
  rowMaps:     {},  // { orchardId: { row_id: total_bays } }
  blockMaps:   {},  // { orchardId: { block_id: prom_m2_per_bay } }
  rowToBlocks: {},  // { orchardId: { row_id: block_id } }
};

export function useSheets() {
  const [loading, setLoading] = useState(!cache.config);
  const [error,   setError]   = useState(null);
  const [config,  setConfig]  = useState(cache.config);

  useEffect(() => {
    if (cache.config) return;

    async function loadConfig() {
      try {
        setLoading(true);
        setError(null);

        const [orchards, workers, teams, teamMembers] = await Promise.all([
          readSheet(SHEET_IDS.config, "orchards"),
          readSheet(SHEET_IDS.config, "workers"),
          readSheet(SHEET_IDS.config, "teams"),
          readSheet(SHEET_IDS.config, "team_members"),
        ]);

        const cfg = { orchards, workers, teams, teamMembers };
        cache.config = cfg;
        setConfig(cfg);
      } catch (err) {
        setError("Error cargando CONFIG: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  /**
   * Carga MAP y BLOCKS de un orchard.
   * Retorna { rowMap, blockMap, rowToBlock }.
   * Resultado cacheado — segunda llamada es instantánea.
   */
  const getOrchardMaps = useCallback(async (orchardId) => {
    if (
      cache.rowMaps[orchardId] &&
      cache.blockMaps[orchardId] &&
      cache.rowToBlocks[orchardId]
    ) {
      return {
        rowMap:     cache.rowMaps[orchardId],
        blockMap:   cache.blockMaps[orchardId],
        rowToBlock: cache.rowToBlocks[orchardId],
      };
    }

    const sheetId = SHEET_IDS[orchardId];
    if (!sheetId) throw new Error(`Orchard desconocido: ${orchardId}`);

    const [mapRows, blockRows] = await Promise.all([
      readSheet(sheetId, "map"),
      readSheet(sheetId, "blocks"),
    ]);

    const rowMap     = buildRowMap(mapRows);
    const blockMap   = buildBlockMap(blockRows);
    const rowToBlock = buildRowToBlock(mapRows);

    cache.rowMaps[orchardId]     = rowMap;
    cache.blockMaps[orchardId]   = blockMap;
    cache.rowToBlocks[orchardId] = rowToBlock;

    return { rowMap, blockMap, rowToBlock };
  }, []);

  const getTeamWorkers = useCallback((teamId) => {
    if (!config) return [];
    const memberIds = config.teamMembers
      .filter(m => m.team_id === teamId)
      .map(m => m.worker_id);
    return config.workers.filter(w => memberIds.includes(w.worker_id));
  }, [config]);

  const getBayRate = useCallback((orchardId) => {
    if (!config) return 0;
    const o = config.orchards.find(o => o.orchard_id === orchardId);
    return o ? Number(o.bay_rate) : 0;
  }, [config]);

  return {
    config,
    loading,
    error,
    getOrchardMaps,
    getTeamWorkers,
    getBayRate,
  };
}
