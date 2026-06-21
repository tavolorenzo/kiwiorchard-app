/**
 * SettingsPage.jsx
 * Módulo de gestión de Workers y Teams.
 * CRUD completo sobre el workbook CONFIG via Apps Script.
 *
 * Ruta: /settings
 */

import { useState, useEffect, useCallback } from "react";
import {
  fetchWorkers, saveWorker, toggleWorker,
  fetchTeams, saveTeam, toggleTeam, saveTeamMembers,
  fetchTeamMembers,
} from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";

// ── Constantes ────────────────────────────────────────────────
const WORKER_TYPES = ["RSE", "Contractor"];

// ══════════════════════════════════════════════════════════════
//  PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const [tab, setTab] = useState("workers"); // "workers" | "teams"

  return (
    <div style={{ padding: 24, maxWidth: 860 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111827", margin: 0 }}>
          Configuración
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
          Gestión de workers y teams — cambios se guardan en Google Sheets
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", borderBottom: "1px solid #e5e7eb",
        marginBottom: 24, gap: 0,
      }}>
        {[
          { id: "workers", label: "Workers" },
          { id: "teams", label: "Teams" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 500,
              border: "none", background: "none", cursor: "pointer",
              color: tab === t.id ? "#1d4ed8" : "#6b7280",
              borderBottom: tab === t.id ? "2px solid #1d4ed8" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "workers" && <WorkersSection />}
      {tab === "teams" && <TeamsSection />}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  WORKERS
// ══════════════════════════════════════════════════════════════

function WorkersSection() {
  const [workers, setWorkers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null); // worker_id en edición
  const [showForm, setShowForm] = useState(false);

  const EMPTY = { name: "", type: "RSE", rate_per_hr: "" };
  const [form, setForm] = useState(EMPTY);
  const [formErrors, setFormErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [workersRaw, teamsRaw, membersRaw] = await Promise.all([
        fetchWorkers(),
        fetchTeams(),
        fetchTeamMembers(),
      ]);
      setWorkers(Array.isArray(workersRaw) ? workersRaw : (workersRaw.data ?? []));
      setTeams(Array.isArray(teamsRaw) ? teamsRaw : (teamsRaw.data ?? []));
      setMembers(Array.isArray(membersRaw) ? membersRaw : (membersRaw.data ?? []));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function WorkerTableHeader() {
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 100px 120px 120px 80px 120px", // ← agregar 120px
        gap: 8, padding: "8px 12px",
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "8px 8px 0 0",
        fontSize: 11, fontWeight: 500, color: "#6b7280",
        textTransform: "uppercase", letterSpacing: ".05em",
      }}>
        <span>Nombre</span>
        <span>Tipo</span>
        <span>Tarifa/hr</span>
        <span>Teams</span>         {/* ← AGREGAR */}
        <span>Estado</span>
        <span></span>
      </div>
    );
  }

  function WorkerRow({ worker: w, workerTeams, onEdit, onToggle }) {
    const isActive = w.active !== false && w.active !== "FALSE";
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 100px 120px 120px 80px 120px", // ← agregar 120px
        gap: 8, padding: "10px 12px",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderTop: "none",
        alignItems: "center",
        fontSize: 13,
        opacity: isActive ? 1 : 0.55,
      }}>
        <span style={{ fontWeight: 500, color: "#111827" }}>{w.name}</span>
        <span>
          <Badge label={w.type}
            color={w.type === "RSE" ? "#2563eb" : "#7c3aed"} />
        </span>
        <span style={{ color: "#374151", fontFamily: "monospace", fontSize: 12 }}>
          ${Number(w.rate_per_hr).toFixed(2)}/hr
        </span>

        {/* Teams del worker */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {workerTeams.length === 0 ? (
            <span style={{ fontSize: 10, color: "#d1d5db" }}>—</span>
          ) : (
            workerTeams.map(t => (
              <span key={t.team_id} style={{
                fontSize: 10, padding: "2px 7px",
                borderRadius: 10, fontWeight: 500,
                background: "#eff6ff", color: "#1d4ed8",
                border: "1px solid #bfdbfe",
              }}>
                {t.name}
              </span>
            ))
          )}
        </div>

        <span>
          <Badge
            label={isActive ? "Activo" : "Inactivo"}
            color={isActive ? "#16a34a" : "#6b7280"}
          />
        </span>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button onClick={onEdit} style={btnXS}>Editar</button>
          <button onClick={onToggle} style={btnXS}>
            {isActive ? "Desactivar" : "Activar"}
          </button>
        </div>
      </div>
    );
  }

  function openCreate() {
    setForm(EMPTY);
    setEditingId(null);
    setFormErrors({});
    setShowForm(true);
  }

  function openEdit(w) {
    setForm({ name: w.name, type: w.type, rate_per_hr: w.rate_per_hr });
    setEditingId(w.worker_id);
    setFormErrors({});
    setShowForm(true);
  }

  function validateForm() {
    const e = {};
    if (!form.name.trim()) e.name = "El nombre es requerido";
    if (!form.type) e.type = "Seleccioná un tipo";
    if (!form.rate_per_hr || isNaN(+form.rate_per_hr) || +form.rate_per_hr < 0)
      e.rate_per_hr = "Ingresá una tarifa válida (≥ 0)";
    return e;
  }

  async function handleSave() {
    const e = validateForm();
    setFormErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await saveWorker({
        worker_id: editingId ?? undefined,
        name: form.name.trim(),
        type: form.type,
        rate_per_hr: +form.rate_per_hr,
      });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(w) {
    try {
      await toggleWorker(w.worker_id, !w.active);
      setWorkers(prev =>
        prev.map(x => x.worker_id === w.worker_id ? { ...x, active: !x.active } : x)
      );
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      {/* Header de sección */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 16
      }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
          Workers ({workers.filter(w => w.active !== false).length} activos)
        </span>
        <button onClick={openCreate} style={btnPrimary}>
          + Agregar worker
        </button>
      </div>

      {error && <Banner type="error" msg={error} onClose={() => setError("")} />}

      {/* Formulario inline */}
      {showForm && (
        <div style={card}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: "#111827",
            marginBottom: 14
          }}>
            {editingId ? "Editar worker" : "Nuevo worker"}
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 140px 160px",
            gap: 12, alignItems: "start"
          }}>
            <Field label="Nombre *" error={formErrors.name}>
              <input
                style={input(formErrors.name)}
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Nombre completo"
                autoFocus
              />
            </Field>
            <Field label="Tipo *" error={formErrors.type}>
              <select
                style={input(formErrors.type)}
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                {WORKER_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Tarifa / hr *" error={formErrors.rate_per_hr}>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)", color: "#9ca3af",
                  fontSize: 12
                }}>$</span>
                <input
                  style={{ ...input(formErrors.rate_per_hr), paddingLeft: 22 }}
                  type="number"
                  min="0"
                  step="0.50"
                  value={form.rate_per_hr}
                  onChange={e => setForm(p => ({ ...p, rate_per_hr: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={handleSave} disabled={saving} style={btnPrimary}>
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear worker"}
            </button>
            <button onClick={() => setShowForm(false)} style={btnSecondary}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de workers */}
      {loading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <WorkerTableHeader />
          {workers.length === 0 && (
            <div style={{
              padding: "24px 0", textAlign: "center",
              color: "#9ca3af", fontSize: 13,
            }}>
              No hay workers. Agregá uno con el botón de arriba.
            </div>
          )}
          {workers.map(w => {
            // Teams a los que pertenece este worker
            const workerTeamIds = members
              .filter(m => m.worker_id === w.worker_id)
              .map(m => m.team_id);
            const workerTeams = teams.filter(t => workerTeamIds.includes(t.team_id));

            return (
              <WorkerRow
                key={w.worker_id}
                worker={w}
                workerTeams={workerTeams}         // ← AGREGAR
                onEdit={() => openEdit(w)}
                onToggle={() => handleToggle(w)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkerTableHeader() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 100px 120px 80px 120px",
      gap: 8, padding: "8px 12px",
      background: "#f9fafb",
      border: "1px solid #e5e7eb",
      borderRadius: "8px 8px 0 0",
      fontSize: 11, fontWeight: 500, color: "#6b7280",
      textTransform: "uppercase", letterSpacing: ".05em",
    }}>
      <span>Nombre</span>
      <span>Tipo</span>
      <span>Tarifa/hr</span>
      <span>Estado</span>
      <span></span>
    </div>
  );
}

function WorkerRow({ worker: w, onEdit, onToggle }) {
  const isActive = w.active !== false && w.active !== "FALSE";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 100px 120px 80px 120px",
      gap: 8, padding: "10px 12px",
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderTop: "none",
      alignItems: "center",
      fontSize: 13,
      opacity: isActive ? 1 : 0.55,
    }}>
      <span style={{ fontWeight: 500, color: "#111827" }}>{w.name}</span>
      <span>
        <Badge label={w.type}
          color={w.type === "RSE" ? "#2563eb" : "#7c3aed"} />
      </span>
      <span style={{ color: "#374151", fontFamily: "monospace", fontSize: 12 }}>
        ${Number(w.rate_per_hr).toFixed(2)}/hr
      </span>
      <span>
        <Badge
          label={isActive ? "Activo" : "Inactivo"}
          color={isActive ? "#16a34a" : "#6b7280"}
        />
      </span>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button onClick={onEdit} style={btnXS}>Editar</button>
        <button onClick={onToggle} style={btnXS}>
          {isActive ? "Desactivar" : "Activar"}
        </button>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  TEAMS
// ══════════════════════════════════════════════════════════════

function TeamsSection() {
  const [teams, setTeams] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingTeam, setEditingTeam] = useState(null);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamNameError, setTeamNameError] = useState("");
  // Para editar miembros
  const [memberTeam, setMemberTeam] = useState(null);
  const [selectedWorkers, setSelectedWorkers] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRaw, workersRaw, membersRaw] = await Promise.all([
        fetchTeams(),
        fetchWorkers(),
        fetchTeamMembers(),
      ]);

      const teamsArr = Array.isArray(teamsRaw) ? teamsRaw : (teamsRaw.data ?? []);
      const workersArr = Array.isArray(workersRaw) ? workersRaw : (workersRaw.data ?? []);
      const membersArr = Array.isArray(membersRaw) ? membersRaw : (membersRaw.data ?? []);

      // Inyectar members en cada team
      const teamsWithMembers = teamsArr.map(t => ({
        ...t,
        members: membersArr.filter(m => m.team_id === t.team_id),
      }));

      setTeams(teamsWithMembers);
      setWorkers(workersArr);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setTeamName("");
    setEditingTeam(null);
    setTeamNameError("");
    setShowTeamForm(true);
    setMemberTeam(null);
  }

  function openEdit(t) {
    setTeamName(t.name);
    setEditingTeam(t);
    setTeamNameError("");
    setShowTeamForm(true);
    setMemberTeam(null);
  }

  function openMembers(t) {
    setMemberTeam(t);
    setSelectedWorkers((t.members ?? []).map(m => m.worker_id));
    setShowTeamForm(false);
  }

  async function handleSaveTeamName() {
    if (!teamName.trim()) { setTeamNameError("El nombre es requerido"); return; }
    setSaving(true);
    try {
      await saveTeam({ team_id: editingTeam?.team_id, name: teamName.trim() });
      setShowTeamForm(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleTeam(t) {
    const isActive = t.active !== false && t.active !== "FALSE";
    try {
      await toggleTeam(t.team_id, !isActive);
      setTeams(prev =>
        prev.map(x => x.team_id === t.team_id ? { ...x, active: !isActive } : x)
      );
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSaveMembers() {
    setSaving(true);
    try {
      const members = selectedWorkers.map(wid => {
        const w = workers.find(x => x.worker_id === wid);
        return { worker_id: wid, worker_name: w?.name ?? wid };
      });
      await saveTeamMembers(memberTeam.team_id, members);
      setMemberTeam(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleWorkerInTeam(wid) {
    setSelectedWorkers(prev =>
      prev.includes(wid) ? prev.filter(x => x !== wid) : [...prev, wid]
    );
  }

  const activeWorkers = workers.filter(w => w.active !== false && w.active !== "FALSE");

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 16
      }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
          Teams ({teams.filter(t => t.active !== false).length} activos)
        </span>
        <button onClick={openCreate} style={btnPrimary}>
          + Agregar team
        </button>
      </div>

      {error && <Banner type="error" msg={error} onClose={() => setError("")} />}

      {/* Formulario nombre de team */}
      {showTeamForm && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 12 }}>
            {editingTeam ? "Editar team" : "Nuevo team"}
          </div>
          <Field label="Nombre *" error={teamNameError}>
            <input
              style={input(teamNameError)}
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="Ej: Vai team"
              autoFocus
            />
          </Field>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={handleSaveTeamName} disabled={saving} style={btnPrimary}>
              {saving ? "Guardando…" : editingTeam ? "Guardar" : "Crear team"}
            </button>
            <button onClick={() => setShowTeamForm(false)} style={btnSecondary}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Editor de miembros */}
      {memberTeam && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 4 }}>
            Miembros de {memberTeam.name}
          </div>
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
            Seleccioná los workers que integran este team.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {activeWorkers.length === 0 && (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                No hay workers activos. Creá uno en la pestaña Workers.
              </span>
            )}
            {activeWorkers.map(w => {
              const sel = selectedWorkers.includes(w.worker_id);
              return (
                <button
                  key={w.worker_id}
                  onClick={() => toggleWorkerInTeam(w.worker_id)}
                  style={{
                    padding: "6px 12px", fontSize: 12, borderRadius: 20,
                    border: `1px solid ${sel ? "#1d4ed8" : "#d1d5db"}`,
                    background: sel ? "#eff6ff" : "#fff",
                    color: sel ? "#1d4ed8" : "#374151",
                    fontWeight: sel ? 500 : 400,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {sel && <span style={{ fontSize: 10 }}>✓</span>}
                  {w.name}
                  <span style={{ fontSize: 10, color: sel ? "#93c5fd" : "#9ca3af" }}>
                    {w.type}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSaveMembers} disabled={saving} style={btnPrimary}>
              {saving ? "Guardando…" : `Guardar miembros (${selectedWorkers.length})`}
            </button>
            <button onClick={() => setMemberTeam(null)} style={btnSecondary}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de teams */}
      {loading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {teams.length === 0 && (
            <div style={{
              padding: "24px 0", textAlign: "center",
              color: "#9ca3af", fontSize: 13
            }}>
              No hay teams. Agregá uno con el botón de arriba.
            </div>
          )}
          {teams.map(t => {
            const isActive = t.active !== false && t.active !== "FALSE";
            return (
              <div key={t.team_id} style={{
                ...card,
                opacity: isActive ? 1 : 0.55,
                marginBottom: 0,
              }}>
                <div style={{
                  display: "flex", alignItems: "flex-start",
                  justifyContent: "space-between", gap: 12
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                        {t.name}
                      </span>
                      <Badge
                        label={isActive ? "Activo" : "Inactivo"}
                        color={isActive ? "#16a34a" : "#6b7280"}
                      />
                    </div>
                    {/* Chips de miembros */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {(t.members ?? []).length === 0 ? (
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>
                          Sin miembros — hacé click en "Miembros" para agregar
                        </span>
                      ) : (
                        (t.members ?? []).map(m => (
                          <span key={m.worker_id} style={{
                            fontSize: 11, padding: "2px 8px",
                            background: "#f3f4f6", borderRadius: 10,
                            color: "#374151", border: "1px solid #e5e7eb",
                          }}>
                            {m.worker_name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => openEdit(t)} style={btnXS}>Editar</button>
                    <button onClick={() => openMembers(t)} style={btnXS}>Miembros</button>
                    <button onClick={() => handleToggleTeam(t)} style={btnXS}>
                      {isActive ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  COMPONENTES COMPARTIDOS
// ══════════════════════════════════════════════════════════════

function Field({ label, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 11, color: "#dc2626" }}>{error}</span>}
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 10,
      background: color + "18", color, fontWeight: 500,
      border: `1px solid ${color}30`,
    }}>
      {label}
    </span>
  );
}

function Banner({ type, msg, onClose }) {
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8, marginBottom: 16,
      background: type === "error" ? "#fef2f2" : "#f0fdf4",
      color: type === "error" ? "#991b1b" : "#166534",
      border: `1px solid ${type === "error" ? "#fecaca" : "#bbf7d0"}`,
      fontSize: 13, display: "flex", justifyContent: "space-between",
      alignItems: "center",
    }}>
      <span>{msg}</span>
      <button onClick={onClose} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "inherit", fontSize: 14, padding: "0 4px",
      }}>✕</button>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "32px 0", color: "#6b7280", fontSize: 13
    }}>
      <div style={{
        width: 16, height: 16, border: "2px solid #e5e7eb",
        borderTopColor: "#2563eb", borderRadius: "50%",
        animation: "spin .7s linear infinite"
      }} />
      Cargando…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Estilos compartidos ───────────────────────────────────────

const card = {
  background: "#fff", border: "1px solid #e5e7eb",
  borderRadius: 10, padding: 16, marginBottom: 16,
};

const btnPrimary = {
  fontSize: 13, fontWeight: 500, padding: "8px 16px",
  border: "1px solid #1e40af", borderRadius: 6,
  background: "#1d4ed8", color: "#fff", cursor: "pointer",
};

const btnSecondary = {
  fontSize: 13, fontWeight: 500, padding: "8px 16px",
  border: "1px solid #e5e7eb", borderRadius: 6,
  background: "#fff", color: "#374151", cursor: "pointer",
};

const btnXS = {
  fontSize: 11, padding: "4px 10px",
  border: "1px solid #e5e7eb", borderRadius: 5,
  background: "#fff", color: "#374151", cursor: "pointer",
};

const input = (hasError) => ({
  fontSize: 13, padding: "8px 10px", width: "100%",
  border: `1px solid ${hasError ? "#dc2626" : "#d1d5db"}`,
  borderRadius: 6, background: "#fff", color: "#111827",
  outline: "none", boxSizing: "border-box",
});
