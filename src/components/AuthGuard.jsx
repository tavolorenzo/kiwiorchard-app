/**
 * AuthGuard.jsx
 * Protege las rutas — redirige al login si no hay sesión.
 * Muestra el rol del usuario (admin vs usuario normal).
 */

import { useAuth } from "../hooks/useAuth";

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

  return children;
}
