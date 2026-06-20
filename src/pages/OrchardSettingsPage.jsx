/**
 * OrchardSettingsPage.jsx
 * Configuración específica de un orchard.
 * Por ahora: editar bay_rate (único campo editable en el doc raíz).
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useFirestore } from "../hooks/useFirestore";
import { updateOrchard } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";

export default function OrchardSettingsPage() {
  const { orchardId } = useParams();
  const { config, loading, invalidateConfig } = useFirestore();
  const { admin } = useAuth();

  const orchard = config?.orchards?.find(o => o.orchard_id === orchardId);

  const [bayRate, setBayRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  // Inicializar campo cuando carga el orchard
  useEffect(() => {
    if (orchard) {
      setBayRate(String(orchard.bay_rate ?? ""));
      setDirty(false);
    }
  }, [orchard]);

  async function handleSave() {
    const parsed = parseFloat(bayRate);
    if (isNaN(parsed) || parsed < 0) {
      setError("Ingresá un bay rate válido (número ≥ 0).");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await updateOrchard(orchardId, { bay_rate: parsed });
      invalidateConfig(); // fuerza re-fetch del config cache
      setSuccess(true);
      setDirty(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleBayRateChange(val) {
    setBayRate(val);
    setDirty(true);
    setError("");
    setSuccess(false);
  }

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: 24, maxWidth: 600, fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111827", margin: 0 }}>
          {orchard?.name ?? orchardId}
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
          Configuración del orchard
        </p>
      </div>

      {/* Info readonly */}
      <div style={{
        background: "#fff", border: "1px solid #e5e7eb",
        borderRadius: 10, padding: 20, marginBottom: 16,
      }}>
        <SectionTitle>Información general</SectionTitle>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 12, marginTop: 12,
        }}>
          <InfoField label="Orchard ID" value={orchard?.orchard_id ?? "—"} />
          <InfoField label="Total ha" value={orchard?.total_ha ? `${orchard.total_ha} ha` : "—"} />
          <InfoField label="Estado" value={orchard?.active !== false ? "Activo" : "Inactivo"} />
        </div>
      </div>

      {/* Bay rate editable */}
      <div style={{
        background: "#fff", border: "1px solid #e5e7eb",
        borderRadius: 10, padding: 20,
      }}>
        <SectionTitle>Parámetros de costo</SectionTitle>

        {!admin && (
          <div style={{
            marginTop: 12, padding: "8px 12px",
            background: "#fef9c3", border: "1px solid #fde047",
            borderRadius: 6, fontSize: 12, color: "#854d0e",
          }}>
            Solo el administrador puede editar estos valores.
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>
            Bay rate (NZD / bay)
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <div style={{ position: "relative", width: 160 }}>
              <span style={{
                position: "absolute", left: 10, top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af", fontSize: 13,
              }}>
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.10"
                value={bayRate}
                onChange={e => handleBayRateChange(e.target.value)}
                disabled={!admin || saving}
                style={{
                  width: "100%", fontSize: 13,
                  padding: "8px 10px 8px 22px",
                  border: `1px solid ${error ? "#dc2626" : "#d1d5db"}`,
                  borderRadius: 6,
                  background: !admin ? "#f9fafb" : "#fff",
                  color: "#111827", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {admin && (
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                style={{
                  fontSize: 13, fontWeight: 500,
                  padding: "8px 18px",
                  border: "1px solid #1e40af", borderRadius: 6,
                  background: saving || !dirty ? "#93c5fd" : "#1d4ed8",
                  color: "#fff",
                  cursor: saving || !dirty ? "not-allowed" : "pointer",
                  transition: "background .15s",
                }}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            )}
          </div>

          {error && (
            <p style={{ fontSize: 12, color: "#dc2626", margin: "6px 0 0" }}>
              {error}
            </p>
          )}
          {success && (
            <p style={{ fontSize: 12, color: "#16a34a", margin: "6px 0 0" }}>
              ✓ Bay rate actualizado correctamente.
            </p>
          )}

          <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0" }}>
            Este valor se usa para calcular el costo en todos los jobs registrados.
            Los jobs ya guardados no se recalculan.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600,
      textTransform: "uppercase", letterSpacing: ".06em",
      color: "#9ca3af",
    }}>
      {children}
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{value}</div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: 48, color: "#6b7280", fontSize: 13,
    }}>
      <div style={{
        width: 18, height: 18, border: "2px solid #e5e7eb",
        borderTopColor: "#2563eb", borderRadius: "50%",
        animation: "spin .7s linear infinite",
      }} />
      Cargando configuración…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const labelStyle = {
  fontSize: 12, fontWeight: 500, color: "#374151",
};