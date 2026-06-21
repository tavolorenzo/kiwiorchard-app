/**
 * RegisterPage.jsx v1.2
 * Panel izquierdo: JobForm
 * Panel derecho: resumen readonly de hoy y ayer
 */
import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useFirestore } from "../hooks/useFirestore";
import { useJobs } from "../lib/useJobs";
import JobForm from "../components/JobForm";
import { fetchTeamMembers } from "../lib/firebase";

// ── Helpers de fecha ──────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function fmt$(n) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency", currency: "NZD", minimumFractionDigits: 0,
  }).format(n ?? 0);
}

// ── Componente principal ──────────────────────────────────────

export default function RegisterPage() {
  const { orchardId } = useParams();
  const [teamMembers, setTeamMembers] = useState([]);
  const { config, getBayRate, getOrchardMaps, loading, error } = useFirestore();
  const { jobs, addJob } = useJobs(orchardId);

  const [rowMap, setRowMap] = useState({});
  const [blockMap, setBlockMap] = useState({});
  const [rowToBlock, setRowToBlock] = useState({});
  const [mapLoading, setMapLoading] = useState(false);

  const activeOrchard = config?.orchards?.find(o => o.orchard_id === orchardId);
  const bayRate = config ? getBayRate(orchardId) : 0;

  const teams = config
    ? config.teams.filter(t => t.active !== false).map(t => ({
      ...t,
      members: teamMembers
        .filter(m => m.team_id === t.team_id && m.worker_name)
        .map(m => String(m.worker_name).trim())
        .filter(Boolean)
        .join(", "),
    }))
    : [];

  useEffect(() => {
    fetchTeamMembers().then(setTeamMembers);
  }, []);

  useEffect(() => {
    if (!config) return;
    setMapLoading(true);
    getOrchardMaps(orchardId)
      .then(({ rowMap, blockMap, rowToBlock }) => {
        setRowMap(rowMap);
        setBlockMap(blockMap);
        setRowToBlock(rowToBlock);
      })
      .finally(() => setMapLoading(false));
  }, [orchardId, config]);

  if (loading) return <Spinner text="Cargando configuración…" />;
  if (error) return <ErrMsg msg={error} />;

  return (
    <div style={{
      display: "flex", gap: 20, padding: 24,
      alignItems: "flex-start",
    }}>

      {/* ── Panel izquierdo: formulario ───────────────────── */}
      <div style={{ flex: "0 0 680px", minWidth: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111827", margin: 0 }}>
            {activeOrchard?.name}
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            Registrar trabajo · Bay rate: ${bayRate}/bay
          </p>
        </div>

        {mapLoading ? (
          <Spinner text={`Cargando mapa de ${activeOrchard?.name}…`} />
        ) : (
          <JobForm
            orchardId={orchardId}
            orchardName={activeOrchard?.name ?? ""}
            rowMap={rowMap}
            blockMap={blockMap}
            rowToBlock={rowToBlock}
            bayRate={bayRate}
            teams={teams}
            onSuccess={addJob}
            jobs={jobs}
          />
        )}
      </div>

      {/* ── Panel derecho: resumen ────────────────────────── */}
      <div style={{
        flex: 1, minWidth: 260,
        position: "sticky", top: 73,
      }}>
        <SummaryPanel jobs={jobs} />
      </div>
    </div>
  );
}

// ── SummaryPanel ──────────────────────────────────────────────

function SummaryPanel({ jobs }) {
  const today = todayStr();
  const yesterday = yesterdayStr();

  const todayJobs = useMemo(() => jobs.filter(j => j.date === today), [jobs, today]);
  const yesterdayJobs = useMemo(() => jobs.filter(j => j.date === yesterday), [jobs, yesterday]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <DayBlock label="Hoy" date={today} dayJobs={todayJobs} accent />
      <DayBlock label="Ayer" date={yesterday} dayJobs={yesterdayJobs} />
    </div>
  );
}

// ── DayBlock ──────────────────────────────────────────────────

function DayBlock({ label, date, dayJobs, accent }) {
  const totalBays = dayJobs.reduce((s, j) => s + Number(j.total_bays ?? 0), 0);
  const totalCost = dayJobs.reduce((s, j) => s + Number(j.cost ?? 0), 0);
  const totalHours = dayJobs.reduce((s, j) => s + Number(j.hours ?? 0), 0);
  const avgBaysHr = totalHours > 0
    ? Math.round(totalBays / totalHours * 100) / 100 : 0;

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${accent ? "#bfdbfe" : "#e5e7eb"}`,
      borderTop: `3px solid ${accent ? "#2563eb" : "#e5e7eb"}`,
      borderRadius: 10,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid #f3f4f6",
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: accent ? "#1d4ed8" : "#6b7280",
          }}>
            {label}
          </span>
          <span style={{
            fontSize: 11, color: "#9ca3af", marginLeft: 6,
          }}>
            {date}
          </span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600,
          padding: "2px 8px", borderRadius: 10,
          background: dayJobs.length > 0 ? "#dcfce7" : "#f3f4f6",
          color: dayJobs.length > 0 ? "#166534" : "#9ca3af",
        }}>
          {dayJobs.length} {dayJobs.length === 1 ? "job" : "jobs"}
        </span>
      </div>

      {dayJobs.length === 0 ? (
        <div style={{
          padding: "20px 14px", textAlign: "center",
          fontSize: 12, color: "#d1d5db",
        }}>
          Sin registros
        </div>
      ) : (
        <div>
          {/* KPIs del día */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 1, background: "#f3f4f6",
            borderBottom: "1px solid #f3f4f6",
          }}>
            <KpiCell label="Bays" value={totalBays.toLocaleString()} />
            <KpiCell label="Costo" value={fmt$(totalCost)} accent={accent} />
            <KpiCell label="Horas" value={totalHours.toFixed(1)} />
            <KpiCell
              label="Bays/hr"
              value={avgBaysHr > 0 ? avgBaysHr.toFixed(2) : "—"}
              color={
                avgBaysHr >= 2.5 ? "#16a34a" :
                  avgBaysHr >= 1.5 ? "#d97706" :
                    avgBaysHr > 0 ? "#dc2626" : "#9ca3af"
              }
            />
          </div>

          {/* Detalle por job */}
          <div style={{ padding: "8px 0" }}>
            {dayJobs.map((j, i) => (
              <JobRow key={j.job_id ?? i} job={j} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── JobRow ────────────────────────────────────────────────────

function JobRow({ job: j }) {
  const baysHr = Number(j.bays_per_hr ?? 0);
  return (
    <div style={{
      padding: "7px 14px",
      borderBottom: "1px solid #f9fafb",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      {/* Team + bays */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: 12, fontWeight: 500, color: "#374151",
        }}>
          {j.team_name ?? j.team_id}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 600, color: "#111827",
        }}>
          {j.total_bays} bays
        </span>
      </div>

      {/* Horas + bays/hr + costo */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: 8, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>
          {j.hours}h
        </span>
        <span style={{
          fontSize: 11, fontWeight: 500,
          color: baysHr >= 2.5 ? "#16a34a"
            : baysHr >= 1.5 ? "#d97706" : "#dc2626",
        }}>
          {baysHr.toFixed(2)} b/hr
        </span>
        <span style={{ fontSize: 11, color: "#6b7280", marginLeft: "auto" }}>
          {new Intl.NumberFormat("en-NZ", {
            style: "currency", currency: "NZD", minimumFractionDigits: 0,
          }).format(j.cost ?? 0)}
        </span>
      </div>

      {/* Notas */}
      {j.notes && (
        <span style={{
          fontSize: 11, color: "#9ca3af",
          fontStyle: "italic",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {j.notes}
        </span>
      )}
    </div>
  );
}

// ── KpiCell ───────────────────────────────────────────────────

function KpiCell({ label, value, accent, color }) {
  return (
    <div style={{
      background: "#fff", padding: "10px 14px",
    }}>
      <div style={{
        fontSize: 9, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: ".06em",
        color: "#9ca3af", marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 16, fontWeight: 600,
        color: color ?? (accent ? "#1d4ed8" : "#111827"),
      }}>
        {value}
      </div>
    </div>
  );
}

// ── Utilidades ────────────────────────────────────────────────

function Spinner({ text }) {
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
      {text}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ErrMsg({ msg }) {
  return (
    <div style={{ padding: 24, color: "#991b1b", fontSize: 13 }}>⚠️ {msg}</div>
  );
}