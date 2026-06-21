/**
 * OrchardMap.jsx
 * Grilla visual de rows × bays por orchard.
 * Cada celda = un bay individual. Click → abre BayPanel lateral.
 * Color por task_type + status. Neutro sin tasks.
 *
 * Props:
 *   orchardId   {string}
 *   rowMap      {Object}  - { row_id: total_bays }
 *   rowToBlock  {Object}  - { row_id: block_id }
 *   tasks       {Array}   - docs de Firestore tasks
 *   onBayClick  {Function}- ({ row_id, bay_number }) => void
 */

import { useMemo, useState } from "react";

// ── Colores por task_type ─────────────────────────────────────
const TASK_COLORS = {
    young_plants: { bg: "#bbf7d0", border: "#16a34a", label: "Young plants" },
    grafting_male: { bg: "#bfdbfe", border: "#2563eb", label: "Grafting ♂" },
    grafting_female: { bg: "#fbcfe8", border: "#db2777", label: "Grafting ♀" },
    planting_male: { bg: "#a5f3fc", border: "#0891b2", label: "Planting ♂" },
    planting_female: { bg: "#fde68a", border: "#d97706", label: "Planting ♀" },
    stringing_pole: { bg: "#e9d5ff", border: "#7c3aed", label: "Stringing" },
    sick_plant: { bg: "#fecaca", border: "#dc2626", label: "Sick plant" },
    other: { bg: "#f3f4f6", border: "#6b7280", label: "Other" },
};

const STATUS_OPACITY = {
    pending: 0.5,
    in_progress: 0.85,
    completed: 1,
};

const NEUTRAL = { bg: "#f1f5f9", border: "#e2e8f0" };

// ── Helpers ───────────────────────────────────────────────────

/** Agrupa rows por block_id, ordena rows dentro de cada block */
function groupRowsByBlock(rowMap, rowToBlock) {
    const groups = {};
    for (const rowId of Object.keys(rowMap)) {
        const blockId = rowToBlock[rowId] ?? "unknown";
        if (!groups[blockId]) groups[blockId] = [];
        groups[blockId].push(rowId);
    }
    // Ordenar rows dentro del block con prioridades personalizadas
    for (const blockId of Object.keys(groups)) {
        groups[blockId].sort((a, b) => {
            const getSortInfo = (rowId) => {
                if (/SKIRT$/i.test(rowId)) {
                    return { category: 1, num: 0 };
                }
                if (/SKIRT-\d+$/i.test(rowId)) {
                    const match = rowId.match(/\d+$/);
                    return { category: 3, num: match ? parseInt(match[0], 10) : 0 };
                }
                const match = rowId.match(/\d+$/);
                return { category: 2, num: match ? parseInt(match[0], 10) : 0 };
            };

            const infoA = getSortInfo(a);
            const infoB = getSortInfo(b);

            if (infoA.category !== infoB.category) {
                return infoA.category - infoB.category;
            }
            if (infoA.num !== infoB.num) {
                return infoA.num - infoB.num;
            }
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
        });
    }
    return groups;
}

/** Construye un índice { "row_id:bay_number": [task, ...] } */
function buildTaskIndex(tasks) {
    const idx = {};
    for (const t of tasks) {
        const key = `${t.row_id}:${t.bay_number}`;
        if (!idx[key]) idx[key] = [];
        idx[key].push(t);
    }
    return idx;
}

/** Elige el color dominante para un bay (prioriza in_progress > pending > completed) */
function dominantTask(tasksForBay) {
    if (!tasksForBay?.length) return null;
    const order = { in_progress: 0, pending: 1, completed: 2 };
    return [...tasksForBay].sort((a, b) =>
        (order[a.status] ?? 9) - (order[b.status] ?? 9)
    )[0];
}

// ── Componente principal ──────────────────────────────────────

export default function OrchardMap({
    orchardId,
    rowMap = {},
    rowToBlock = {},
    tasks = [],
    onBayClick,
}) {
    const [filterBlock, setFilterBlock] = useState("all");
    const [filterTaskType, setFilterTaskType] = useState("all");
    const [hoveredBay, setHoveredBay] = useState(null); // "row_id:bay_number"

    const groups = useMemo(() => groupRowsByBlock(rowMap, rowToBlock), [rowMap, rowToBlock]);
    const taskIdx = useMemo(() => buildTaskIndex(tasks), [tasks]);
    const blockIds = useMemo(() => Object.keys(groups).sort(), [groups]);

    // Bloques filtrados
    const visibleBlocks = filterBlock === "all"
        ? blockIds
        : blockIds.filter(b => b === filterBlock);

    // Máximo de bays en cualquier row (para calcular ancho relativo)
    const maxBays = useMemo(
        () => Math.max(...Object.values(rowMap), 1),
        [rowMap]
    );

    // Stats rápidas
    const totalTasks = tasks.length;
    const pendingCount = tasks.filter(t => t.status === "pending").length;
    const inProgCount = tasks.filter(t => t.status === "in_progress").length;
    const completedCount = tasks.filter(t => t.status === "completed").length;

    return (
        <div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>

            {/* ── Header ─────────────────────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: 0 }}>
                    Mapa del orchard
                </h2>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>
                    Hacé click en un bay para ver o crear tareas
                </p>
            </div>

            {/* ── KPIs rápidos ───────────────────────────────────── */}
            {totalTasks > 0 && (
                <div style={{
                    display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap",
                }}>
                    {[
                        { label: "Total tasks", value: totalTasks, color: "#374151" },
                        { label: "Pendientes", value: pendingCount, color: "#d97706" },
                        { label: "En progreso", value: inProgCount, color: "#2563eb" },
                        { label: "Completadas", value: completedCount, color: "#16a34a" },
                    ].map(k => (
                        <div key={k.label} style={{
                            background: "#fff", border: "1px solid #e5e7eb",
                            borderRadius: 8, padding: "8px 14px",
                            display: "flex", alignItems: "center", gap: 8,
                        }}>
                            <span style={{ fontSize: 18, fontWeight: 600, color: k.color }}>
                                {k.value}
                            </span>
                            <span style={{ fontSize: 11, color: "#6b7280" }}>{k.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Filtros ────────────────────────────────────────── */}
            <div style={{
                display: "flex", gap: 10, marginBottom: 14,
                flexWrap: "wrap", alignItems: "center",
            }}>
                <select
                    value={filterBlock}
                    onChange={e => setFilterBlock(e.target.value)}
                    style={selectStyle}
                >
                    <option value="all">Todos los blocks</option>
                    {blockIds.map(b => (
                        <option key={b} value={b}>{b}</option>
                    ))}
                </select>

                <select
                    value={filterTaskType}
                    onChange={e => setFilterTaskType(e.target.value)}
                    style={selectStyle}
                >
                    <option value="all">Todos los tipos</option>
                    {Object.entries(TASK_COLORS).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {/* ── Leyenda ────────────────────────────────────────── */}
            <div style={{
                display: "flex", flexWrap: "wrap", gap: 8,
                marginBottom: 16,
            }}>
                {Object.entries(TASK_COLORS).map(([key, { bg, border, label }]) => (
                    <span key={key} style={{
                        display: "flex", alignItems: "center", gap: 5,
                        fontSize: 11, color: "#374151",
                    }}>
                        <span style={{
                            width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                            background: bg, border: `1.5px solid ${border}`,
                        }} />
                        {label}
                    </span>
                ))}
            </div>

            {/* ── Grilla ─────────────────────────────────────────── */}
            <div style={{
                background: "#fff", border: "1px solid #e5e7eb",
                borderRadius: 10, overflow: "hidden",
            }}>
                {visibleBlocks.map((blockId, bi) => (
                    <div key={blockId}>
                        {/* Block header */}
                        <div style={{
                            padding: "8px 14px",
                            background: "#f8fafc",
                            borderBottom: "1px solid #e5e7eb",
                            borderTop: bi > 0 ? "2px solid #e2e8f0" : undefined,
                            fontSize: 11, fontWeight: 600,
                            textTransform: "uppercase", letterSpacing: ".06em",
                            color: "#64748b",
                        }}>
                            Block {blockId}
                        </div>

                        {/* Rows del block */}
                        {groups[blockId].map(rowId => {
                            const total = rowMap[rowId] ?? 0;
                            const fullBays = Math.floor(total);
                            const fracBay = total % 1; // fracción (0 si es entero)

                            return (
                                <div key={rowId} style={{
                                    display: "flex", alignItems: "center",
                                    padding: "5px 14px",
                                    borderBottom: "1px solid #f8fafc",
                                    gap: 8,
                                }}>
                                    {/* Row label */}
                                    <div style={{
                                        width: 80, flexShrink: 0,
                                        fontSize: 11, fontFamily: "monospace",
                                        color: "#6b7280",
                                    }}>
                                        {rowId}
                                    </div>

                                    {/* Celdas de bays */}
                                    <div style={{
                                        display: "flex", gap: 2,
                                        flex: 1, alignItems: "center",
                                    }}>
                                        {Array.from({ length: fullBays }, (_, i) => {
                                            const bayNum = i + 1;
                                            const key = `${rowId}:${bayNum}`;
                                            const bayTasks = filterTaskType === "all"
                                                ? (taskIdx[key] ?? [])
                                                : (taskIdx[key] ?? []).filter(t => t.task_type === filterTaskType);
                                            const dominant = dominantTask(bayTasks);
                                            const colors = dominant
                                                ? (TASK_COLORS[dominant.task_type] ?? TASK_COLORS.other)
                                                : NEUTRAL;
                                            const opacity = dominant
                                                ? (STATUS_OPACITY[dominant.status] ?? 1)
                                                : 1;
                                            const isHovered = hoveredBay === key;

                                            return (
                                                <BayCell
                                                    key={bayNum}
                                                    bayNum={bayNum}
                                                    rowId={rowId}
                                                    colors={colors}
                                                    opacity={opacity}
                                                    isHovered={isHovered}
                                                    taskCount={bayTasks.length}
                                                    widthFraction={1}
                                                    onMouseEnter={() => setHoveredBay(key)}
                                                    onMouseLeave={() => setHoveredBay(null)}
                                                    onClick={() => onBayClick?.({ row_id: rowId, bay_number: bayNum })}
                                                />
                                            );
                                        })}

                                        {/* Celda fraccionaria (último bay parcial) */}
                                        {fracBay > 0 && (() => {
                                            const bayNum = fullBays + 1;
                                            const key = `${rowId}:${bayNum}`;
                                            const bayTasks = filterTaskType === "all"
                                                ? (taskIdx[key] ?? [])
                                                : (taskIdx[key] ?? []).filter(t => t.task_type === filterTaskType);
                                            const dominant = dominantTask(bayTasks);
                                            const colors = dominant
                                                ? (TASK_COLORS[dominant.task_type] ?? TASK_COLORS.other)
                                                : NEUTRAL;
                                            const opacity = dominant
                                                ? (STATUS_OPACITY[dominant.status] ?? 1)
                                                : 1;
                                            const isHovered = hoveredBay === key;

                                            return (
                                                <BayCell
                                                    key="frac"
                                                    bayNum={bayNum}
                                                    rowId={rowId}
                                                    colors={colors}
                                                    opacity={opacity}
                                                    isHovered={isHovered}
                                                    taskCount={bayTasks.length}
                                                    widthFraction={fracBay}
                                                    onMouseEnter={() => setHoveredBay(key)}
                                                    onMouseLeave={() => setHoveredBay(null)}
                                                    onClick={() => onBayClick?.({ row_id: rowId, bay_number: bayNum })}
                                                />
                                            );
                                        })()}

                                        {/* Total label */}
                                        <span style={{
                                            fontSize: 10, color: "#cbd5e1",
                                            marginLeft: 4, flexShrink: 0,
                                        }}>
                                            {total}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}

                {visibleBlocks.length === 0 && (
                    <div style={{
                        padding: "40px 0", textAlign: "center",
                        fontSize: 13, color: "#9ca3af",
                    }}>
                        No hay rows cargadas para este orchard.
                    </div>
                )}
            </div>
        </div>
    );
}

// ── BayCell ───────────────────────────────────────────────────

function BayCell({
    bayNum, rowId, colors, opacity, isHovered,
    taskCount, widthFraction, onMouseEnter, onMouseLeave, onClick,
}) {
    const BASE_WIDTH = 18; // px por bay completo

    return (
        <div
            title={`${rowId} · Bay ${bayNum}${taskCount > 0 ? ` · ${taskCount} task(s)` : ""}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
            style={{
                width: BASE_WIDTH * widthFraction,
                height: 18,
                borderRadius: 3,
                background: colors.bg,
                border: `1.5px solid ${colors.border}`,
                opacity,
                cursor: "pointer",
                flexShrink: 0,
                position: "relative",
                transition: "transform .1s, box-shadow .1s",
                transform: isHovered ? "scaleY(1.3)" : "scaleY(1)",
                boxShadow: isHovered ? `0 0 0 2px ${colors.border}` : "none",
                // Punto si hay tasks
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {taskCount > 1 && (
                <span style={{
                    fontSize: 7, fontWeight: 700,
                    color: colors.border, lineHeight: 1,
                    pointerEvents: "none",
                }}>
                    {taskCount}
                </span>
            )}
        </div>
    );
}

// ── Estilos compartidos ───────────────────────────────────────

const selectStyle = {
    fontSize: 12, padding: "6px 10px",
    border: "1px solid #e5e7eb", borderRadius: 6,
    color: "#374151", background: "#fff",
    outline: "none", cursor: "pointer",
};