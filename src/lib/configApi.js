/**
 * configApi.js v1.1
 * Llama a los endpoints CRUD del Apps Script Web App.
 * Usa GET en desarrollo (workaround CORS) y POST en producción.
 */

import { JOBS_API_URL } from "./sheets";

const IS_DEV = import.meta.env.DEV;

async function call(action, payload = {}) {
  if (!JOBS_API_URL) throw new Error("VITE_JOBS_API_URL no configurado en .env");

  const body = JSON.stringify({ action, payload });

  if (IS_DEV) {
    const url = `${JOBS_API_URL}?data=${encodeURIComponent(body)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } else {
    const res = await fetch(JOBS_API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }
}

// ── Workers ──────────────────────────────────────────────────
export const getWorkers   = ()                    => call("getWorkers");
export const saveWorker   = (payload)             => call("saveWorker", payload);
export const toggleWorker = (worker_id, active)   => call("toggleWorker", { worker_id, active });

// ── Teams ─────────────────────────────────────────────────────
export const getTeams        = ()                         => call("getTeams");
export const saveTeam        = (payload)                  => call("saveTeam", payload);
export const toggleTeam      = (team_id, active)          => call("toggleTeam", { team_id, active });
export const saveTeamMembers = (team_id, members)         => call("saveTeamMembers", { team_id, members });
