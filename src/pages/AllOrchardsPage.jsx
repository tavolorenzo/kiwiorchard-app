/**
 * AllOrchardsPage.jsx
 * Vista comparativa de todos los orchards — bays, costos, bays/hr.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { fetchJobs } from "../lib/firebase";
import { useFirestore } from "../hooks/useFirestore";
import { ORCHARDS }  from "../components/Layout";

const BAR_COLORS = [
  "#2563eb","#7c3aed","#059669","#d97706",
  "#dc2626","#0891b2","#65a30d","#db2777",
];

function fmt$(n) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency", currency: "NZD", minimumFractionDigits: 0,
  }).format(n ?? 0);
}

export default function AllOrchardsPage() {
  const navigate = useNavigate();
  const { config, getBayRate } = useFirestore();
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy,  setSortBy]  = useState("totalBays");

  useEffect(() => {
    async function fetchAll() {
      const results = await Promise.all(
        ORCHARDS.map(async (o) => {
          try {
            const rows = await fetchJobs(o.id);
            const totalBays  = rows.reduce((s, r) => s + Number(r.total_bays ?? 0), 0);
            const totalCost  = rows.reduce((s, r) => s + Number(r.cost        ?? 0), 0);
            const totalHours = rows.reduce((s, r) => s + Number(r.hours       ?? 0), 0);
            const avgBaysHr  = totalHours > 0
              ? Math.round(totalBays / totalHours * 100) / 100 : 0;
            const days = new Set(rows.map(r => r.date)).size;
            return { ...o, totalBays, totalCost, avgBaysHr, days, jobs: rows.length };
          } catch {
            return { ...o, totalBays: 0, totalCost: 0, avgBaysHr: 0, days: 0, jobs: 0 };
          }
        })
      );
      setData(results);
      setLoading(false);
    }
    fetchAll();
  }, []);

  const sorted = [...data].sort((a, b) => b[sortBy] - a[sortBy]);
  const maxBays = Math.max(...data.map(d => d.totalBays), 1);
  const totalAllBays = data.reduce((s, d) => s + d.totalBays, 0);
  const totalAllCost = data.reduce((s, d) => s + d.totalCost, 0);

  return (
    <div style={{ padding: 24 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111827", margin: 0 }}>
          Todos los orchards
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
          Vista comparativa de temporada
        </p>
      </div>

      {loading ? (
        <Spinner text="Cargando datos de todos los orchards…" />
      ) : (
        <>
          {/* Totales globales */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12, marginBottom: 24,
          }}>
            <GlobalKpi label="Total bays (todos)" value={totalAllBays.toLocaleString()} />
            <GlobalKpi label="Costo total (todos)" value={fmt$(totalAllCost)} accent />
            <GlobalKpi label="Orchards activos" value={data.filter(d => d.jobs > 0).length} />
          </div>

          {/* Gráfico comparativo */}
          <div style={{
            background: "#fff", border: "1px solid #e5e7eb",
            borderRadius: 10, padding: 16, marginBottom: 16,
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 16,
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>
                Comparativa de bays por orchard
              </span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  fontSize: 12, padding: "4px 8px",
                  border: "1px solid #e5e7eb", borderRadius: 6,
                  color: "#374151", background: "#fff",
                }}
              >
                <option value="totalBays">Por bays</option>
                <option value="totalCost">Por costo</option>
                <option value="avgBaysHr">Por bays/hr</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={sorted}
                margin={{ top: 4, right: 8, bottom: 20, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip
                  formatter={(v, name) => {
                    if (sortBy === "totalCost") return [fmt$(v), "Costo"];
                    if (sortBy === "avgBaysHr") return [Number(v).toFixed(2), "Bays/hr"];
                    return [v, "Bays"];
                  }}
                  labelStyle={{ fontSize: 11 }}
                  contentStyle={{ fontSize: 11, borderRadius: 6 }}
                />
                <Bar dataKey={sortBy} radius={[4,4,0,0]}>
                  {sorted.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla comparativa */}
          <div style={{
            background: "#fff", border: "1px solid #e5e7eb",
            borderRadius: 10, overflow: "hidden",
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Orchard","Bays totales","Progreso","Costo total","Bays/hr","Días","Jobs",""].map(h => (
                      <th key={h} style={{
                        padding: "9px 12px", textAlign: "left",
                        fontSize: 11, fontWeight: 500, color: "#6b7280",
                        borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((o, i) => {
                    const pct = maxBays > 0 ? Math.round(o.totalBays / maxBays * 100) : 0;
                    return (
                      <tr key={o.id}
                        style={{ borderBottom: "1px solid #f9fafb" }}
                      >
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              width: 10, height: 10, borderRadius: "50%",
                              background: BAR_COLORS[i % BAR_COLORS.length],
                              flexShrink: 0,
                            }} />
                            <span style={{ fontWeight: 500, color: "#111827" }}>
                              {o.name}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 500, color: "#111827" }}>
                          {o.totalBays.toLocaleString()}
                        </td>
                        <td style={{ padding: "10px 12px", minWidth: 120 }}>
                          <div style={{
                            height: 6, background: "#f3f4f6",
                            borderRadius: 3, overflow: "hidden",
                          }}>
                            <div style={{
                              height: "100%", width: `${pct}%`,
                              background: BAR_COLORS[i % BAR_COLORS.length],
                              borderRadius: 3,
                              opacity: 0.8,
                            }} />
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#374151" }}>
                          {fmt$(o.totalCost)}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            fontWeight: 500,
                            color: o.avgBaysHr >= 2.5 ? "#16a34a"
                                 : o.avgBaysHr >= 1.5 ? "#d97706"
                                 : o.avgBaysHr > 0   ? "#dc2626" : "#9ca3af",
                          }}>
                            {o.avgBaysHr > 0 ? o.avgBaysHr.toFixed(2) : "—"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>
                          {o.days}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>
                          {o.jobs}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <button
                            onClick={() => navigate(`/dashboard/${o.id}`)}
                            style={{
                              fontSize: 11, padding: "4px 10px",
                              border: "1px solid #e5e7eb", borderRadius: 5,
                              background: "#fff", color: "#374151",
                              cursor: "pointer",
                            }}
                          >
                            Ver →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GlobalKpi({ label, value, accent }) {
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
      <div style={{ fontSize: 22, fontWeight: 600, color: "#111827" }}>{value}</div>
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
