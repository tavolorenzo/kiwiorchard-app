/**
 * DashboardPage.jsx
 * Dashboard por orchard — KPIs, gráfico diario, tabla de jobs.
 */
import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend,
} from "recharts";
import { useFirestore } from "../hooks/useFirestore";
import { useJobs }   from "../lib/useJobs";
import { ORCHARDS }  from "../components/Layout";
import JobForm from "../components/JobForm";

const COLORS = {
  "t-vai":  "#2563eb",
  "t-asi":  "#7c3aed",
  "t-hari": "#059669",
  "t-moe":  "#d97706",
  "t-ind":  "#6b7280",
};
const DEFAULT_COLOR = "#94a3b8";

function fmt$(n) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency", currency: "NZD", minimumFractionDigits: 0,
  }).format(n ?? 0);
}

export default function DashboardPage() {
  const { orchardId } = useParams();
  const { config, getBayRate, getOrchardMaps } = useFirestore();
  const { jobs, loading, error, updateJobState, deleteJob } = useJobs(orchardId);

  const [rowMap,     setRowMap]     = useState({});
  const [blockMap,   setBlockMap]   = useState({});
  const [rowToBlock, setRowToBlock] = useState({});
  const [editingJob, setEditingJob] = useState(null);

  const orchard  = ORCHARDS.find(o => o.id === orchardId);
  const bayRate  = config ? getBayRate(orchardId) : 0;

  const teams = config
    ? config.teams.filter(t => t.active !== false).map(t => ({
        ...t,
        members: config.teamMembers
          .filter(m => m.team_id === t.team_id && m.worker_name)
          .map(m => String(m.worker_name).trim())
          .filter(Boolean)
          .join(", "),
      }))
    : [];

  useEffect(() => {
    if (!config || !orchardId) return;
    getOrchardMaps(orchardId)
      .then(({ rowMap, blockMap, rowToBlock }) => {
        setRowMap(rowMap);
        setBlockMap(blockMap);
        setRowToBlock(rowToBlock);
      })
      .catch(console.error);
  }, [orchardId, config, getOrchardMaps]);

  const handleDelete = async (job) => {
    if (window.confirm(`¿Seguro que deseas eliminar el registro de trabajo del ${job.date} para ${job.team_name}?`)) {
      try {
        await deleteJob(job.job_id);
      } catch (err) {
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  // ── Métricas globales ────────────────────────────────────
  const kpis = useMemo(() => {
    if (!jobs.length) return null;
    const totalBays   = jobs.reduce((s, j) => s + j.total_bays,  0);
    const totalM2     = jobs.reduce((s, j) => s + j.total_m2,    0);
    const totalCost   = jobs.reduce((s, j) => s + j.cost,        0);
    const totalHours  = jobs.reduce((s, j) => s + j.hours,       0);
    const avgBaysHr   = totalHours > 0
      ? Math.round(totalBays / totalHours * 100) / 100 : 0;
    const days = new Set(jobs.map(j => j.date)).size;
    return { totalBays, totalM2, totalCost, avgBaysHr, days };
  }, [jobs]);

  // ── Datos por día para el gráfico de barras ──────────────
  const dailyData = useMemo(() => {
    const byDay = {};
    jobs.forEach(j => {
      if (!byDay[j.date]) byDay[j.date] = { date: j.date, bays: 0, cost: 0 };
      byDay[j.date].bays += j.total_bays;
      byDay[j.date].cost += j.cost;
    });
    return Object.values(byDay)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, cost: Math.round(d.cost * 100) / 100 }));
  }, [jobs]);

  // ── Datos por team para el gráfico de líneas ─────────────
  const teamData = useMemo(() => {
    const teams = [...new Set(jobs.map(j => j.team_id))];
    const byDay  = {};
    jobs.forEach(j => {
      if (!byDay[j.date]) byDay[j.date] = { date: j.date };
      byDay[j.date][j.team_id] = (byDay[j.date][j.team_id] ?? 0) + j.bays_per_hr;
    });
    return { rows: Object.values(byDay).sort((a,b) => a.date.localeCompare(b.date)), teams };
  }, [jobs]);

  if (loading) return <Spinner text={`Cargando jobs de ${orchard?.name}…`} />;
  if (error)   return <ErrMsg msg={error} />;

  return (
    <div style={{ padding: 24 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111827", margin: 0 }}>
          {orchard?.name}
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
          Dashboard de temporada · Bay rate: ${bayRate}/bay
        </p>
      </div>

      {!kpis ? (
        <EmptyState orchardName={orchard?.name} />
      ) : (
        <>
          {/* KPIs */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12, marginBottom: 24,
          }}>
            <KpiCard label="Total bays"    value={kpis.totalBays.toLocaleString()} />
            <KpiCard label="Total m²"      value={kpis.totalM2.toLocaleString()} />
            <KpiCard label="Costo total"   value={fmt$(kpis.totalCost)} accent />
            <KpiCard label="Bays/hr prom." value={kpis.avgBaysHr.toFixed(2)}
              color={kpis.avgBaysHr >= 2.5 ? "#16a34a" : kpis.avgBaysHr >= 1.5 ? "#d97706" : "#dc2626"} />
            <KpiCard label="Días trabajados" value={kpis.days} />
          </div>

          {/* Gráfico bays por día */}
          <ChartCard title="Bays trabajados por día">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} width={36} />
                <Tooltip
                  formatter={(v) => [v, "Bays"]}
                  labelStyle={{ fontSize: 11 }}
                  contentStyle={{ fontSize: 11, borderRadius: 6 }}
                />
                <Bar dataKey="bays" radius={[3,3,0,0]}>
                  {dailyData.map((_, i) => (
                    <Cell key={i} fill="#2563eb" opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Gráfico bays/hr por team */}
          {teamData.teams.length > 1 && (
            <ChartCard title="Bays/hr por team">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={teamData.rows} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} width={36} domain={[0, "auto"]} />
                  <Tooltip
                    formatter={(v, name) => [Number(v).toFixed(2), name]}
                    labelStyle={{ fontSize: 11 }}
                    contentStyle={{ fontSize: 11, borderRadius: 6 }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  {teamData.teams.map(teamId => (
                    <Line
                      key={teamId}
                      type="monotone"
                      dataKey={teamId}
                      stroke={COLORS[teamId] ?? DEFAULT_COLOR}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Tabla de jobs */}
          <div style={{
            background: "#fff", border: "1px solid #e5e7eb",
            borderRadius: 10, overflow: "hidden", marginTop: 16,
          }}>
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid #f3f4f6",
              fontSize: 13, fontWeight: 500, color: "#111827",
            }}>
              Registros de trabajo ({jobs.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Fecha","Team","Bays","m²","Hrs","Bays/hr","Costo","Notas","Acciones"].map(h => (
                      <th key={h} style={{
                        padding: "8px 12px", textAlign: h === "Acciones" ? "right" : "left",
                        fontSize: 11, fontWeight: 500, color: "#6b7280",
                        borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j, i) => (
                    <tr key={j.job_id ?? i}
                      style={{ borderBottom: "1px solid #f9fafb" }}
                    >
                      <td style={td}>{j.date}</td>
                      <td style={td}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px", borderRadius: 10,
                          fontSize: 11, fontWeight: 500,
                          background: (COLORS[j.team_id] ?? "#94a3b8") + "20",
                          color: COLORS[j.team_id] ?? "#374151",
                        }}>
                          {j.team_name}
                        </span>
                      </td>
                      <td style={{ ...td, fontWeight: 500 }}>{j.total_bays}</td>
                      <td style={td}>{Number(j.total_m2).toLocaleString()}</td>
                      <td style={td}>{j.hours}</td>
                      <td style={td}>
                        <span style={{
                          fontWeight: 500,
                          color: j.bays_per_hr >= 2.5 ? "#16a34a"
                               : j.bays_per_hr >= 1.5 ? "#d97706" : "#dc2626",
                        }}>
                          {Number(j.bays_per_hr).toFixed(2)}
                        </span>
                      </td>
                      <td style={{ ...td, fontWeight: 500 }}>{fmt$(j.cost)}</td>
                      <td style={{ ...td, color: "#9ca3af", maxWidth: 160,
                                   overflow: "hidden", textOverflow: "ellipsis",
                                   whiteSpace: "nowrap" }}>
                        {j.notes ?? "—"}
                      </td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => setEditingJob(j)}
                          style={{
                            background: "none", border: "none", color: "#2563eb",
                            cursor: "pointer", marginRight: 8, fontSize: 11, fontWeight: 500
                          }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(j)}
                          style={{
                            background: "none", border: "none", color: "#dc2626",
                            cursor: "pointer", fontSize: 11, fontWeight: 500
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal para Editar Job */}
          {editingJob && (
            <div style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center",
              justifyContent: "center", zIndex: 999,
              padding: 16,
            }}>
              <div style={{
                background: "#fff",
                borderRadius: 12,
                width: "100%",
                maxWidth: 600,
                maxHeight: "90vh",
                overflow: "hidden",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                display: "flex",
                flexDirection: "column",
              }}>
                <div style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>
                    Editar Registro de Trabajo
                  </span>
                  <button
                    onClick={() => setEditingJob(null)}
                    style={{
                      background: "none", border: "none",
                      cursor: "pointer", color: "#9ca3af",
                      fontSize: 16, padding: "4px 8px"
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ overflowY: "auto", padding: 20 }}>
                  <JobForm
                    key={editingJob.job_id}
                    orchardId={orchardId}
                    orchardName={orchard?.name ?? ""}
                    rowMap={rowMap}
                    blockMap={blockMap}
                    rowToBlock={rowToBlock}
                    bayRate={bayRate}
                    teams={teams}
                    onSuccess={(updatedJob) => {
                      updateJobState(editingJob.job_id, updatedJob);
                      setEditingJob(null);
                    }}
                    editingJob={editingJob}
                    jobs={jobs}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const td = {
  padding: "8px 12px", color: "#374151", verticalAlign: "middle",
};

function KpiCard({ label, value, accent, color }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 10, padding: "14px 16px",
      borderTop: accent ? "3px solid #2563eb" : undefined,
    }}>
      <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase",
                    letterSpacing: ".06em", color: "#9ca3af", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color ?? "#111827" }}>
        {value}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 10, padding: "16px", marginBottom: 16,
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#111827",
                    marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ orchardName }) {
  return (
    <div style={{
      textAlign: "center", padding: "60px 24px",
      background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb",
      color: "#6b7280", fontSize: 13,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
      <p style={{ fontWeight: 500, color: "#374151", margin: "0 0 6px" }}>
        Sin registros aún
      </p>
      <p style={{ margin: 0, fontSize: 12 }}>
        Los jobs de {orchardName} aparecerán aquí una vez que se registren.
      </p>
    </div>
  );
}

function Spinner({ text }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10,
                  padding:48, color:"#6b7280", fontSize:13 }}>
      <div style={{ width:18, height:18, border:"2px solid #e5e7eb",
                    borderTopColor:"#2563eb", borderRadius:"50%",
                    animation:"spin .7s linear infinite" }} />
      {text}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ErrMsg({ msg }) {
  return (
    <div style={{ padding:24, color:"#991b1b", fontSize:13 }}>⚠️ {msg}</div>
  );
}
