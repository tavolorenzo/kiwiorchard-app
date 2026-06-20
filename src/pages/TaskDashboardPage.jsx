/**
 * TaskDashboard.jsx
 * Vista de todas las tasks de un orchard.
 * KPIs por tipo/estado, búsqueda full-text, tabla con navegación al bay.
 *
 * Ruta: /tasks/:orchardId
 */

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchTasks } from "../lib/firebase";
import { useFirestore } from "../hooks/useFirestore";

// ── Constantes ────────────────────────────────────────────────

const TASK_TYPES = [
  { value: "young_plants", label: "Young plants" },
  { value: "grafting_male", label: "Grafting ♂" },
  { value: "grafting_female", label: "Grafting ♀" },
  { value: "planting_male", label: "Planting ♂" },
  { value: "planting_female", label: "Planting ♀" },
  { value: "stringing_pole", label: "Stringing" },
  { value: "sick_plant", label: "Sick plant" },
  { value: "other", label: "Other" },
];

const TASK_COLORS = {
  young_plants: { bg: "#bbf7d0", border: "#16a34a", text: "#166534" },
  grafting_male: { bg: "#bfdbfe", border: "#2563eb", text: "#1e40af" },
  grafting_female: { bg: "#fbcfe8", border: "#db2777", text: "#9d174d" },
  planting_male: { bg: "#a5f3fc", border: "#0891b2", text: "#164e63" },
  planting_female: { bg: "#fde68a", border: "#d97706", text: "#92400e" },
  stringing_pole: { bg: "#e9d5ff", border: "#7c3aed", text: "#4c1d95" },
  sick_plant: { bg: "#fecaca", border: "#dc2626", text: "#991b1b" },
  other: { bg: "#f3f4f6", border: "#6b7280", text: "#374151" },
};

const STATUS_STYLES = {
  pending: { bg: "#fef9c3", color: "#854d0e", border: "#fde047", label: "Pendiente" },
  in_progress: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd", label: "En progreso" },
  completed: { bg: "#dcfce7", color: "#166534", border: "#86efac", label: "Completada" },
};

// ── Componente principal ──────────────────────────────────────

export default function TaskDashboard() {
  const { orchardId } = useParams();
  const navigate = useNavigate();
  const { config } = useFirestore();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at"); // created_at | type | status

  const orchard = config?.orchards?.find(o => o.orchard_id === orchardId);

  useEffect(() => {
    if (!orchardId) return;
    setLoading(true);
    fetchTasks(orchardId)
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orchardId]);

  // ── KPIs por tipo ────────────────────────────────────────────

  const kpisByType = useMemo(() => {
    return TASK_TYPES.map(({ value, label }) => {
      const typeTasks = tasks.filter(t => t.task_type === value);
      return {
        value, label,
        total: typeTasks.length,
        pending: typeTasks.filter(t => t.status === "pending").length,
        in_progress: typeTasks.filter(t => t.status === "in_progress").length,
        completed: typeTasks.filter(t => t.status === "completed").length,
      };
    }).filter(k => k.total > 0);
  }, [tasks]);

  const globalKpis = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
  }), [tasks]);

  // ── Filtro + búsqueda ────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...tasks];

    if (filterType !== "all")
      result = result.filter(t => t.task_type === filterType);

    if (filterStatus !== "all")
      result = result.filter(t => t.status === filterStatus);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.row_id?.toLowerCase().includes(q) ||
        String(t.bay_number).includes(q) ||
        t.task_type?.toLowerCase().includes(q) ||
        t.status?.toLowerCase().includes(q) ||
        t.note?.toLowerCase().includes(q) ||
        t.created_by?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "type") return a.task_type.localeCompare(b.task_type);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      // created_at — más reciente primero
      const ta = a.created_at?.seconds ?? 0;
      const tb = b.created_at?.seconds ?? 0;
      return tb - ta;
    });

    return result;
  }, [tasks, filterType, filterStatus, search, sortBy]);

  // ── Navegar al bay en el mapa ────────────────────────────────

  function goToMap(rowId, bayNumber) {
    navigate(`/map/${orchardId}`, {
      state: { selectedBay: { row_id: rowId, bay_number: bayNumber } },
    });
  }

  // ── Render ───────────────────────────────────────────────────

  if (loading) return <Spinner text="Cargando tasks…" />;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>

      {/* Aviso para dispositivos móviles */}
      <div className="mobile-warning" style={{
        display: "none",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02)",
        marginTop: 24,
      }}>
        <div style={{
          width: 60, height: 60,
          borderRadius: "50%",
          background: "#eff6ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          color: "#2563eb",
          fontSize: 28,
        }}>
          🖥️
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 8px 0" }}>
          Pantalla no compatible
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.5, maxWidth: 300 }}>
          El Panel de Tareas está diseñado para pantallas grandes. Para ver y gestionar las tareas de manera óptima, por favor accede desde una computadora o tablet.
        </p>
      </div>

      {/* Contenido principal para pantallas grandes */}
      <div className="desktop-content">
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111827", margin: 0 }}>
            Task Dashboard — {orchard?.name}
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            Seguimiento de tareas por bay
          </p>
        </div>

        {/* KPIs globales */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10, marginBottom: 20,
        }}>
          <GlobalKpi label="Total tasks" value={globalKpis.total} color="#374151" />
          <GlobalKpi label="Pendientes" value={globalKpis.pending} color="#d97706" />
          <GlobalKpi label="En progreso" value={globalKpis.in_progress} color="#2563eb" />
          <GlobalKpi label="Completadas" value={globalKpis.completed} color="#16a34a" />
        </div>

        {/* KPIs por tipo — solo si hay tasks */}
        {kpisByType.length > 0 && (
          <div style={{
            background: "#fff", border: "1px solid #e5e7eb",
            borderRadius: 10, padding: 16, marginBottom: 20,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: ".06em", color: "#9ca3af", marginBottom: 12,
            }}>
              Por tipo de tarea
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {kpisByType.map(k => {
                const colors = TASK_COLORS[k.value] ?? TASK_COLORS.other;
                const pctCompleted = k.total > 0
                  ? Math.round(k.completed / k.total * 100) : 0;
                return (
                  <div key={k.value} style={{
                    display: "grid",
                    gridTemplateColumns: "140px 40px 40px 40px 1fr 36px",
                    alignItems: "center", gap: 10,
                  }}>
                    {/* Label */}
                    <span style={{
                      fontSize: 12, fontWeight: 500,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                        background: colors.bg, border: `1.5px solid ${colors.border}`,
                      }} />
                      {k.label}
                    </span>
                    {/* Pending */}
                    <span style={{
                      fontSize: 11, textAlign: "center",
                      color: k.pending > 0 ? "#d97706" : "#d1d5db",
                      fontWeight: k.pending > 0 ? 600 : 400,
                    }}>
                      {k.pending}
                    </span>
                    {/* In progress */}
                    <span style={{
                      fontSize: 11, textAlign: "center",
                      color: k.in_progress > 0 ? "#2563eb" : "#d1d5db",
                      fontWeight: k.in_progress > 0 ? 600 : 400,
                    }}>
                      {k.in_progress}
                    </span>
                    {/* Completed */}
                    <span style={{
                      fontSize: 11, textAlign: "center",
                      color: k.completed > 0 ? "#16a34a" : "#d1d5db",
                      fontWeight: k.completed > 0 ? 600 : 400,
                    }}>
                      {k.completed}
                    </span>
                    {/* Barra progreso */}
                    <div style={{
                      height: 6, background: "#f3f4f6",
                      borderRadius: 3, overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        width: `${pctCompleted}%`,
                        background: colors.border,
                        transition: "width .3s",
                      }} />
                    </div>
                    {/* % */}
                    <span style={{
                      fontSize: 10, color: "#6b7280",
                      textAlign: "right",
                    }}>
                      {pctCompleted}%
                    </span>
                  </div>
                );
              })}
              {/* Leyenda columnas */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "140px 40px 40px 40px 1fr 36px",
                gap: 10, marginTop: 2,
              }}>
                <span />
                {["Pend.", "Prog.", "Comp."].map(l => (
                  <span key={l} style={{
                    fontSize: 9, color: "#9ca3af",
                    textAlign: "center", textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Buscador + filtros */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 14,
          flexWrap: "wrap", alignItems: "center",
        }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por row, bay, tipo, nota…"
            style={{
              flex: 1, minWidth: 200,
              fontSize: 13, padding: "7px 10px",
              border: "1px solid #e5e7eb", borderRadius: 6,
              background: "#fff", color: "#111827",
              outline: "none",
            }}
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={selectStyle}
          >
            <option value="all">Todos los tipos</option>
            {TASK_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={selectStyle}
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En progreso</option>
            <option value="completed">Completada</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={selectStyle}
          >
            <option value="created_at">Más recientes</option>
            <option value="type">Por tipo</option>
            <option value="status">Por estado</option>
          </select>
        </div>

        {/* Tabla */}
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb",
          borderRadius: 10, overflow: "hidden",
        }}>
          <div style={{
            padding: "10px 16px",
            borderBottom: "1px solid #f3f4f6",
            fontSize: 12, color: "#6b7280",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>
              {filtered.length === tasks.length
                ? `${tasks.length} tasks`
                : `${filtered.length} de ${tasks.length} tasks`}
            </span>
            {(search || filterType !== "all" || filterStatus !== "all") && (
              <button
                onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); }}
                style={{
                  fontSize: 11, color: "#2563eb",
                  background: "none", border: "none",
                  cursor: "pointer", padding: 0,
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div style={{
              padding: "40px 0", textAlign: "center",
              fontSize: 13, color: "#9ca3af",
            }}>
              {tasks.length === 0
                ? "No hay tasks registradas en este orchard."
                : "Ninguna task coincide con los filtros."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%", borderCollapse: "collapse", fontSize: 12,
              }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Row", "Bay", "Tipo", "Estado", "Nota", "Creada por", ""].map(h => (
                      <th key={h} style={{
                        padding: "8px 12px", textAlign: "left",
                        fontSize: 11, fontWeight: 500, color: "#6b7280",
                        borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task, i) => {
                    const typeInfo = TASK_TYPES.find(t => t.value === task.task_type);
                    const typeColors = TASK_COLORS[task.task_type] ?? TASK_COLORS.other;
                    const stStyle = STATUS_STYLES[task.status] ?? STATUS_STYLES.pending;

                    return (
                      <tr
                        key={task.id ?? i}
                        style={{ borderBottom: "1px solid #f9fafb" }}
                      >
                        {/* Row */}
                        <td style={tdStyle}>
                          <span style={{
                            fontFamily: "monospace", fontSize: 11,
                            fontWeight: 500, color: "#374151",
                          }}>
                            {task.row_id}
                          </span>
                        </td>

                        {/* Bay */}
                        <td style={tdStyle}>
                          <span style={{
                            fontFamily: "monospace", fontSize: 11,
                            color: "#6b7280",
                          }}>
                            #{task.bay_number}
                          </span>
                        </td>

                        {/* Tipo */}
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: 11, fontWeight: 500,
                            padding: "2px 8px", borderRadius: 10,
                            background: typeColors.bg,
                            color: typeColors.text,
                            border: `1px solid ${typeColors.border}`,
                            whiteSpace: "nowrap",
                          }}>
                            {typeInfo?.label ?? task.task_type}
                          </span>
                        </td>

                        {/* Estado */}
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            padding: "2px 8px", borderRadius: 10,
                            background: stStyle.bg,
                            color: stStyle.color,
                            border: `1px solid ${stStyle.border}`,
                            whiteSpace: "nowrap",
                          }}>
                            {stStyle.label}
                          </span>
                        </td>

                        {/* Nota */}
                        <td style={{
                          ...tdStyle,
                          maxWidth: 200, color: "#6b7280",
                          overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {task.note || "—"}
                        </td>

                        {/* Creada por */}
                        <td style={{ ...tdStyle, color: "#9ca3af" }}>
                          {task.created_by ?? "—"}
                        </td>

                        {/* Acción */}
                        <td style={tdStyle}>
                          <button
                            onClick={() => goToMap(task.row_id, task.bay_number)}
                            style={{
                              fontSize: 11, padding: "4px 10px",
                              border: "1px solid #e5e7eb", borderRadius: 5,
                              background: "#fff", color: "#374151",
                              cursor: "pointer", whiteSpace: "nowrap",
                            }}
                          >
                            Ver en mapa →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .mobile-warning {
            display: flex !important;
          }
          .desktop-content {
            display: none !important;
          }
        }
        @media (min-width: 768px) {
          .mobile-warning {
            display: none !important;
          }
          .desktop-content {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────

function GlobalKpi({ label, value, color }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 10, padding: "12px 16px",
    }}>
      <div style={{
        fontSize: 10, fontWeight: 500, textTransform: "uppercase",
        letterSpacing: ".06em", color: "#9ca3af", marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color }}>
        {value}
      </div>
    </div>
  );
}

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

// ── Estilos compartidos ───────────────────────────────────────

const selectStyle = {
  fontSize: 12, padding: "7px 10px",
  border: "1px solid #e5e7eb", borderRadius: 6,
  color: "#374151", background: "#fff",
  outline: "none", cursor: "pointer",
};

const tdStyle = {
  padding: "9px 12px",
  verticalAlign: "middle",
  color: "#374151",
};