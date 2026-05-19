/**
 * JobForm.jsx v1.1
 * Formulario de registro de trabajo.
 * Usa RowSelector en lugar de BaySelector.
 * Guarda delta de bays (no acumulado).
 */

import { useState, useMemo } from "react";
import RowSelector from "./RowSelector";
import {
  calcM2FromDelta, countBays, calcBaysPerHr, calcCost,
  applyDelta, serializeRows,
} from "../lib/calcM2";
import { appendJob } from "../lib/sheets";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmt$(n) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency", currency: "NZD", minimumFractionDigits: 2,
  }).format(n);
}

const EMPTY_FORM = {
  date: today(),
  teamId: "",
  hours: "",
  notes: "",
};

export default function JobForm({
  orchardId,
  orchardName,
  rowMap = {},
  blockMap = {},
  rowToBlock = {},
  bayRate = 0,
  teams = [],
  onSuccess,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [rowSel, setRowSel] = useState([]); // [{ row_id, bays_selected }]
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [apiError, setApiError] = useState("");

  const selectedTeam = teams.find(t => t.team_id === form.teamId);

  // Pre-cargados desde localStorage (para calcular delta)
  const preloaded = useMemo(() => {
    if (!orchardId || !form.date) return {};
    try {
      const raw = localStorage.getItem(`kiwi_preload_${orchardId}_${form.date}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }, [orchardId, form.date]);

  // Delta: solo las rows con trabajo nuevo
  const deltaRows = useMemo(
    () => applyDelta(rowSel, preloaded),
    [rowSel, preloaded]
  );

  // Cálculos en tiempo real sobre el DELTA
  const totalBays = useMemo(() => countBays(deltaRows), [deltaRows]);
  const totalM2 = useMemo(() => calcM2FromDelta(deltaRows, blockMap, rowToBlock), [deltaRows, blockMap, rowToBlock]);
  const baysPerHr = useMemo(() => calcBaysPerHr(totalBays, +form.hours), [totalBays, form.hours]);
  const cost = useMemo(() => calcCost(totalBays, bayRate), [totalBays, bayRate]);

  const set = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  // Al cambiar fecha, resetear selección de rows
  const setDate = (e) => {
    setForm(prev => ({ ...prev, date: e.target.value }));
    setRowSel([]);
  };

  function validate() {
    const e = {};
    if (!form.date) e.date = "La fecha es requerida";
    if (!form.teamId) e.teamId = "Seleccioná un team";
    if (!form.hours || +form.hours <= 0) e.hours = "Las horas deben ser > 0";
    if (deltaRows.length === 0) e.rows = "No hay trabajo nuevo registrado";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setStatus("saving");
    setApiError("");

    try {
      const workersSnapshot =
        (selectedTeam?.members?.trim())
          ? selectedTeam.members.trim()
          : (selectedTeam?.name ?? form.teamId ?? "Sin especificar");

      const payload = {
        orchard_id: orchardId,
        date: form.date,
        team_id: form.teamId,
        team_name: selectedTeam?.name ?? form.teamId,
        workers_snapshot: workersSnapshot,
        rows_json: serializeRows(deltaRows),  // delta serializado
        total_bays: totalBays,
        total_m2: Math.round(totalM2 * 100) / 100,
        hours: +form.hours,
        bays_per_hr: baysPerHr,
        bay_rate: bayRate,
        cost: cost,
        notes: form.notes,
      };

      const result = await appendJob(payload);

      // Actualizar localStorage con los nuevos acumulados
      const newPreloaded = { ...preloaded };
      deltaRows.forEach(({ row_id, bays_delta }) => {
        newPreloaded[row_id] = (newPreloaded[row_id] ?? 0) + bays_delta;
      });
      localStorage.setItem(
        `kiwi_preload_${orchardId}_${form.date}`,
        JSON.stringify(newPreloaded)
      );

      setStatus("success");
      setForm(EMPTY_FORM);
      setRowSel([]);
      onSuccess?.({ ...payload, job_id: result.job_id });
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setStatus("error");
      setApiError(err.message);
    }
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setRowSel([]);
    setErrors({});
    setStatus("idle");
    setApiError("");
  }

  return (
    <div className="job-form">

      <div className="jf-header">
        <div className="jf-orchard">{orchardName}</div>
        <div className="jf-title">Registrar trabajo</div>
        <div className="jf-rate">Bay rate: {fmt$(bayRate)}/bay</div>
      </div>

      {status === "success" && (
        <div className="jf-banner success">✓ Job registrado correctamente</div>
      )}
      {status === "error" && (
        <div className="jf-banner error">✗ {apiError || "Error al guardar."}</div>
      )}

      <div className="jf-body">

        {/* Fecha + Team */}
        <div className="jf-row two-col">
          <div className="jf-field">
            <label className="jf-label">Fecha <span className="req">*</span></label>
            <input
              type="date"
              className={`jf-input ${errors.date ? "invalid" : ""}`}
              value={form.date}
              onChange={setDate}
              max={today()}
            />
            {errors.date && <p className="jf-error">{errors.date}</p>}
          </div>
          <div className="jf-field">
            <label className="jf-label">Team <span className="req">*</span></label>
            <select
              className={`jf-input ${errors.teamId ? "invalid" : ""}`}
              value={form.teamId}
              onChange={set("teamId")}
            >
              <option value="">Seleccionar team…</option>
              {teams.map(t => (
                <option key={t.team_id} value={t.team_id}>{t.name}</option>
              ))}
            </select>
            {errors.teamId && <p className="jf-error">{errors.teamId}</p>}
            {selectedTeam?.members && (
              <p className="jf-hint">👥 {selectedTeam.members}</p>
            )}
          </div>
        </div>

        {/* Horas */}
        <div className="jf-field" style={{ maxWidth: 180 }}>
          <label className="jf-label">Horas trabajadas <span className="req">*</span></label>
          <input
            type="number"
            className={`jf-input ${errors.hours ? "invalid" : ""}`}
            value={form.hours}
            onChange={set("hours")}
            placeholder="24"
            min="0"
            step="0.25"
          />
          {errors.hours && <p className="jf-error">{errors.hours}</p>}
        </div>

        {/* Row Selector */}
        <div className="jf-field">
          <label className="jf-label">
            Filas trabajadas <span className="req">*</span>
          </label>
          <RowSelector
            rowMap={rowMap}
            blockMap={blockMap}
            rowToBlock={rowToBlock}
            orchardId={orchardId}
            date={form.date}
            value={rowSel}
            onChange={setRowSel}
          />
          {errors.rows && <p className="jf-error">{errors.rows}</p>}
        </div>

        {/* Panel de cálculos */}
        {(totalBays > 0 || +form.hours > 0) && (
          <div className="jf-calcs">
            <div className="jf-calcs-title">Cálculo en tiempo real — trabajo nuevo</div>
            <div className="calc-grid">
              <div className="calc-card">
                <div className="calc-label">Bays nuevos</div>
                <div className="calc-value">{totalBays}</div>
              </div>
              <div className="calc-card">
                <div className="calc-label">m² nuevos</div>
                <div className="calc-value">
                  {totalM2.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </div>
              </div>
              <div className="calc-card">
                <div className="calc-label">Bays / hr</div>
                <div className={`calc-value ${baysPerHr >= 2.5 ? "rate-high" :
                    baysPerHr >= 1.5 ? "rate-mid" : "rate-low"
                  }`}>
                  {+form.hours > 0 ? baysPerHr.toFixed(2) : "—"}
                </div>
              </div>
              <div className="calc-card highlight">
                <div className="calc-label">Costo</div>
                <div className="calc-value">{fmt$(cost)}</div>
              </div>
            </div>

            {/* Barra de productividad */}
            {+form.hours > 0 && totalBays > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                  Productividad — {baysPerHr.toFixed(2)} bays/hr
                </div>
                <div style={{
                  height: 6, background: "#e2e8f0",
                  borderRadius: 3, overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    transition: "width .3s",
                    width: `${Math.min(baysPerHr / 3 * 100, 100)}%`,
                    background: baysPerHr >= 2.5 ? "#16a34a"
                      : baysPerHr >= 1.5 ? "#d97706" : "#dc2626",
                  }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notas */}
        <div className="jf-field">
          <label className="jf-label">
            Notas <span className="optional">(opcional)</span>
          </label>
          <textarea
            className="jf-textarea"
            value={form.notes}
            onChange={set("notes")}
            placeholder="Observaciones del día, filas incompletas, incidencias…"
            rows={2}
          />
        </div>
      </div>

      <div className="jf-footer">
        <button className="jf-btn-reset" onClick={handleReset}
          type="button" disabled={status === "saving"}>
          Limpiar
        </button>
        <button className="jf-btn-submit" onClick={handleSubmit}
          type="button" disabled={status === "saving"}>
          {status === "saving" ? "Guardando…" : "Guardar registro"}
        </button>
      </div>

      <style>{`
        .job-form{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-family:system-ui,sans-serif}
        .jf-header{padding:14px 20px;border-bottom:1px solid #f3f4f6;background:#f9fafb}
        .jf-orchard{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#2563eb;margin-bottom:2px}
        .jf-title{font-size:15px;font-weight:600;color:#111827}
        .jf-rate{font-size:12px;color:#6b7280;margin-top:2px}
        .jf-banner{padding:10px 20px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px}
        .jf-banner.success{background:#f0fdf4;color:#166534;border-bottom:1px solid #bbf7d0}
        .jf-banner.error{background:#fef2f2;color:#991b1b;border-bottom:1px solid #fecaca}
        .jf-body{padding:20px;display:flex;flex-direction:column;gap:16px}
        .jf-row{display:flex;gap:14px}
        .jf-row.two-col>*{flex:1}
        .jf-field{display:flex;flex-direction:column;gap:4px}
        .jf-label{font-size:12px;font-weight:500;color:#374151}
        .req{color:#dc2626}.optional{font-weight:400;color:#9ca3af}
        .jf-input{font-size:13px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#111827;outline:none;width:100%;transition:border-color .15s}
        .jf-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
        .jf-input.invalid{border-color:#dc2626}
        .jf-textarea{font-size:13px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#111827;outline:none;resize:vertical;width:100%;font-family:inherit}
        .jf-textarea:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
        .jf-error{font-size:11px;color:#dc2626;margin:0}
        .jf-hint{font-size:11px;color:#6b7280;margin:0}
        .jf-calcs{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px}
        .jf-calcs-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:10px}
        .calc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px}
        .calc-card{background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:10px;text-align:center}
        .calc-card.highlight{border-color:#bfdbfe;background:#eff6ff}
        .calc-label{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:4px}
        .calc-value{font-size:18px;font-weight:600;color:#1e293b;line-height:1.2}
        .calc-value.rate-high{color:#16a34a}.calc-value.rate-mid{color:#d97706}.calc-value.rate-low{color:#dc2626}
        .jf-footer{padding:14px 20px;border-top:1px solid #f3f4f6;background:#f9fafb;display:flex;justify-content:flex-end;gap:10px}
        .jf-btn-reset{font-size:13px;font-weight:500;padding:8px 16px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#374151;cursor:pointer}
        .jf-btn-reset:hover{background:#f9fafb}
        .jf-btn-reset:disabled{opacity:.5;cursor:not-allowed}
        .jf-btn-submit{font-size:13px;font-weight:500;padding:8px 20px;border:1px solid #1e40af;border-radius:6px;background:#1d4ed8;color:#fff;cursor:pointer}
        .jf-btn-submit:hover:not(:disabled){background:#1e40af}
        .jf-btn-submit:disabled{opacity:.6;cursor:not-allowed}
      `}</style>
    </div>
  );
}
