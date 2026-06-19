/**
 * useJobs.js — Firebase version
 * Carga y cachea los jobs de un orchard desde Firestore.
 */

import { useState, useEffect, useCallback } from "react";
import {
  fetchJobs,
  updateJob as apiUpdateJob,
  deleteJob as apiDeleteJob
} from "./firebase";
import { deserializeRows } from "./calcM2";

const cache = {};

export function useJobs(orchardId) {
  const [jobs,    setJobs]    = useState(cache[orchardId] ?? []);
  const [loading, setLoading] = useState(!cache[orchardId]);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!orchardId) return;
    if (cache[orchardId]) { setJobs(cache[orchardId]); setLoading(false); return; }

    setLoading(true);
    fetchJobs(orchardId)
      .then(rows => {
        const parsed = rows.map(r => ({
          ...r,
          total_bays:  Number(r.total_bays  ?? 0),
          total_m2:    Number(r.total_m2    ?? 0),
          hours:       Number(r.hours       ?? 0),
          bays_per_hr: Number(r.bays_per_hr ?? 0),
          bay_rate:    Number(r.bay_rate    ?? 0),
          cost:        Number(r.cost        ?? 0),
        }));
        cache[orchardId] = parsed;
        setJobs(parsed);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [orchardId]);

  // Auto-sincronizar localStorage (preloads) con el estado de jobs actual
  useEffect(() => {
    if (!orchardId || loading) return;

    // Limpiar claves viejas de preloads para este orchard
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`kiwi_preload_${orchardId}_`)) {
        localStorage.removeItem(key);
        i--; // ajustar índice después de remover
      }
    }

    // Calcular acumulados por fecha
    const preloadsByDate = {};
    jobs.forEach(j => {
      if (!j.date) return;
      if (!preloadsByDate[j.date]) {
        preloadsByDate[j.date] = {};
      }
      const rows = deserializeRows(j.rows_json);
      rows.forEach(({ row_id, bays }) => {
        preloadsByDate[j.date][row_id] = (preloadsByDate[j.date][row_id] ?? 0) + bays;
      });
    });

    // Guardar en localStorage
    Object.entries(preloadsByDate).forEach(([date, map]) => {
      localStorage.setItem(`kiwi_preload_${orchardId}_${date}`, JSON.stringify(map));
    });
  }, [orchardId, jobs, loading]);

  // Agrega un job localmente sin re-fetch
  const addJob = useCallback((job) => {
    const next = [job, ...(cache[orchardId] ?? [])];
    cache[orchardId] = next;
    setJobs(next);
  }, [orchardId]);

  // Actualiza un job localmente (asume guardado previo en Firestore)
  const updateJobState = useCallback((jobId, updatedFields) => {
    const next = (cache[orchardId] ?? []).map(j =>
      (j.id === jobId || j.job_id === jobId) ? { ...j, ...updatedFields } : j
    );
    cache[orchardId] = next;
    setJobs(next);
  }, [orchardId]);

  // Elimina un job en Firestore y localmente
  const deleteJob = useCallback(async (jobId) => {
    await apiDeleteJob(orchardId, jobId);
    const next = (cache[orchardId] ?? []).filter(j => j.id !== jobId && j.job_id !== jobId);
    cache[orchardId] = next;
    setJobs(next);
  }, [orchardId]);

  // Invalida cache (fuerza re-fetch)
  const invalidate = useCallback(() => {
    delete cache[orchardId];
    setLoading(true);
  }, [orchardId]);

  return { jobs, loading, error, addJob, updateJobState, deleteJob, invalidate };
}
