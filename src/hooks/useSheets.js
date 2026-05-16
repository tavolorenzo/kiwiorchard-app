/**
 * useSheets.js
 * Hook que carga CONFIG y MAP al iniciar la SPA.
 * Los datos quedan en memoria — no se vuelven a cargar
 * salvo que el usuario refresque la página.
 *
 * Uso:
 *   const { config, getBayMap, loading, error } = useSheets();
 */

import { useState, useEffect, useCallback } from "react";
import { readSheet, buildBayMap, SHEET_IDS } from "../lib/sheets";

// Cache en módulo — persiste entre re-renders sin Context
const cache = {
  config:  null,   // { orchards, workers, teams, teamMembers }
  bayMaps: {},     // { cas: { "S-1": 21, ... }, bro: {...}, ... }
};

export function useSheets() {
  const [loading, setLoading]   = useState(!cache.config);
  const [error,   setError]     = useState(null);
  const [config,  setConfig]    = useState(cache.config);

  useEffect(() => {
    if (cache.config) return; // Ya cargado — no volver a fetchear

    async function loadConfig() {
      try {
        setLoading(true);
        setError(null);

        // Cargar los 4 sheets de CONFIG en paralelo
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
   * Carga el MAP de un orchard específico.
   * Se llama cuando el usuario selecciona un orchard.
   * Resultado cacheado — segunda llamada es instantánea.
   *
   * @param {string} orchardId - "cas", "bro", "gra", etc.
   * @returns {Promise<Object>} - { "S-1": 21, "N-SKIRT": 11, ... }
   */
  const getBayMap = useCallback(async (orchardId) => {
    // Devolver cache si ya existe
    if (cache.bayMaps[orchardId]) return cache.bayMaps[orchardId];

    const sheetId = SHEET_IDS[orchardId];
    if (!sheetId) throw new Error(`Orchard desconocido: ${orchardId}`);

    const rows = await readSheet(sheetId, "map");
    const bayMap = buildBayMap(rows);
    cache.bayMaps[orchardId] = bayMap;
    return bayMap;
  }, []);

  /**
   * Devuelve los workers de un team en un momento dado.
   * @param {string} teamId
   * @returns {Array<Object>} - [{ worker_id, name, type, rate_per_hr }]
   */
  const getTeamWorkers = useCallback((teamId) => {
    if (!config) return [];
    const memberIds = config.teamMembers
      .filter(m => m.team_id === teamId)
      .map(m => m.worker_id);
    return config.workers.filter(w => memberIds.includes(w.worker_id));
  }, [config]);

  /**
   * Devuelve el bay_rate de un orchard.
   * @param {string} orchardId
   * @returns {number}
   */
  const getBayRate = useCallback((orchardId) => {
    if (!config) return 0;
    const orchard = config.orchards.find(o => o.orchard_id === orchardId);
    return orchard ? Number(orchard.bay_rate) : 0;
  }, [config]);

  return {
    config,
    loading,
    error,
    getBayMap,
    getTeamWorkers,
    getBayRate,
  };
}
