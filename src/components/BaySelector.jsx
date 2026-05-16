/**
 * BaySelector.jsx
 * ─────────────────────────────────────────────────────────────
 * Componente de selección de bays para el formulario de registro.
 *
 * Props:
 *   bayMap     {Object}   - { "S-1": 21, "N-SKIRT": 11, ... }
 *   value      {string}   - CSV actual "S-1,S-2,N-3"
 *   onChange   {Function} - (newCsv) => void
 *   disabled   {boolean}  - opcional
 *
 * Uso:
 *   <BaySelector
 *     bayMap={bayMap}
 *     value={baysCSV}
 *     onChange={setBaysCSV}
 *   />
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { calcM2, countBays } from "../lib/calcM2";

// ── HELPERS ──────────────────────────────────────────────────

function parseCsv(csv) {
  if (!csv) return new Set();
  return new Set(
    csv.split(",").map(s => s.trim()).filter(Boolean)
  );
}

function toCsv(set) {
  return [...set].join(",");
}

// Agrupa los bay_ids por block (prefijo antes del primer número/SKIRT)
function groupByBlock(bayMap) {
  const groups = {};
  for (const bayId of Object.keys(bayMap)) {
    // block = todo antes del primer guión seguido de número o "SKIRT"
    const parts = bayId.split("-");
    // Detectar el bloque: puede ser "S", "N", "B1", "B2", "YEL", etc.
    // El bloque es la parte antes del número o "SKIRT"
    let blockParts = [];
    for (const part of parts) {
      if (/^\d+$/.test(part) || part === "SKIRT") break;
      blockParts.push(part);
    }
    const block = blockParts.join("-");
    if (!groups[block]) groups[block] = [];
    groups[block].push(bayId);
  }
  return groups;
}

function isSkirt(bayId) {
  return bayId.includes("SKIRT");
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────

export default function BaySelector({ bayMap = {}, value = "", onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => parseCsv(value));
  const [activeTab, setActiveTab] = useState("list"); // "list" | "map"
  const [csvInput, setCsvInput] = useState(value);
  const [search, setSearch] = useState("");
  const modalRef = useRef(null);

  const groups = groupByBlock(bayMap);
  const blockNames = Object.keys(groups).sort();

  // Sync externo → interno cuando value cambia desde afuera
  useEffect(() => {
    setSelected(parseCsv(value));
    setCsvInput(value);
  }, [value]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Cerrar click fuera del modal
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleClose();
      }
    };
    setTimeout(() => window.addEventListener("mousedown", onClick), 0);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggleBay = useCallback((bayId) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(bayId) ? next.delete(bayId) : next.add(bayId);
      return next;
    });
  }, []);

  const handleCsvChange = (val) => {
    setCsvInput(val);
    // Sincronizar chips: solo los que existen en el MAP
    const ids = parseCsv(val);
    const valid = new Set([...ids].filter(id => bayMap[id] !== undefined));
    setSelected(valid);
  };

  const handleApply = () => {
    const csv = toCsv(selected);
    setCsvInput(csv);
    onChange?.(csv);
    setOpen(false);
    setSearch("");
  };

  const handleClose = () => {
    // Revertir selección al valor externo
    setSelected(parseCsv(value));
    setCsvInput(value);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    setSelected(new Set());
    setCsvInput("");
  };

  const handleSelectBlock = (block) => {
    const blockBays = groups[block] || [];
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = blockBays.every(id => next.has(id));
      if (allSelected) {
        blockBays.forEach(id => next.delete(id));
      } else {
        blockBays.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Métricas en tiempo real
  const totalBays = selected.size;
  const totalM2 = calcM2(toCsv(selected), bayMap);
  const maxM2 = Math.max(...Object.values(bayMap), 1);

  // Filtro de búsqueda para la vista de lista
  const filteredGroups = search
    ? Object.fromEntries(
      Object.entries(groups).map(([block, ids]) => [
        block,
        ids.filter(id => id.toLowerCase().includes(search.toLowerCase())),
      ]).filter(([, ids]) => ids.length > 0)
    )
    : groups;

  return (
    <div className="bay-selector">
      {/* ── Campo CSV + botón ─────────────────────────────── */}
      <div className="bay-field">
        <input
          className="bay-csv-input"
          value={csvInput}
          onChange={e => handleCsvChange(e.target.value)}
          placeholder="S-1,S-2,N-SKIRT-2…"
          disabled={disabled}
          spellCheck={false}
        />
        <button
          className="bay-map-btn"
          onClick={() => setOpen(true)}
          disabled={disabled}
          type="button"
          title="Abrir selector de bays"
        >
          <GridIcon />
          Mapa de bays
        </button>
      </div>

      {/* Resumen compacto debajo del input */}
      {totalBays > 0 && (
        <div className="bay-summary">
          <span className="bay-count">{totalBays} bays</span>
          <span className="bay-sep">·</span>
          <span className="bay-m2">{totalM2.toLocaleString()} m²</span>
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────── */}
      {open && (
        <div className="modal-backdrop">
          <div className="modal-box" ref={modalRef}>

            {/* Header */}
            <div className="modal-header">
              <span className="modal-title">Seleccionar bays</span>
              <button className="modal-close-btn" onClick={handleClose} type="button">✕</button>
            </div>

            {/* Tabs */}
            <div className="modal-tabs">
              <button
                className={`modal-tab ${activeTab === "list" ? "active" : ""}`}
                onClick={() => setActiveTab("list")}
                type="button"
              >
                Lista
              </button>
              <button
                className={`modal-tab ${activeTab === "map" ? "active" : ""}`}
                onClick={() => setActiveTab("map")}
                type="button"
              >
                Mapa visual
              </button>
            </div>

            {/* Búsqueda */}
            <div className="modal-search-wrap">
              <input
                className="modal-search"
                placeholder="Buscar bay… S-12, N-SKIRT"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {/* Leyenda */}
              <div className="modal-legend">
                <span className="legend-item"><span className="legend-dot normal" />Bay normal</span>
                <span className="legend-item"><span className="legend-dot skirt" />Skirt</span>
                <span className="legend-item"><span className="legend-dot sel" />Seleccionado</span>
              </div>
            </div>

            {/* Contenido de tabs */}
            <div className="modal-content">

              {activeTab === "list" && (
                <div className="list-view">
                  {Object.keys(filteredGroups).sort().map(block => {
                    const ids = filteredGroups[block];
                    const allSel = ids.every(id => selected.has(id));
                    const someSel = ids.some(id => selected.has(id));
                    return (
                      <div key={block} className="block-section">
                        <div className="block-header">
                          <span className="block-label">Block {block}</span>
                          <button
                            className="block-select-btn"
                            onClick={() => handleSelectBlock(block)}
                            type="button"
                          >
                            {allSel ? "Deseleccionar todo" : someSel ? "Completar block" : "Seleccionar todo"}
                          </button>
                        </div>
                        <div className="bay-chips">
                          {ids.map(id => (
                            <button
                              key={id}
                              type="button"
                              className={[
                                "bay-chip",
                                isSkirt(id) ? "skirt" : "",
                                selected.has(id) ? "selected" : "",
                              ].join(" ")}
                              onClick={() => toggleBay(id)}
                              title={`${bayMap[id]} m²`}
                            >
                              {id}
                              {selected.has(id) && <span className="chip-m2">{bayMap[id]}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(filteredGroups).length === 0 && (
                    <p className="empty-msg">No se encontraron bays para "{search}"</p>
                  )}
                </div>
              )}

              {activeTab === "map" && (
                <div className="map-view">
                  {blockNames.map(block => (
                    <div key={block} className="map-block">
                      <div className="map-block-title">Block {block}</div>
                      {groups[block].map(id => {
                        const m2 = bayMap[id] ?? 0;
                        const pct = Math.round((m2 / maxM2) * 100);
                        const sel = selected.has(id);
                        const skirt = isSkirt(id);
                        return (
                          <div
                            key={id}
                            className={`map-row ${sel ? "sel" : ""}`}
                            onClick={() => toggleBay(id)}
                          >
                            <span className="map-id">{id}</span>
                            <div className="map-bar-track">
                              <div
                                className={`map-bar-fill ${skirt ? "skirt" : ""} ${sel ? "selected" : ""}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="map-m2">{m2}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <div className="footer-stats">
                <span className="footer-bays">{totalBays}</span> bays
                <span className="footer-sep">·</span>
                <span className="footer-m2">{totalM2.toLocaleString()}</span> m²
              </div>
              <div className="footer-actions">
                <button className="btn-clear" onClick={handleClear} type="button">
                  Limpiar
                </button>
                <button className="btn-apply" onClick={handleApply} type="button">
                  Aplicar selección
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Estilos ──────────────────────────────────────── */}
      <style>{`
        /* Campo CSV */
        .bay-field {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .bay-csv-input {
          flex: 1;
          font-family: monospace;
          font-size: 13px;
          padding: 8px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          color: #111;
          outline: none;
          transition: border-color 0.15s;
        }
        .bay-csv-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .bay-csv-input:disabled { background: #f9fafb; color: #9ca3af; }

        .bay-map-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          color: #374151;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, border-color 0.15s;
        }
        .bay-map-btn:hover { background: #f3f4f6; border-color: #9ca3af; }
        .bay-map-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .bay-summary {
          display: flex;
          gap: 6px;
          margin-top: 4px;
          font-size: 12px;
          color: #6b7280;
        }
        .bay-count { font-weight: 500; color: #111827; }
        .bay-m2    { color: #2563eb; }
        .bay-sep   { color: #d1d5db; }

        /* Backdrop */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 40px 16px;
          z-index: 9999;
          overflow-y: auto;
        }

        /* Modal box */
        .modal-box {
          background: #fff;
          border-radius: 12px;
          width: 100%;
          max-width: 580px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          max-height: 85vh;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .modal-title {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }
        .modal-close-btn {
          font-size: 14px;
          color: #9ca3af;
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .modal-close-btn:hover { background: #f3f4f6; color: #374151; }

        /* Tabs */
        .modal-tabs {
          display: flex;
          padding: 0 16px;
          border-bottom: 1px solid #f3f4f6;
          gap: 0;
        }
        .modal-tab {
          font-size: 13px;
          padding: 10px 14px;
          border: none;
          background: none;
          cursor: pointer;
          color: #6b7280;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          font-weight: 500;
          transition: color 0.15s;
        }
        .modal-tab:hover { color: #111827; }
        .modal-tab.active { color: #111827; border-bottom-color: #111827; }

        /* Search + legend */
        .modal-search-wrap {
          padding: 10px 16px 8px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .modal-search {
          width: 100%;
          font-size: 13px;
          padding: 7px 10px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          outline: none;
          background: #f9fafb;
          box-sizing: border-box;
        }
        .modal-search:focus { border-color: #2563eb; background: #fff; }

        .modal-legend {
          display: flex;
          gap: 14px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #6b7280;
        }
        .legend-dot {
          width: 10px; height: 10px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .legend-dot.normal   { background: #e5e7eb; border: 1px solid #d1d5db; }
        .legend-dot.skirt    { background: #fde68a; border: 1px solid #d97706; }
        .legend-dot.sel      { background: #1d4ed8; border: 1px solid #1e40af; }

        /* Content scroll */
        .modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px 16px;
        }

        /* List view */
        .block-section { margin-bottom: 16px; }
        .block-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .block-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #6b7280;
        }
        .block-select-btn {
          font-size: 11px;
          color: #2563eb;
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px 0;
        }
        .block-select-btn:hover { text-decoration: underline; }

        .bay-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .bay-chip {
          font-size: 11px;
          font-family: monospace;
          padding: 4px 8px;
          border-radius: 5px;
          cursor: pointer;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          color: #374151;
          transition: all 0.1s;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .bay-chip:hover { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
        .bay-chip.skirt {
          background: #fffbeb;
          border-color: #fcd34d;
          color: #92400e;
        }
        .bay-chip.selected {
          background: #1d4ed8;
          border-color: #1e40af;
          color: #fff;
          font-weight: 500;
        }
        .bay-chip.skirt.selected {
          background: #d97706;
          border-color: #b45309;
          color: #fff;
        }
        .chip-m2 {
          font-size: 10px;
          opacity: 0.75;
        }

        .empty-msg {
          font-size: 13px;
          color: #9ca3af;
          text-align: center;
          padding: 24px 0;
        }

        /* Map view */
        .map-view { display: flex; flex-direction: column; gap: 16px; }
        .map-block { }
        .map-block-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #6b7280;
          margin-bottom: 6px;
        }
        .map-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 3px 6px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.1s;
        }
        .map-row:hover { background: #f3f4f6; }
        .map-row.sel   { background: #eff6ff; }
        .map-id {
          font-family: monospace;
          font-size: 11px;
          color: #374151;
          width: 90px;
          flex-shrink: 0;
        }
        .map-bar-track {
          flex: 1;
          height: 10px;
          background: #f3f4f6;
          border-radius: 3px;
          overflow: hidden;
        }
        .map-bar-fill {
          height: 100%;
          border-radius: 3px;
          background: #93c5fd;
          transition: width 0.2s;
        }
        .map-bar-fill.selected { background: #2563eb; }
        .map-bar-fill.skirt    { background: #fcd34d; }
        .map-bar-fill.skirt.selected { background: #d97706; }
        .map-m2 {
          font-size: 10px;
          color: #9ca3af;
          width: 30px;
          text-align: right;
          flex-shrink: 0;
        }

        /* Footer */
        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-top: 1px solid #f3f4f6;
          background: #fafafa;
        }
        .footer-stats {
          font-size: 13px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .footer-bays, .footer-m2 { font-weight: 600; color: #111827; }
        .footer-sep { color: #d1d5db; }
        .footer-actions { display: flex; gap: 8px; }

        .btn-clear {
          font-size: 13px;
          padding: 7px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: #fff;
          color: #6b7280;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-clear:hover { background: #f3f4f6; }

        .btn-apply {
          font-size: 13px;
          padding: 7px 16px;
          border: 1px solid #1e40af;
          border-radius: 6px;
          background: #1d4ed8;
          color: #fff;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-apply:hover { background: #1e40af; }
      `}</style>
    </div>
  );
}

// ── Ícono SVG ────────────────────────────────────────────────
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
