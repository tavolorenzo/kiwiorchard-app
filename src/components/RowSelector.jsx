/**
 * RowSelector.jsx v1.1.2
 *
 * Tabs:
 *   "Select by Bay"  → sliders por row, step 0.25, piso = ya registrado
 *   "Select by Row"  → chips estilo BaySelector original, click = row completa
 *
 * Resumen persistente entre tabs para saber qué está seleccionado.
 *
 * Props:
 *   rowMap      {Object}   - { row_id: total_bays }
 *   blockMap    {Object}   - { block_id: prom_m2_per_bay }
 *   rowToBlock  {Object}   - { row_id: block_id }
 *   orchardId   {string}
 *   date        {string}   - YYYY-MM-DD
 *   value       {Array}    - [{ row_id, bays_selected }]
 *   onChange    {Function} - (newSelections) => void
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { calcM2, countBays } from "../lib/calcM2";

const STORAGE_KEY = (orchardId, date) =>
  `kiwi_preload_${orchardId}_${date}`;

function groupByBlock(rowMap, rowToBlock) {
  const groups = {};
  for (const rowId of Object.keys(rowMap)) {
    const blockId = rowToBlock[rowId] ?? "unknown";
    if (!groups[blockId]) groups[blockId] = [];
    groups[blockId].push(rowId);
  }
  return groups;
}

function isSkirt(rowId) {
  return rowId.toUpperCase().includes("SKIRT");
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

export default function RowSelector({
  rowMap = {},
  blockMap = {},
  rowToBlock = {},
  orchardId = "",
  date = "",
  value = [],
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("bay"); // "bay" | "row"
  const [search, setSearch] = useState("");
  const modalRef = useRef(null);

  // Piso de cada slider: bays ya registrados hoy
  const [preloaded, setPreloaded] = useState({});

  useEffect(() => {
    if (!orchardId || !date) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY(orchardId, date));
      setPreloaded(raw ? JSON.parse(raw) : {});
    } catch { setPreloaded({}); }
  }, [orchardId, date]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open]);

  // Cerrar click fuera
  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target))
        setOpen(false);
    };
    setTimeout(() => window.addEventListener("mousedown", fn), 0);
    return () => window.removeEventListener("mousedown", fn);
  }, [open]);

  // selMap: { row_id: bays_selected }
  const selMap = useMemo(
    () => Object.fromEntries(value.map(r => [r.row_id, r.bays_selected])),
    [value]
  );

  const groups = useMemo(() => groupByBlock(rowMap, rowToBlock), [rowMap, rowToBlock]);
  const blockIds = useMemo(() => Object.keys(groups).sort(), [groups]);

  const filteredGroups = useMemo(() => {
    if (!search) return groups;
    return Object.fromEntries(
      Object.entries(groups)
        .map(([bid, ids]) => [bid, ids.filter(id =>
          id.toLowerCase().includes(search.toLowerCase())
        )])
        .filter(([, ids]) => ids.length > 0)
    );
  }, [groups, search]);

  // Delta selections (para métricas — solo trabajo nuevo)
  const deltaSelections = useMemo(() =>
    value
      .map(r => ({
        ...r,
        bays_selected: Math.max(0, r.bays_selected - (preloaded[r.row_id] ?? 0)),
      }))
      .filter(r => r.bays_selected > 0),
    [value, preloaded]
  );

  const totalDeltaBays = countBays(deltaSelections);
  const totalDeltaM2 = calcM2(deltaSelections, blockMap, rowToBlock);

  // ── Handlers ────────────────────────────────────────────────

  // Slider: actualiza bays_selected de una row
  function handleSlider(rowId, val) {
    const floor = preloaded[rowId] ?? 0;
    const clamped = Math.max(floor, Number(val));
    const without = value.filter(r => r.row_id !== rowId);
    // Si está en el piso (= sin trabajo nuevo) y no había preloaded, quitar
    if (clamped === 0 && floor === 0) {
      onChange?.(without);
    } else {
      onChange?.([...without, { row_id: rowId, bays_selected: clamped }]);
    }
  }

  // Chip (Select by Row): click alterna entre completa y vacía
  function handleChipClick(rowId) {
    const total = rowMap[rowId] ?? 0;
    const floor = preloaded[rowId] ?? 0;
    const current = selMap[rowId] ?? floor;
    const without = value.filter(r => r.row_id !== rowId);

    if (current >= total) {
      // Ya estaba completa → volver al piso
      if (floor > 0) {
        onChange?.([...without, { row_id: rowId, bays_selected: floor }]);
      } else {
        onChange?.(without);
      }
    } else {
      // Marcar completa
      onChange?.([...without, { row_id: rowId, bays_selected: total }]);
    }
  }

  // Seleccionar / deseleccionar block completo (chips)
  function handleSelectBlock(blockId) {
    const ids = groups[blockId] ?? [];
    const allSel = ids.every(id => (selMap[id] ?? 0) >= (rowMap[id] ?? 0));
    const without = value.filter(r => !ids.includes(r.row_id));
    if (allSel) {
      // Deseleccionar → volver a pisos
      const floors = ids
        .filter(id => (preloaded[id] ?? 0) > 0)
        .map(id => ({ row_id: id, bays_selected: preloaded[id] }));
      onChange?.([...without, ...floors]);
    } else {
      // Seleccionar todo completo
      const full = ids.map(id => ({ row_id: id, bays_selected: rowMap[id] ?? 0 }));
      onChange?.([...without, ...full]);
    }
  }

  function handleClear() {
    // Volver todos al piso
    const floors = Object.entries(preloaded)
      .filter(([, v]) => v > 0)
      .map(([row_id, bays_selected]) => ({ row_id, bays_selected }));
    onChange?.(floors);
  }

  // ── Resumen de selección (persistente entre tabs) ────────────

  const selectionSummary = useMemo(() => {
    return value
      .filter(r => r.bays_selected > (preloaded[r.row_id] ?? 0))
      .map(r => {
        const delta = r.bays_selected - (preloaded[r.row_id] ?? 0);
        const total = rowMap[r.row_id] ?? 0;
        const isComplete = r.bays_selected >= total;
        return { row_id: r.row_id, delta, isComplete };
      });
  }, [value, preloaded, rowMap]);

  // Label del campo exterior
  const fieldLabel = useMemo(() => {
    if (selectionSummary.length === 0) return "";
    return selectionSummary
      .map(r => r.isComplete ? r.row_id : `${r.row_id} (+${r.delta})`)
      .join(", ");
  }, [selectionSummary]);

  return (
    <div>
      {/* ── Campo + botón ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{
          flex: 1, fontSize: 12, padding: "7px 10px",
          border: "1px solid #d1d5db", borderRadius: 6,
          background: "#f9fafb", color: "#6b7280",
          fontFamily: "monospace", minHeight: 36,
          display: "flex", alignItems: "center",
        }}>
          {fieldLabel || <span style={{ color: "#9ca3af" }}>Sin filas seleccionadas</span>}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 500, padding: "7px 12px",
            border: "1px solid #d1d5db", borderRadius: 6,
            background: "#fff", color: "#374151",
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          <GridIcon />
          Selector de filas
        </button>
      </div>

      {/* Resumen debajo del campo */}
      {totalDeltaBays > 0 && (
        <div style={{ marginTop: 4, fontSize: 12, display: "flex", gap: 6 }}>
          <span style={{ fontWeight: 500, color: "#111827" }}>
            +{totalDeltaBays} bays nuevos
          </span>
          <span style={{ color: "#d1d5db" }}>·</span>
          <span style={{ color: "#2563eb" }}>
            {totalDeltaM2.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
          </span>
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "flex-start",
          justifyContent: "center",
          padding: "40px 16px", zIndex: 9999,
          overflowY: "auto",
        }}>
          <div ref={modalRef} style={{
            background: "#fff", borderRadius: 12,
            width: "100%", maxWidth: 620,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            display: "flex", flexDirection: "column",
            overflow: "hidden", maxHeight: "85vh",
          }}>

            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid #f3f4f6",
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                Seleccionar filas trabajadas
              </span>
              <button type="button" onClick={() => setOpen(false)}
                style={{
                  background: "none", border: "none",
                  cursor: "pointer", color: "#9ca3af",
                  fontSize: 14, padding: "2px 6px"
                }}>
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex", padding: "0 16px",
              borderBottom: "1px solid #f3f4f6",
            }}>
              {[["bay", "Select by Bay"], ["row", "Select by Row"]].map(([id, label]) => (
                <button key={id} type="button"
                  onClick={() => setActiveTab(id)}
                  style={{
                    fontSize: 13, fontWeight: 500,
                    padding: "10px 14px",
                    border: "none", background: "none",
                    cursor: "pointer",
                    color: activeTab === id ? "#111827" : "#6b7280",
                    borderBottom: activeTab === id
                      ? "2px solid #111827" : "2px solid transparent",
                    marginBottom: -1,
                    transition: "color .15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Búsqueda + leyenda */}
            <div style={{
              padding: "10px 16px 8px",
              borderBottom: "1px solid #f3f4f6",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <input
                placeholder="Buscar fila… S-1, N-SKIRT"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%", fontSize: 13,
                  padding: "7px 10px",
                  border: "1px solid #e5e7eb", borderRadius: 6,
                  outline: "none", background: "#f9fafb",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 14 }}>
                <LegendDot color="#e5e7eb" border="#d1d5db" label="Row normal" />
                <LegendDot color="#fde68a" border="#d97706" label="Skirt" />
                <LegendDot color="#1d4ed8" border="#1e40af" label="Seleccionado" />
                {Object.keys(preloaded).length > 0 && (
                  <LegendDot color="#e0f2fe" border="#0ea5e9" label="Registrado hoy" />
                )}
              </div>
            </div>

            {/* ── Resumen de selección ─────────────────────── */}
            {selectionSummary.length > 0 && (
              <div style={{
                padding: "8px 16px",
                background: "#f0f9ff",
                borderBottom: "1px solid #bae6fd",
                display: "flex", flexWrap: "wrap", gap: 5,
                alignItems: "center",
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: ".06em",
                  color: "#0369a1", marginRight: 4,
                }}>
                  Seleccionado:
                </span>
                {selectionSummary.map(r => (
                  <span key={r.row_id} style={{
                    fontSize: 11, fontFamily: "monospace",
                    padding: "2px 7px", borderRadius: 10,
                    background: r.isComplete ? "#1d4ed8" : "#bfdbfe",
                    color: r.isComplete ? "#fff" : "#1e40af",
                    fontWeight: 500,
                  }}>
                    {r.isComplete ? r.row_id : `${r.row_id} +${r.delta}`}
                  </span>
                ))}
              </div>
            )}

            {/* Contenido */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>

              {/* ══ SELECT BY BAY — sliders ══ */}
              {activeTab === "bay" && (
                <div>
                  {Object.keys(filteredGroups).sort().map(blockId => (
                    <div key={blockId} style={{ marginBottom: 20 }}>
                      <div style={{
                        fontSize: 11, fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: ".06em",
                        color: "#6b7280", marginBottom: 8,
                      }}>
                        Block {blockId}
                      </div>
                      {filteredGroups[blockId].map(rowId => {
                        const total = rowMap[rowId] ?? 0;
                        const floor = preloaded[rowId] ?? 0;
                        const current = selMap[rowId] ?? floor;
                        const delta = Math.max(0, current - floor);
                        const promM2 = blockMap[rowToBlock[rowId]] ?? 0;
                        const deltaM2 = Math.round(delta * promM2 * 10) / 10;
                        const sk = isSkirt(rowId);
                        const hasPreload = floor > 0;

                        return (
                          <div key={rowId} style={{
                            display: "grid",
                            gridTemplateColumns: "100px 1fr 70px",
                            alignItems: "center", gap: 10,
                            padding: "6px 0",
                            borderBottom: "1px solid #f9fafb",
                          }}>
                            {/* ID */}
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{
                                fontFamily: "monospace", fontSize: 11,
                                color: sk ? "#92400e" : "#374151",
                              }}>
                                {rowId}
                              </span>
                              {sk && (
                                <span style={{
                                  fontSize: 9, padding: "1px 4px",
                                  background: "#fef3c7", color: "#92400e",
                                  borderRadius: 3,
                                }}>skirt</span>
                              )}
                            </div>

                            {/* Slider */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <input
                                type="range"
                                min={0}
                                max={total}
                                step={0.25}
                                value={current}
                                onChange={e => handleSlider(rowId, e.target.value)}
                                style={{
                                  width: "100%",
                                  accentColor: sk ? "#d97706" : "#2563eb",
                                }}
                              />
                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 10, color: "#9ca3af",
                              }}>
                                <span style={{ color: hasPreload ? "#0ea5e9" : "#d1d5db" }}>
                                  {hasPreload ? `mín: ${floor}` : "0"}
                                </span>
                                <span style={{
                                  color: delta > 0 ? "#2563eb" : "#9ca3af",
                                  fontWeight: delta > 0 ? 500 : 400,
                                }}>
                                  {current > 0 ? `${current} / ${total}` : total}
                                </span>
                              </div>
                            </div>

                            {/* m² delta */}
                            <div style={{
                              textAlign: "right", fontSize: 11,
                              color: delta > 0 ? "#1d4ed8" : "#e5e7eb",
                              fontWeight: delta > 0 ? 500 : 400,
                            }}>
                              {delta > 0 ? `+${deltaM2} m²` : "—"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* ══ SELECT BY ROW — chips estilo BaySelector original ══ */}
              {activeTab === "row" && (
                <div>
                  {Object.keys(filteredGroups).sort().map(blockId => {
                    const ids = filteredGroups[blockId];
                    const allSel = ids.every(id =>
                      (selMap[id] ?? 0) >= (rowMap[id] ?? 0)
                    );
                    const someSel = ids.some(id =>
                      (selMap[id] ?? 0) > (preloaded[id] ?? 0)
                    );
                    return (
                      <div key={blockId} style={{ marginBottom: 16 }}>
                        <div style={{
                          display: "flex", alignItems: "center",
                          justifyContent: "space-between", marginBottom: 6,
                        }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            textTransform: "uppercase", letterSpacing: ".06em",
                            color: "#6b7280",
                          }}>
                            Block {blockId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectBlock(blockId)}
                            style={{
                              fontSize: 11, color: "#2563eb",
                              background: "none", border: "none",
                              cursor: "pointer", padding: "2px 0",
                            }}
                          >
                            {allSel ? "Deseleccionar todo"
                              : someSel ? "Completar block"
                                : "Seleccionar todo"}
                          </button>
                        </div>

                        {/* Chips */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {ids.map(rowId => {
                            const total = rowMap[rowId] ?? 0;
                            const floor = preloaded[rowId] ?? 0;
                            const current = selMap[rowId] ?? floor;
                            const isNew = current > floor;
                            const isFull = current >= total && total > 0;
                            const sk = isSkirt(rowId);
                            const hasFloor = floor > 0;

                            // Clases visuales
                            let bg = "#f9fafb";
                            let border = "#e5e7eb";
                            let color = "#374151";
                            let fw = 400;

                            if (hasFloor && !isNew) {
                              // Ya registrado hoy — tono azul claro
                              bg = "#e0f2fe"; border = "#7dd3fc"; color = "#0369a1";
                            }
                            if (sk && !isNew) {
                              bg = "#fffbeb"; border = "#fcd34d"; color = "#92400e";
                            }
                            if (isNew && !sk) {
                              bg = "#1d4ed8"; border = "#1e40af"; color = "#fff"; fw = 500;
                            }
                            if (isNew && sk) {
                              bg = "#d97706"; border = "#b45309"; color = "#fff"; fw = 500;
                            }

                            return (
                              <button
                                key={rowId}
                                type="button"
                                onClick={() => handleChipClick(rowId)}
                                title={`${total} bays totales · ${rowMap[rowId]} bays`}
                                style={{
                                  fontSize: 11, fontFamily: "monospace",
                                  padding: "4px 8px", borderRadius: 5,
                                  cursor: "pointer",
                                  border: `1px solid ${border}`,
                                  background: bg, color,
                                  fontWeight: fw,
                                  transition: "all .1s",
                                  display: "flex", alignItems: "center", gap: 5,
                                }}
                              >
                                {rowId}
                                {isNew && (
                                  <span style={{ fontSize: 10, opacity: .8 }}>
                                    {isFull ? "✓" : `+${current - floor}`}
                                  </span>
                                )}
                                {hasFloor && !isNew && (
                                  <span style={{ fontSize: 10, opacity: .7 }}>
                                    {floor}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {Object.keys(filteredGroups).length === 0 && (
                    <p style={{
                      fontSize: 13, color: "#9ca3af",
                      textAlign: "center", padding: "24px 0",
                    }}>
                      No se encontraron filas para "{search}"
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "12px 16px",
              borderTop: "1px solid #f3f4f6",
              background: "#fafafa",
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                <span style={{ fontWeight: 600, color: "#111827" }}>
                  +{totalDeltaBays}
                </span>{" bays · "}
                <span style={{ fontWeight: 600, color: "#1d4ed8" }}>
                  {totalDeltaM2.toFixed(1)} m²
                </span>
                {" nuevos"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    fontSize: 13, fontWeight: 500,
                    padding: "7px 14px",
                    border: "1px solid #e5e7eb", borderRadius: 6,
                    background: "#fff", color: "#6b7280", cursor: "pointer",
                  }}
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    fontSize: 13, fontWeight: 500,
                    padding: "7px 16px",
                    border: "1px solid #1e40af", borderRadius: 6,
                    background: "#1d4ed8", color: "#fff", cursor: "pointer",
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, border, label }) {
  return (
    <span style={{
      display: "flex", alignItems: "center", gap: 5,
      fontSize: 11, color: "#6b7280"
    }}>
      <span style={{
        width: 10, height: 10, borderRadius: 3, flexShrink: 0,
        background: color, border: `1px solid ${border}`,
      }} />
      {label}
    </span>
  );
}
