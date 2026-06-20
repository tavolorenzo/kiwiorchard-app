/**
 * AuthGuard.jsx
 * Protege las rutas — redirige al login si no hay sesión.
 * Muestra el rol del usuario (admin vs usuario normal).
 */

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { copyOrchard } from "../lib/firebase";

export default function AuthGuard({ children }) {
  const { user, loading, admin, login } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: "100vh", gap: 12,
        fontFamily: "system-ui, sans-serif",
        color: "#6b7280", fontSize: 13,
      }}>
        <div style={{
          width: 24, height: 24,
          border: "2px solid #e5e7eb",
          borderTopColor: "#2563eb",
          borderRadius: "50%",
          animation: "spin .7s linear infinite",
        }} />
        Verificando sesión…
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: "100vh", gap: 20,
        fontFamily: "system-ui, sans-serif",
        background: "#f8fafc",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌿</div>
          <h1 style={{
            fontSize: 22, fontWeight: 700,
            color: "#111827", margin: 0,
          }}>
            KiwiOrchard Management
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "6px 0 0" }}>
            Sistema de gestión de poda de invierno
          </p>
        </div>

        {/* Login card */}
        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "28px 32px",
          width: "100%", maxWidth: 360,
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 16,
        }}>
          <p style={{
            fontSize: 14, color: "#374151",
            margin: 0, textAlign: "center",
          }}>
            Iniciá sesión para acceder al sistema
          </p>

          <button
            onClick={login}
            style={{
              display: "flex", alignItems: "center",
              gap: 10, width: "100%",
              padding: "10px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "#fff", cursor: "pointer",
              fontSize: 14, fontWeight: 500,
              color: "#374151",
              transition: "background .15s, box-shadow .15s",
            }}
            onMouseEnter={e => e.target.style.background = "#f9fafb"}
            onMouseLeave={e => e.target.style.background = "#fff"}
          >
            {/* Google logo SVG */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continuar con Google
          </button>

          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, textAlign: "center" }}>
            Solo cuentas autorizadas pueden acceder.
            <br />Contactá al administrador si no podés ingresar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {admin && <AdminTestConsole />}
    </>
  );
}

function AdminTestConsole() {
  const [open, setOpen] = useState(false);
  const [srcId, setSrcId] = useState("");
  const [destId, setDestId] = useState("");
  const [status, setStatus] = useState("idle"); // idle | copying | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleCopy = async () => {
    if (!srcId.trim() || !destId.trim()) {
      setErrorMsg("Completa ambos IDs");
      setStatus("error");
      return;
    }
    setStatus("copying");
    setErrorMsg("");
    try {
      await copyOrchard(srcId.trim(), destId.trim());
      setStatus("success");
      setSrcId("");
      setDestId("");
      setTimeout(() => setStatus("idle"), 5000);
    } catch (e) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 99999,
          background: "#1e293b",
          color: "#fff",
          border: "none",
          borderRadius: 30,
          padding: "8px 16px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        ⚙️ Admin Test Panel
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 99999,
        background: "#fff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        width: 280,
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>⚙️ Admin Test Console</span>
        <button
          onClick={() => setOpen(false)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 14 }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#64748b", display: "block", marginBottom: 3 }}>
            Orchard de origen ID
          </label>
          <input
            placeholder="cas"
            value={srcId}
            onChange={e => setSrcId(e.target.value)}
            style={{
              width: "100%",
              fontSize: 12,
              padding: "6px 8px",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#64748b", display: "block", marginBottom: 3 }}>
            Nuevo Orchard ID
          </label>
          <input
            placeholder="cas-copia"
            value={destId}
            onChange={e => setDestId(e.target.value)}
            style={{
              width: "100%",
              fontSize: 12,
              padding: "6px 8px",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        <button
          onClick={handleCopy}
          disabled={status === "copying"}
          style={{
            background: status === "copying" ? "#94a3b8" : "#1d4ed8",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 500,
            cursor: status === "copying" ? "not-allowed" : "pointer",
            marginTop: 4,
            textAlign: "center",
          }}
        >
          {status === "copying" ? "Copiando..." : "Copiar Orchard"}
        </button>

        {status === "success" && (
          <div style={{ fontSize: 11, color: "#15803d", fontWeight: 500, marginTop: 4 }}>
            ✓ Orchard copiado correctamente.
          </div>
        )}
        {status === "error" && (
          <div style={{ fontSize: 11, color: "#b91c1c", fontWeight: 500, marginTop: 4, wordBreak: "break-word" }}>
            ✗ {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
