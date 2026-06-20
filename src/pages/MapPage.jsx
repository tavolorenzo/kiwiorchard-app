/**
 * MapPage.jsx
 * Página contenedora del mapa de orchard.
 * Carga rowMap, rowToBlock y tasks desde Firestore.
 * Renderiza OrchardMap + BayPanel lateral.
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useFirestore } from "../hooks/useFirestore";
import { fetchTasks } from "../lib/firebase";
import OrchardMap from "../components/OrchardMap";
import BayPanel from "../components/BayPanel";
import { useLocation } from "react-router-dom";

export default function MapPage() {
    const location = useLocation();
    const { orchardId } = useParams();
    const { config, getOrchardMaps, loading: configLoading } = useFirestore();

    const [rowMap, setRowMap] = useState({});
    const [rowToBlock, setRowToBlock] = useState({});
    const [tasks, setTasks] = useState([]);
    const [mapLoading, setMapLoading] = useState(true);
    const [selectedBay, setSelectedBay] = useState(null); // { row_id, bay_number }

    const orchard = config?.orchards?.find(o => o.orchard_id === orchardId);

    useEffect(() => {
        if (location.state?.selectedBay) {
            setSelectedBay(location.state.selectedBay);
        }
    }, [location.state]);

    // Cargar rowMap + rowToBlock
    useEffect(() => {
        if (!config) return;
        setMapLoading(true);
        getOrchardMaps(orchardId)
            .then(({ rowMap, rowToBlock }) => {
                setRowMap(rowMap);
                setRowToBlock(rowToBlock);
            })
            .finally(() => setMapLoading(false));
    }, [orchardId, config]);

    // Cargar tasks
    useEffect(() => {
        if (!orchardId) return;
        fetchTasks(orchardId).then(setTasks).catch(console.error);
    }, [orchardId]);



    function handleTaskCreated(newTask) {
        setTasks(prev => [...prev, newTask]);
    }

    function handleTaskUpdated(taskId, updates) {
        setTasks(prev =>
            prev.map(t => t.id === taskId ? { ...t, ...updates } : t)
        );
    }

    function handleTaskDeleted(taskId) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    }

    if (configLoading || mapLoading) return <Spinner text="Cargando mapa…" />;

    return (
        <div style={{ display: "flex", height: "100%", minHeight: "calc(100vh - 49px)" }}>

            {/* Mapa principal */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                borderRight: selectedBay ? "1px solid #e5e7eb" : "none",
            }}>
                <OrchardMap
                    orchardId={orchardId}
                    rowMap={rowMap}
                    rowToBlock={rowToBlock}
                    tasks={tasks}
                    onBayClick={setSelectedBay}
                />
            </div>

            {/* BayPanel lateral */}
            {selectedBay && (
                <div style={{
                    width: 340,
                    flexShrink: 0,
                    overflowY: "auto",
                    background: "#fff",
                    position: "sticky",
                    top: 49,
                    height: "calc(100vh - 49px)",
                }}>
                    <BayPanel
                        orchardId={orchardId}
                        rowId={selectedBay.row_id}
                        bayNumber={selectedBay.bay_number}
                        tasks={tasks.filter(
                            t => t.row_id === selectedBay.row_id &&
                                t.bay_number === selectedBay.bay_number
                        )}
                        onClose={() => setSelectedBay(null)}
                        onTaskCreated={handleTaskCreated}
                        onTaskUpdated={handleTaskUpdated}
                        onTaskDeleted={handleTaskDeleted}
                    />
                </div>
            )}
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