/**
 * useJobs.js
 * Carga y cachea los jobs de un orchard desde el sheet "jobs".
 */
import { useState, useEffect } from "react";
import { readSheet, SHEET_IDS } from "./sheets";

const cache = {};

export function useJobs(orchardId) {
  const [jobs,    setJobs]    = useState(cache[orchardId] ?? []);
  const [loading, setLoading] = useState(!cache[orchardId]);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!orchardId) return;
    if (cache[orchardId]) { setJobs(cache[orchardId]); setLoading(false); return; }

    setLoading(true);
    const sheetId = SHEET_IDS[orchardId];
    if (!sheetId) { setError("Sheet ID no configurado para: " + orchardId); setLoading(false); return; }

    readSheet(sheetId, "jobs")
      .then(rows => {
        // Normalizar tipos numéricos
        const parsed = rows.map(r => ({
          ...r,
          total_bays:  Number(r.total_bays  ?? 0),
          total_m2:    Number(r.total_m2    ?? 0),
          hours:       Number(r.hours       ?? 0),
          bays_per_hr: Number(r.bays_per_hr ?? 0),
          bay_rate:    Number(r.bay_rate     ?? 0),
          cost:        Number(r.cost         ?? 0),
        }));
        cache[orchardId] = parsed;
        setJobs(parsed);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [orchardId]);

  // Permite agregar un job localmente sin re-fetch
  function addJob(job) {
    const next = [job, ...(cache[orchardId] ?? [])];
    cache[orchardId] = next;
    setJobs(next);
  }

  return { jobs, loading, error, addJob };
}
