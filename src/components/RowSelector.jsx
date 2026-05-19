/**
 * RowSelector.jsx v1.1
 * Reemplaza BaySelector. Cada row del orchard tiene un slider
 * con máximo = total_bays y mínimo = bays ya registrados (piso).
 *
 * Props:
 *   rowMap      {Object}  - { row_id: total_bays }
 *   blockMap    {Object}  - { block_id: prom_m2_per_bay }
 *   rowToBlock  {Object}  - { row_id: block_id }
 *   orchardId   {string}  - para leer/escribir localStorage
 *   date        {string}  - fecha del job (YYYY-MM-DD)
 *   value       {Array}   - [{ row_id, bays_selected }] estado actual
 *   onChange    {Function}- (newSelections) => void
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { calcM2, countBays } from "../lib/calcM2";

const STORAGE_KEY = (orchardId, date) =>
  `kiwi_preload_${orchardId}_${date}`;

// Agrupa row_ids por block
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
  const [activeTab, setActiveTab] = useState("list");
  const [search, setSearch] = useState("");
  const modalRef = useRef(null);

  // Mapa de selecciones: { row_id: bays_selected }
  const selMap = useMemo(() => {
    return Object.fromEntries(value.map(r => [r.row_id, r.bays_selected]));
  }, [value]);

  // Piso de cada slider: bays ya registrados (desde localStorage)
  const [preloaded, setPreloaded] = useState({}); // { row_id: bays }

  useEffect(() => {
    if (!orchardId || !date) return;
    const key = STORAGE_KEY(orchardId, date);
    try {
      const raw = localStorage.getItem(key);
      setPreloaded(raw ? JSON.parse(raw) : {});
    } catch {
      setPreloaded({});
    }
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
      if (modalRef.current && !modalRef.current.contains(e.target)) setOpen(false);
    };
    setTimeout(() => window.addEventListener("mousedown", fn), 0);
    return () => window.removeEventListener("mousedown", fn);
  }, [open]);

  const groups = useMemo(
    () => groupByBlock(rowMap, rowToBlock),
    [rowMap, rowToBlock]
  );
  const blockIds = Object.keys(groups).sort();

  // Actualizar un slider
  function handleSlider(rowId, val) {
    const floor = preloaded[rowId] ?? 0;
    const clamped = Math.max(floor, Number(val));
    const next = selMap[rowId] === clamped
      ? value.filter(r => r.row_id !== rowId)   // sin cambio → quitar
      : [
        ...value.filter(r => r.row_id !== rowId),
        { row_id: rowId, bays_selected: clamped },
      ];
    // Solo mantener rows con bays > piso
    const filtered = next.filter(r => r.bays_selected > (preloaded[r.row_id] ?? 0) || (preloaded[r.row_id] ?? 0) > 0);
    onChange?.(filtered.length ? filtered : next);
  }

  // Vista mapa: click en row → asume completa
  function handleRowClick(rowId) {
    const total = rowMap[rowId] ?? 0;
    const floor = preloaded[rowId] ?? 0;
    const current = selMap[rowId] ?? floor;
    const next = current >= total
      ? value.filter(r => r.row_id !== rowId)     // ya estaba completa → quitar
      : [
        ...value.filter(r => r.row_id !== rowId),
        { row_id: rowId, bays_selected: total },
      ];
    onChange?.(next);
  }

  // Métricas en tiempo real (solo del delta)
  const deltaSelections = useMemo(() => {
    const result = value.map(r => ({
      ...r,
      bays_selected: Math.max(0, r.bays_selected - (preloaded[r.row_id] ?? 0)),
    })).filter(r => r.bays_selected > 0);
    console.debug("[RowSelector] deltaSelections:", result);
    console.debug("[RowSelector] blockMap:", blockMap);
    console.debug("[RowSelector] rowToBlock sample:", Object.entries(rowToBlock).slice(0, 3));
    return result;
  }, [value, preloaded, blockMap, rowToBlock]);

  const totalDeltaBays = countBays(deltaSelections);
  const totalDeltaM2 = calcM2(deltaSelections, blockMap, rowToBlock);
  console.debug("[RowSelector] totalDeltaBays:", totalDeltaBays, "totalDeltaM2:", totalDeltaM2);

  // Resumen para el campo de texto
  const summaryText = useMemo(() => {
    const parts = value
      .filter(r => r.bays_selected > (preloaded[r.row_id] ?? 0))
      .map(r => {
        const delta = r.bays_selected - (preloaded[r.row_id] ?? 0);
        return `${r.row_id} (+${delta})`;
      });
    return parts.join(", ");
  }, [value, preloaded]);

  const maxM2 = useMemo(
    () => Math.max(...Object.values(rowMap), 1),
    [rowMap]
  );

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

  return (
    <div>
      {/* Campo resumen (solo lectura) + botón */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{
          flex: 1, fontSize: 12, padding: "7px 10px",
          border: "1px solid #d1d5db", borderRadius: 6,
          background: "#f9fafb", color: "#6b7280",
          fontFamily: "monospace", minHeight: 36,
          display: "flex", alignItems: "center",
        }}>
          {summaryText || (
            <span style={{ color: "#9ca3af" }}>Sin filas seleccionadas</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 12, fontWeight: 500, padding: "7px 12px",
            border: "1px solid #d1d5db", borderRadius: 6,
            background: "#fff", color: "#374151", cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1" y="1" width="6" height="6" rx="1" />
            <rect x="9" y="1" width="6" height="6" rx="1" />
            <rect x="1" y="9" width="6" height="6" rx="1" />
            <rect x="9" y="9" width="6" height="6" rx="1" />
          </svg>
          Selector de filas
        </button>
      </div>

      {/* Resumen delta */}
      {totalDeltaBays > 0 && (
        <div style={{
          marginTop: 4, fontSize: 12, color: "#6b7280",
          display: "flex", gap: 6,
        }}>
          <span style={{ fontWeight: 500, color: "#111827" }}>
            +{totalDeltaBays} bays nuevos
          </span>
          <span style={{ color: "#d1d5db" }}>·</span>
          <span style={{ color: "#2563eb" }}>
            {totalDeltaM2.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
          </span>
        </div>
      )}

      {/* Modal */}
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
            width: "100%", maxWidth: 600,
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
              <button
                type="button" onClick={() => setOpen(false)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#9ca3af", fontSize: 14, padding: "2px 6px"
                }}
              >✕</button>
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex", padding: "0 16px",
              borderBottom: "1px solid #f3f4f6",
            }}>
              {[["list", "Sliders"], ["map", "Vista mapa"]].map(([id, label]) => (
                <button key={id} type="button"
                  onClick={() => setActiveTab(id)}
                  style={{
                    fontSize: 12, fontWeight: 500, padding: "9px 12px",
                    border: "none", background: "none", cursor: "pointer",
                    color: activeTab === id ? "#111827" : "#6b7280",
                    borderBottom: activeTab === id
                      ? "2px solid #111827" : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Búsqueda + leyenda */}
            <div style={{
              padding: "8px 16px",
              borderBottom: "1px solid #f3f4f6",
            }}>
              <input
                placeholder="Buscar fila… S-1, N-SKIRT"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%", fontSize: 12, padding: "6px 10px",
                  border: "1px solid #e5e7eb", borderRadius: 6,
                  background: "#f9fafb", outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {preloaded && Object.keys(preloaded).length > 0 && (
                <p style={{ fontSize: 11, color: "#9ca3af", margin: "5px 0 0" }}>
                  Los valores en gris son el mínimo ya registrado — el slider no puede bajar de ese punto.
                </p>
              )}
            </div>

            {/* Contenido */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>

              {/* ── Vista Sliders (List) ── */}
              {activeTab === "list" && (
                <div>
                  {Object.keys(filteredGroups).sort().map(blockId => (
                    <div key={blockId} style={{ marginBottom: 20 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: ".06em",
                        color: "#9ca3af", marginBottom: 8,
                      }}>
                        {blockId}
                      </div>
                      {filteredGroups[blockId].map(rowId => {
                        const total = rowMap[rowId] ?? 0;
                        const floor = preloaded[rowId] ?? 0;
                        const current = selMap[rowId] ?? floor;
                        const delta = Math.max(0, current - floor);
                        const promM2 = blockMap[rowToBlock[rowId]] ?? 0;
                        const deltaM2 = delta * promM2;
                        const sk = isSkirt(rowId);

                        return (
                          <div key={rowId} style={{
                            display: "grid",
                            gridTemplateColumns: "90px 1fr 60px",
                            alignItems: "center", gap: 10,
                            padding: "5px 0",
                            borderBottom: "1px solid #f9fafb",
                          }}>
                            {/* ID + badge skirt */}
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
                                style={{ width: "100%", accentColor: sk ? "#d97706" : "#2563eb" }}
                              />
                              <div style={{
                                display: "flex", justifyContent: "space-between",
                                fontSize: 10, color: "#9ca3af",
                              }}>
                                <span style={{ color: floor > 0 ? "#6b7280" : "#d1d5db" }}>
                                  {floor > 0 ? `mín: ${floor}` : "0"}
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
                              color: delta > 0 ? "#1d4ed8" : "#d1d5db",
                              fontWeight: delta > 0 ? 500 : 400,
                            }}>
                              {delta > 0
                                ? `+${deltaM2.toFixed(1)} m²`
                                : `—`
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Vista Mapa ── */}
              {activeTab === "map" && (
                <div>
                  {blockIds.map(blockId => (
                    <div key={blockId} style={{ marginBottom: 20 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: ".06em",
                        color: "#9ca3af", marginBottom: 6,
                      }}>
                        {blockId}
                      </div>
                      {(groups[blockId] ?? []).map(rowId => {
                        const total = rowMap[rowId] ?? 0;
                        const floor = preloaded[rowId] ?? 0;
                        const sel = (selMap[rowId] ?? floor) >= total;
                        const partial = (selMap[rowId] ?? floor) > floor &&
                          (selMap[rowId] ?? floor) < total;
                        const sk = isSkirt(rowId);
                        const pct = Math.round((total / maxM2) * 100);

                        let barColor = sk ? "#fcd34d" : "#93c5fd";
                        if (sel) barColor = sk ? "#d97706" : "#2563eb";
                        if (partial) barColor = sk ? "#f59e0b" : "#60a5fa";

                        return (
                          <div
                            key={rowId}
                            onClick={() => handleRowClick(rowId)}
                            style={{
                              display: "flex", alignItems: "center",
                              gap: 8, padding: "3px 6px",
                              borderRadius: 4, cursor: "pointer",
                              background: sel ? "#eff6ff" : partial ? "#f0f9ff" : "transparent",
                            }}
                          >
                            <span style={{
                              fontFamily: "monospace", fontSize: 10,
                              color: "#374151", width: 84, flexShrink: 0,
                            }}>
                              {rowId}
                            </span>
                            <div style={{
                              flex: 1, height: 10,
                              background: "#f3f4f6", borderRadius: 3,
                              overflow: "hidden",
                            }}>
                              <div style={{
                                height: "100%", width: `${pct}%`,
                                background: barColor, borderRadius: 3,
                                transition: "background .15s",
                              }} />
                            </div>
                            <span style={{
                              fontSize: 10, color: "#9ca3af",
                              width: 30, textAlign: "right",
                            }}>
                              {total}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "10px 16px",
              borderTop: "1px solid #f3f4f6",
              background: "#fafafa",
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                <span style={{ fontWeight: 600, color: "#111827" }}>
                  +{totalDeltaBays}
                </span> bays ·{" "}
                <span style={{ fontWeight: 600, color: "#1d4ed8" }}>
                  {totalDeltaM2.toFixed(1)} m²
                </span>
                {" "}nuevos
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => { onChange?.([]); }}
                  style={{
                    fontSize: 12, padding: "6px 12px",
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
                    fontSize: 12, padding: "6px 14px",
                    border: "1px solid #1e40af", borderRadius: 6,
                    background: "#1d4ed8", color: "#fff",
                    cursor: "pointer", fontWeight: 500,
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
