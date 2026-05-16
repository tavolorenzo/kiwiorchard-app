/**
 * JobForm.jsx
 * ─────────────────────────────────────────────────────────────
 * Formulario de registro de trabajo de poda.
 * Integra BaySelector, cálculos en tiempo real y escritura
 * en Google Sheets via Apps Script Web App.
 *
 * Props:
 *   orchardId   {string}    - "cas", "bro", etc.
 *   orchardName {string}    - "Casuarina"
 *   bayMap      {Object}    - { "S-1": 21, ... } — cargado por el padre
 *   bayRate     {number}    - tarifa por bay del orchard
 *   teams       {Array}     - [{ team_id, name }]
 *   onSuccess   {Function}  - callback cuando el job se guarda OK
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useMemo } from "react";
import BaySelector from "./BaySelector";
import { calcM2, countBays, calcBaysPerHr, calcCost } from "../lib/calcM2";
import { appendJob } from "../lib/sheets";

// ── HELPERS ──────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmt$(n) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency", currency: "NZD", minimumFractionDigits: 2,
  }).format(n);
}

function fmtNum(n, decimals = 2) {
  return Number(n).toFixed(decimals);
}

// ── FORMULARIO ────────────────────────────────────────────────

const EMPTY_FORM = {
  date:    today(),
  teamId:  "",
  baysCSV: "",
  hours:   "",
  notes:   "",
};

export default function JobForm({
  orchardId,
  orchardName,
  bayMap = {},
  bayRate = 0,
  teams = [],
  onSuccess,
}) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [errors, setErrors]   = useState({});
  const [status, setStatus]   = useState("idle"); // idle | saving | success | error
  const [apiError, setApiError] = useState("");

  // ── Cálculos en tiempo real ──────────────────────────────
  const totalBays  = useMemo(() => countBays(form.baysCSV),               [form.baysCSV]);
  const totalM2    = useMemo(() => calcM2(form.baysCSV, bayMap),           [form.baysCSV, bayMap]);
  const baysPerHr  = useMemo(() => calcBaysPerHr(totalBays, +form.hours),  [totalBays, form.hours]);
  const cost       = useMemo(() => calcCost(totalBays, bayRate),           [totalBays, bayRate]);

  const selectedTeam = teams.find(t => t.team_id === form.teamId);

  // ── Handlers ─────────────────────────────────────────────
  const set = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const setBays = (csv) =>
    setForm(prev => ({ ...prev, baysCSV: csv }));

  // ── Validación ───────────────────────────────────────────
  function validate() {
    const e = {};
    if (!form.date)        e.date    = "La fecha es requerida";
    if (!form.teamId)      e.teamId  = "Seleccioná un team";
    if (!form.baysCSV)     e.baysCSV = "Ingresá al menos un bay";
    if (!form.hours || +form.hours <= 0)
                           e.hours   = "Las horas deben ser > 0";
    if (totalBays === 0)   e.baysCSV = "Ningún bay reconocido en el MAP";
    return e;
  }

  // ── Submit ───────────────────────────────────────────────
  async function handleSubmit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setStatus("saving");
    setApiError("");

    try {
      const payload = {
        orchard_id:       orchardId,
        date:             form.date,
        team_id:          form.teamId,
        team_name:        selectedTeam?.name ?? form.teamId,
        workers_snapshot: selectedTeam?.members ?? "",
        bays_csv:         form.baysCSV,
        total_bays:       totalBays,
        total_m2:         totalM2,
        hours:            +form.hours,
        bays_per_hr:      baysPerHr,
        bay_rate:         bayRate,
        cost:             cost,
        notes:            form.notes,
      };

      const result = await appendJob(payload);
      setStatus("success");
      setForm(EMPTY_FORM);
      onSuccess?.({ ...payload, job_id: result.job_id });

      // Volver a idle después de 3 segundos
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setStatus("error");
      setApiError(err.message);
    }
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setErrors({});
    setStatus("idle");
    setApiError("");
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="job-form">

      {/* Header */}
      <div className="jf-header">
        <div className="jf-orchard">{orchardName}</div>
        <div className="jf-title">Registrar trabajo</div>
        <div className="jf-rate">Bay rate: {fmt$(bayRate)}/bay</div>
      </div>

      {/* Success banner */}
      {status === "success" && (
        <div className="jf-banner success">
          <span>✓</span> Job registrado correctamente
        </div>
      )}

      {/* Error banner */}
      {status === "error" && (
        <div className="jf-banner error">
          <span>✗</span> {apiError || "Error al guardar. Intentá de nuevo."}
        </div>
      )}

      {/* Campos */}
      <div className="jf-body">

        {/* Fecha + Team */}
        <div className="jf-row two-col">
          <div className="jf-field">
            <label className="jf-label">Fecha <span className="req">*</span></label>
            <input
              type="date"
              className={`jf-input ${errors.date ? "invalid" : ""}`}
              value={form.date}
              onChange={set("date")}
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

        {/* Bays */}
        <div className="jf-field">
          <label className="jf-label">
            Bays trabajados <span className="req">*</span>
          </label>
          <BaySelector
            bayMap={bayMap}
            value={form.baysCSV}
            onChange={setBays}
          />
          {errors.baysCSV && <p className="jf-error">{errors.baysCSV}</p>}
        </div>

        {/* Panel de cálculos en tiempo real */}
        {(totalBays > 0 || form.hours > 0) && (
          <div className="jf-calcs">
            <div className="jf-calcs-title">Cálculo en tiempo real</div>
            <div className="calc-grid">
              <div className="calc-card">
                <div className="calc-label">Total bays</div>
                <div className="calc-value">{totalBays}</div>
              </div>
              <div className="calc-card">
                <div className="calc-label">Total m²</div>
                <div className="calc-value">{totalM2.toLocaleString()}</div>
              </div>
              <div className="calc-card">
                <div className="calc-label">Bays / hr</div>
                <div className={`calc-value ${
                  baysPerHr >= 2.5 ? "rate-high" :
                  baysPerHr >= 1.5 ? "rate-mid"  : "rate-low"
                }`}>
                  {fmtNum(baysPerHr)}
                </div>
              </div>
              <div className="calc-card highlight">
                <div className="calc-label">Costo total</div>
                <div className="calc-value">{fmt$(cost)}</div>
              </div>
            </div>

            {/* Barra de bays/hr */}
            {form.hours > 0 && (
              <div className="rate-bar-wrap">
                <div className="rate-bar-label">
                  Productividad — {fmtNum(baysPerHr)} bays/hr
                </div>
                <div className="rate-bar-track">
                  <div
                    className={`rate-bar-fill ${
                      baysPerHr >= 2.5 ? "rate-high" :
                      baysPerHr >= 1.5 ? "rate-mid"  : "rate-low"
                    }`}
                    style={{ width: `${Math.min(baysPerHr / 3 * 100, 100)}%` }}
                  />
                  <div className="rate-markers">
                    <span style={{ left: "50%" }}>1.5</span>
                    <span style={{ left: "83%" }}>2.5</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notas */}
        <div className="jf-field">
          <label className="jf-label">Notas <span className="optional">(opcional)</span></label>
          <textarea
            className="jf-textarea"
            value={form.notes}
            onChange={set("notes")}
            placeholder="Observaciones del día, bays incompletos, incidencias…"
            rows={2}
          />
        </div>

      </div>

      {/* Footer actions */}
      <div className="jf-footer">
        <button
          className="jf-btn-reset"
          onClick={handleReset}
          type="button"
          disabled={status === "saving"}
        >
          Limpiar
        </button>
        <button
          className="jf-btn-submit"
          onClick={handleSubmit}
          type="button"
          disabled={status === "saving"}
        >
          {status === "saving" ? "Guardando…" : "Guardar registro"}
        </button>
      </div>

      {/* ── Estilos ────────────────────────────────────────── */}
      <style>{`
        .job-form {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          font-family: system-ui, sans-serif;
        }

        .jf-header {
          padding: 14px 20px;
          border-bottom: 1px solid #f3f4f6;
          background: #f9fafb;
        }
        .jf-orchard {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .06em;
          color: #2563eb;
          margin-bottom: 2px;
        }
        .jf-title {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
        }
        .jf-rate {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }

        .jf-banner {
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .jf-banner.success { background: #f0fdf4; color: #166534; border-bottom: 1px solid #bbf7d0; }
        .jf-banner.error   { background: #fef2f2; color: #991b1b; border-bottom: 1px solid #fecaca; }

        .jf-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .jf-row { display: flex; gap: 14px; }
        .jf-row.two-col > * { flex: 1; }

        .jf-field { display: flex; flex-direction: column; gap: 4px; }

        .jf-label {
          font-size: 12px;
          font-weight: 500;
          color: #374151;
        }
        .req      { color: #dc2626; }
        .optional { font-weight: 400; color: #9ca3af; }

        .jf-input {
          font-size: 13px;
          padding: 8px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          color: #111827;
          outline: none;
          width: 100%;
          transition: border-color .15s;
        }
        .jf-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
        .jf-input.invalid { border-color: #dc2626; }
        .jf-input.invalid:focus { box-shadow: 0 0 0 3px rgba(220,38,38,.1); }

        .jf-textarea {
          font-size: 13px;
          padding: 8px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          color: #111827;
          outline: none;
          resize: vertical;
          width: 100%;
          transition: border-color .15s;
          font-family: inherit;
        }
        .jf-textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }

        .jf-error { font-size: 11px; color: #dc2626; margin: 0; }
        .jf-hint  { font-size: 11px; color: #6b7280; margin: 0; }

        /* Panel de cálculos */
        .jf-calcs {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
        }
        .jf-calcs-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .06em;
          color: #94a3b8;
          margin-bottom: 10px;
        }
        .calc-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .calc-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 10px;
          text-align: center;
        }
        .calc-card.highlight {
          border-color: #bfdbfe;
          background: #eff6ff;
        }
        .calc-label {
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: .05em;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .calc-value {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.2;
        }
        .calc-value.rate-high { color: #16a34a; }
        .calc-value.rate-mid  { color: #d97706; }
        .calc-value.rate-low  { color: #dc2626; }

        /* Barra de productividad */
        .rate-bar-wrap { margin-top: 4px; }
        .rate-bar-label {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 5px;
        }
        .rate-bar-track {
          position: relative;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: visible;
        }
        .rate-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width .3s ease;
        }
        .rate-bar-fill.rate-high { background: #16a34a; }
        .rate-bar-fill.rate-mid  { background: #d97706; }
        .rate-bar-fill.rate-low  { background: #dc2626; }
        .rate-markers {
          position: absolute;
          top: -18px;
          left: 0;
          right: 0;
          height: 0;
        }
        .rate-markers span {
          position: absolute;
          font-size: 10px;
          color: #94a3b8;
          transform: translateX(-50%);
        }

        /* Footer */
        .jf-footer {
          padding: 14px 20px;
          border-top: 1px solid #f3f4f6;
          background: #f9fafb;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .jf-btn-reset {
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          color: #374151;
          cursor: pointer;
        }
        .jf-btn-reset:hover { background: #f9fafb; }
        .jf-btn-reset:disabled { opacity: .5; cursor: not-allowed; }

        .jf-btn-submit {
          font-size: 13px;
          font-weight: 500;
          padding: 8px 20px;
          border: 1px solid #1e40af;
          border-radius: 6px;
          background: #1d4ed8;
          color: #fff;
          cursor: pointer;
        }
        .jf-btn-submit:hover:not(:disabled) { background: #1e40af; }
        .jf-btn-submit:disabled { opacity: .6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
