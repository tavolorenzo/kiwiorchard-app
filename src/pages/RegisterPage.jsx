/**
 * RegisterPage.jsx v1.1
 * Usa orchardId desde la URL y carga rowMap + blockMap + rowToBlock.
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useFirestore } from "../hooks/useFirestore";
import { useJobs }    from "../lib/useJobs";
import JobForm        from "../components/JobForm";
import { ORCHARDS }   from "../components/Layout";

export default function RegisterPage() {
  const { orchardId }  = useParams();
  const { config, getBayRate, getOrchardMaps, loading, error } = useFirestore();
  const { jobs, addJob } = useJobs(orchardId);

  const [rowMap,     setRowMap]     = useState({});
  const [blockMap,   setBlockMap]   = useState({});
  const [rowToBlock, setRowToBlock] = useState({});
  const [mapLoading, setMapLoading] = useState(false);

  const activeOrchard = ORCHARDS.find(o => o.id === orchardId);
  const bayRate = config ? getBayRate(orchardId) : 0;
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
  if (error)   return <ErrMsg msg={error} />;

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
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
