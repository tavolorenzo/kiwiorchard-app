/**
 * BayPanel.jsx
 * Panel lateral que muestra las tasks de un bay específico.
 * Permite crear, cambiar estado y eliminar tasks.
 * Solo admin puede eliminar.
 *
 * Props:
 *   orchardId       {string}
 *   rowId           {string}
 *   bayNumber       {number}
 *   tasks           {Array}    - tasks filtradas para este bay
 *   onClose         {Function}
 *   onTaskCreated   {Function} - (newTask) => void
 *   onTaskUpdated   {Function} - (taskId, updates) => void
 *   onTaskDeleted   {Function} - (taskId) => void
 */

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { createTask, updateTask, deleteTask } from "../lib/firebase";

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

const STATUS_OPTIONS = [
    { value: "pending", label: "Pendiente" },
    { value: "in_progress", label: "En progreso" },
    { value: "completed", label: "Completada" },
];

const STATUS_STYLES = {
    pending: { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
    in_progress: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
    completed: { bg: "#dcfce7", color: "#166534", border: "#86efac" },
};

const TASK_COLORS = {
    young_plants: "#16a34a",
    grafting_male: "#2563eb",
    grafting_female: "#db2777",
    planting_male: "#0891b2",
    planting_female: "#d97706",
    stringing_pole: "#7c3aed",
    sick_plant: "#dc2626",
    other: "#6b7280",
};

const EMPTY_FORM = {
    task_type: "young_plants",
    status: "pending",
    note: "",
};

// ── Componente principal ──────────────────────────────────────

export default function BayPanel({
    orchardId,
    rowId,
    bayNumber,
    tasks = [],
    onClose,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
}) {
    const { user, admin } = useAuth();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [deleting, setDeleting] = useState(null); // taskId en proceso de borrado

    // ── Validación ───────────────────────────────────────────────

    function validate() {
        if (!form.task_type) return "Seleccioná un tipo de tarea.";
        if (form.task_type === "other" && !form.note.trim())
            return "Las tareas de tipo 'Other' requieren una nota.";
        return null;
    }

    // ── Handlers ─────────────────────────────────────────────────

    async function handleCreate() {
        const err = validate();
        if (err) { setError(err); return; }

        setSaving(true);
        setError("");
        try {
            const payload = {
                row_id: rowId,
                bay_number: bayNumber,
                task_type: form.task_type,
                status: form.status,
                note: form.note.trim(),
                created_by: user?.email ?? "unknown",
            };
            const { id } = await createTask(orchardId, payload);
            onTaskCreated?.({ id, ...payload, orchard_id: orchardId });
            setForm(EMPTY_FORM);
            setShowForm(false);
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleStatusChange(taskId, newStatus) {
        try {
            await updateTask(orchardId, taskId, { status: newStatus });
            onTaskUpdated?.(taskId, { status: newStatus });
        } catch (e) {
            setError(e.message);
        }
    }

    async function handleDelete(taskId) {
        setDeleting(taskId);
        setError("");
        try {
            await deleteTask(orchardId, taskId);
            onTaskDeleted?.(taskId);
        } catch (e) {
            setError(e.message);
        } finally {
            setDeleting(null);
        }
    }

    // ── Render ───────────────────────────────────────────────────

    return (
        <div style={{
            display: "flex", flexDirection: "column",
            height: "100%",
            maxHeight: "100%",
            fontFamily: "system-ui, sans-serif",
            overflow: "hidden",
        }}>

            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "1px solid #e5e7eb",
                flexShrink: 0,
            }}>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                        {rowId} · Bay {bayNumber}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                        {tasks.length === 0
                            ? "Sin tareas"
                            : `${tasks.length} tarea${tasks.length > 1 ? "s" : ""}`}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: "none", border: "none",
                        cursor: "pointer", color: "#9ca3af",
                        fontSize: 16, padding: "2px 6px", lineHeight: 1,
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Error global */}
            {error && (
                <div style={{
                    margin: "10px 16px 0",
                    padding: "8px 12px",
                    background: "#fef2f2", border: "1px solid #fecaca",
                    borderRadius: 6, fontSize: 12, color: "#991b1b",
                    display: "flex", justifyContent: "space-between",
                }}>
                    <span>{error}</span>
                    <button
                        onClick={() => setError("")}
                        style={{
                            background: "none", border: "none",
                            cursor: "pointer", color: "#991b1b", fontSize: 13
                        }}
                    >✕</button>
                </div>
            )}

            {/* Lista de tasks */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>

                {tasks.length === 0 && !showForm && (
                    <div style={{
                        textAlign: "center", padding: "32px 0",
                        color: "#9ca3af", fontSize: 13,
                    }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                        <p style={{ margin: 0 }}>No hay tareas en este bay.</p>
                        <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                            Usá el botón de abajo para agregar una.
                        </p>
                    </div>
                )}

                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        admin={admin}
                        deleting={deleting === task.id}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {/* Formulario de nueva task */}
            {showForm && (
                <div style={{
                    borderTop: "1px solid #e5e7eb",
                    padding: "14px 16px",
                    background: "#f8fafc",
                    flexShrink: 0,
                }}>
                    <div style={{
                        fontSize: 12, fontWeight: 600, color: "#374151",
                        marginBottom: 12,
                    }}>
                        Nueva tarea — {rowId} Bay {bayNumber}
                    </div>

                    {/* Tipo */}
                    <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>Tipo de tarea *</label>
                        <select
                            value={form.task_type}
                            onChange={e => setForm(p => ({ ...p, task_type: e.target.value }))}
                            style={inputStyle}
                        >
                            {TASK_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Estado */}
                    <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>Estado inicial</label>
                        <div style={{ display: "flex", gap: 6 }}>
                            {STATUS_OPTIONS.map(s => {
                                const sel = form.status === s.value;
                                const st = STATUS_STYLES[s.value];
                                return (
                                    <button
                                        key={s.value}
                                        type="button"
                                        onClick={() => setForm(p => ({ ...p, status: s.value }))}
                                        style={{
                                            flex: 1, fontSize: 11, padding: "5px 4px",
                                            borderRadius: 5, cursor: "pointer",
                                            border: `1px solid ${sel ? st.border : "#e5e7eb"}`,
                                            background: sel ? st.bg : "#fff",
                                            color: sel ? st.color : "#6b7280",
                                            fontWeight: sel ? 600 : 400,
                                            transition: "all .1s",
                                        }}
                                    >
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Nota */}
                    <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>
                            Nota {form.task_type === "other" ? "*" : "(opcional)"}
                        </label>
                        <textarea
                            value={form.note}
                            onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                            placeholder="Observaciones sobre esta tarea…"
                            rows={2}
                            style={{
                                ...inputStyle,
                                resize: "vertical",
                                fontFamily: "inherit",
                            }}
                        />
                    </div>

                    {/* Acciones */}
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            type="button"
                            onClick={handleCreate}
                            disabled={saving}
                            style={{
                                flex: 1, fontSize: 13, fontWeight: 500,
                                padding: "8px 0",
                                border: "1px solid #1e40af", borderRadius: 6,
                                background: "#1d4ed8", color: "#fff",
                                cursor: saving ? "not-allowed" : "pointer",
                                opacity: saving ? 0.7 : 1,
                            }}
                        >
                            {saving ? "Guardando…" : "Crear tarea"}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(""); }}
                            style={{
                                fontSize: 13, fontWeight: 500,
                                padding: "8px 14px",
                                border: "1px solid #e5e7eb", borderRadius: 6,
                                background: "#fff", color: "#374151",
                                cursor: "pointer",
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Footer — botón agregar */}
            {!showForm && (
                <div style={{
                    padding: "12px 16px",
                    borderTop: "1px solid #e5e7eb",
                    flexShrink: 0,
                }}>
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        style={{
                            width: "100%", fontSize: 13, fontWeight: 500,
                            padding: "9px 0",
                            border: "1px solid #1e40af", borderRadius: 6,
                            background: "#1d4ed8", color: "#fff",
                            cursor: "pointer",
                        }}
                    >
                        + Agregar tarea
                    </button>
                </div>
            )}
        </div>
    );
}

// ── TaskCard ──────────────────────────────────────────────────

function TaskCard({ task, admin, deleting, onStatusChange, onDelete }) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const typeLabel = TASK_TYPES.find(t => t.value === task.task_type)?.label ?? task.task_type;
    const accentColor = TASK_COLORS[task.task_type] ?? "#6b7280";
    const st = STATUS_STYLES[task.status] ?? STATUS_STYLES.pending;

    return (
        <div style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderLeft: `3px solid ${accentColor}`,
            borderRadius: 8,
            padding: "11px 12px",
            marginBottom: 10,
        }}>
            {/* Tipo + status */}
            <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 8,
            }}>
                <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: accentColor,
                }}>
                    {typeLabel}
                </span>
                <span style={{
                    fontSize: 10, fontWeight: 600,
                    padding: "2px 8px", borderRadius: 10,
                    background: st.bg, color: st.color,
                    border: `1px solid ${st.border}`,
                }}>
                    {STATUS_OPTIONS.find(s => s.value === task.status)?.label ?? task.status}
                </span>
            </div>

            {/* Nota */}
            {task.note && (
                <p style={{
                    fontSize: 12, color: "#374151",
                    margin: "0 0 8px", lineHeight: 1.5,
                }}>
                    {task.note}
                </p>
            )}

            {/* Meta */}
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 10 }}>
                {task.created_by && `Por ${task.created_by}`}
            </div>

            {/* Cambio de estado */}
            <div style={{ display: "flex", gap: 5, marginBottom: admin ? 8 : 0 }}>
                {STATUS_OPTIONS.map(s => {
                    const sel = task.status === s.value;
                    const ss = STATUS_STYLES[s.value];
                    return (
                        <button
                            key={s.value}
                            type="button"
                            onClick={() => !sel && onStatusChange(task.id, s.value)}
                            style={{
                                flex: 1, fontSize: 10, padding: "4px 2px",
                                borderRadius: 4, cursor: sel ? "default" : "pointer",
                                border: `1px solid ${sel ? ss.border : "#e5e7eb"}`,
                                background: sel ? ss.bg : "#f9fafb",
                                color: sel ? ss.color : "#9ca3af",
                                fontWeight: sel ? 600 : 400,
                                transition: "all .1s",
                            }}
                        >
                            {s.label}
                        </button>
                    );
                })}
            </div>

            {/* Eliminar — solo admin */}
            {admin && (
                confirmDelete ? (
                    <div style={{
                        display: "flex", gap: 6,
                        marginTop: 8, alignItems: "center",
                    }}>
                        <span style={{ fontSize: 11, color: "#991b1b", flex: 1 }}>
                            ¿Confirmar borrado?
                        </span>
                        <button
                            type="button"
                            onClick={() => onDelete(task.id)}
                            disabled={deleting}
                            style={{
                                fontSize: 11, padding: "3px 10px",
                                border: "1px solid #fecaca", borderRadius: 4,
                                background: "#fef2f2", color: "#991b1b",
                                cursor: "pointer",
                            }}
                        >
                            {deleting ? "…" : "Sí, borrar"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            style={{
                                fontSize: 11, padding: "3px 10px",
                                border: "1px solid #e5e7eb", borderRadius: 4,
                                background: "#fff", color: "#6b7280",
                                cursor: "pointer",
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        style={{
                            marginTop: 8, fontSize: 11,
                            padding: "3px 10px",
                            border: "1px solid #fecaca", borderRadius: 4,
                            background: "#fff", color: "#dc2626",
                            cursor: "pointer",
                        }}
                    >
                        Eliminar
                    </button>
                )
            )}
        </div>
    );
}

// ── Estilos compartidos ───────────────────────────────────────

const labelStyle = {
    fontSize: 11, fontWeight: 500,
    color: "#374151", display: "block",
    marginBottom: 4,
};

const inputStyle = {
    width: "100%", fontSize: 12,
    padding: "7px 9px",
    border: "1px solid #d1d5db", borderRadius: 6,
    background: "#fff", color: "#111827",
    outline: "none", boxSizing: "border-box",
};