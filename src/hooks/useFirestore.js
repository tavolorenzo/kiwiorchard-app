/**
 * useFirestore.js
 * Reemplaza useSheets.js.
 * Carga CONFIG y mapas de orchard desde Firestore.
 * Cache en módulo — segunda llamada es instantánea.
 */

import { useState, useEffect, useCallback } from "react";
import {
  fetchOrchards, fetchWorkers, fetchTeams, fetchTeamMembers,
  fetchMap, fetchBlocks,
} from "../lib/firebase";

// Cache en módulo
const cache = {
  config: null,         // { orchards, workers, teams, teamMembers }
  orchards: {},           // { orchardId: { rowMap, blockMap, rowToBlock } }
};

// ── Builders (misma lógica que sheets.js, ahora desde Firestore) ──

function buildRowMap(mapDocs) {
  return Object.fromEntries(
    mapDocs.filter(r => r.row_id)
      .map(r => [r.row_id, Number(r.total_bays)])
  );
}

function buildBlockMap(blockDocs) {
  return Object.fromEntries(
    blockDocs.filter(b => b.block_id)
      .map(b => [b.block_id, Number(b.prom_m2_per_bay)])
  );
}

function buildRowToBlock(mapDocs, blockDocs) {
  // Índice de sufijo corto → block_id completo (ej: "S" → "cas-S")
  const shortToFull = {};
  for (const b of blockDocs) {
    if (!b.block_id) continue;
    const parts = String(b.block_id).split("-");
    const suffix = parts[parts.length - 1];
    shortToFull[suffix] = b.block_id;
    if (b.label) {
      const lparts = String(b.label).split(" ");
      shortToFull[lparts[lparts.length - 1]] = b.block_id;
    }
  }
  return Object.fromEntries(
    mapDocs
      .filter(r => r.row_id && r.block_id)
      .map(r => {
        const full = shortToFull[String(r.block_id)] ?? r.block_id;
        return [r.row_id, full];
      })
  );
}

// ── Hook principal ────────────────────────────────────────────

export function useFirestore() {
  const [loading, setLoading] = useState(!cache.config);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(cache.config);

  useEffect(() => {
    if (cache.config) return;
    async function load() {
      try {
        setLoading(true);
        const [orchards, workers, teams, teamMembers] = await Promise.all([
          fetchOrchards(),
          fetchWorkers(),
          fetchTeams(),
          fetchTeamMembers(),
        ]);
        const cfg = { orchards, workers, teams, teamMembers };
        cache.config = cfg;
        setConfig(cfg);
      } catch (e) {
        setError("Error cargando configuración: " + e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /**
   * Carga MAP + BLOCKS de un orchard y devuelve los tres mapas.
   * Resultado cacheado.
   */
  const getOrchardMaps = useCallback(async (orchardId) => {
    if (cache.orchards[orchardId]) return cache.orchards[orchardId];

    const [mapDocs, blockDocs] = await Promise.all([
      fetchMap(orchardId),
      fetchBlocks(orchardId),
    ]);

    const maps = {
      rowMap: buildRowMap(mapDocs),
      blockMap: buildBlockMap(blockDocs),
      rowToBlock: buildRowToBlock(mapDocs, blockDocs),
    };

    cache.orchards[orchardId] = maps;
    return maps;
  }, []);

  const getBayRate = useCallback((orchardId) => {
    if (!config) return 0;
    const o = config.orchards.find(o => o.orchard_id === orchardId);
    return o ? Number(o.bay_rate) : 0;
  }, [config]);

  const getTeamWorkers = useCallback((teamId) => {
    if (!config) return [];
    const memberIds = config.teamMembers
      .filter(m => m.team_id === teamId)
      .map(m => m.worker_id);
    return config.workers.filter(w => memberIds.includes(w.worker_id));
  }, [config]);

  /** Invalida el cache de config (útil tras editar workers/teams) */
  const invalidateConfig = useCallback(() => {
    cache.config = null;
    setConfig(null);
    setLoading(true);
  }, []);

  return {
    config,
    loading,
    error,
    getOrchardMaps,
    getBayRate,
    getTeamWorkers,
    invalidateConfig,
  };
}
