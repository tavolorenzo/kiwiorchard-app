import { useState } from "react";
import { Outlet, NavLink, useNavigate, useParams, useLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardList, BarChart3, Map, CheckSquare, Menu, X, Settings } from "lucide-react";
import { useFirestore } from "../hooks/useFirestore";
import { useAuth } from "../hooks/useAuth";

const ORCHARDS = []; // Fallback deprecado
export { ORCHARDS };

export default function Layout() {

  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { orchardId } = useParams();
  const location = useLocation();  // reactivo — se actualiza con cada navegación

  const { getBayRate, config } = useFirestore();
  const { user, admin, logout } = useAuth();

  const orchards = config
    ? config.orchards.map(o => ({ id: o.orchard_id, name: o.name }))
    : [];

  // El orchard activo viene de la URL. Si no hay orchardId (ej: /all-orchards)
  // buscamos cuál coincide con el pathname para mantener el highlight correcto.
  const activeOrchardId = orchardId
    ?? orchards.find(o => location.pathname.includes(o.id))?.id
    ?? null;

  const isAllOrchards = location.pathname.includes("all-orchards");

  function goTo(path) {
    navigate(path);
    setOpen(false);
  }

  function handleOrchardClick(orchardId) {
    // Navegar siempre a la vista de registro del orchard clickeado
    navigate(`/register/${orchardId}`);
    setOpen(false);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* Mobile overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.3)", zIndex: 98,
          }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="sidebar-el"
        style={{
          width: 220, flexShrink: 0,
          background: "#fff",
          borderRight: "1px solid #e5e7eb",
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, bottom: 0, left: 0,
          overflowY: "auto", zIndex: 99,
          transform: open ? "translateX(0)" : "translateX(-220px)",
          transition: "transform .25s ease",
        }}
      >
        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 14px 14px",
          borderBottom: "1px solid #f3f4f6",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🌿</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
              KiwiOrchard
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#9ca3af", padding: 2, display: "flex"
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Vistas globales */}
        <div style={{ padding: "10px 0 4px", flexShrink: 0 }}>
          <SectionTitle>Vistas</SectionTitle>
          <SideNavItem
            icon={<BarChart3 size={14} />}
            label="Todos los orchards"
            active={isAllOrchards}
            onClick={() => goTo("/all-orchards")}
          />
          <SideNavItem
            icon={<Settings size={14} />}
            label="Configuración"
            active={location.pathname.includes("settings")}
            onClick={() => goTo("/settings")}
          />
        </div>

        {/* Lista de orchards */}
        <div style={{ padding: "4px 0", flex: 1 }}>
          <SectionTitle>Orchards</SectionTitle>
          {orchards.map(o => {
            const isActive = activeOrchardId === o.id;
            return (
              <div key={o.id}>
                {/* Fila del orchard — clickeable para navegar */}
                <button
                  onClick={() => handleOrchardClick(o.id)}
                  style={{
                    display: "flex", alignItems: "center",
                    width: "100%",
                    padding: "7px 14px",
                    background: isActive ? "#eff6ff" : "transparent",
                    borderLeft: isActive ? "2px solid #1d4ed8" : "2px solid transparent",
                    border: "none",
                    borderRight: "none",
                    borderTop: "none",
                    borderBottom: "none",
                    borderLeftWidth: 2,
                    borderLeftStyle: "solid",
                    borderLeftColor: isActive ? "#1d4ed8" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: isActive ? "#1d4ed8" : "#d1d5db",
                    flexShrink: 0, marginRight: 9,
                    transition: "background .15s",
                  }} />
                  <span style={{
                    fontSize: 13, flex: 1,
                    color: isActive ? "#1d4ed8" : "#374151",
                    fontWeight: isActive ? 500 : 400,
                  }}>
                    {o.name}
                  </span>
                  {isActive && config && getBayRate(o.id) > 0 && (
                    <span style={{ fontSize: 10, color: "#93c5fd" }}>
                      ${getBayRate(o.id)}
                    </span>
                  )}
                </button>

                {/* Sub-navegación — solo visible para el orchard activo */}
                {isActive && (
                  <div style={{ paddingLeft: 28, paddingBottom: 4 }}>
                    <SubNavItem
                      icon={<ClipboardList size={12} />}
                      label="Registrar"
                      to={`/register/${o.id}`}
                      onClick={() => setOpen(false)}
                    />
                    <SubNavItem
                      icon={<LayoutDashboard size={12} />}
                      label="Dashboard"
                      to={`/dashboard/${o.id}`}
                      onClick={() => setOpen(false)}
                    />
                    <SubNavItem
                      icon={<Map size={12} />}
                      label="Mapa"
                      to={`/map/${o.id}`}
                      onClick={() => setOpen(false)}
                    />
                    <SubNavItem
                      icon={<CheckSquare size={12} />}
                      label="Tasks"
                      to={`/tasks/${o.id}`}
                      onClick={() => setOpen(false)}
                    />
                    <SubNavItem
                      icon={<Settings size={12} />}
                      label="Orchard Settings"
                      to={`/orchard-settings/${o.id}`}
                      onClick={() => setOpen(false)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 14px",
          borderTop: "1px solid #f3f4f6",
          flexShrink: 0,
        }}>
          {config && (
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
              {config.orchards?.length ?? 0} orchards · {config.workers?.length ?? 0} workers
              {admin && (
                <span style={{
                  marginLeft: 6, fontSize: 9, padding: "1px 5px",
                  background: "#fef3c7", color: "#92400e",
                  borderRadius: 3, fontWeight: 600,
                }}>ADMIN</span>
              )}
            </div>
          )}
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {user.photoURL && (
                <img src={user.photoURL} alt="" style={{
                  width: 22, height: 22, borderRadius: "50%",
                }} />
              )}
              <span style={{
                fontSize: 11, color: "#374151",
                flex: 1, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {user.displayName ?? user.email}
              </span>
              <button onClick={logout} style={{
                fontSize: 10, padding: "2px 7px",
                border: "1px solid #e5e7eb", borderRadius: 4,
                background: "#fff", color: "#6b7280",
                cursor: "pointer", flexShrink: 0,
              }}>
                Salir
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex", flexDirection: "column",
        minWidth: 0,
      }}>
        {/* Topbar */}
        <div style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 12,
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <button
            onClick={() => setOpen(true)}
            className="menu-toggle-btn"
            style={{
              background: "none", border: "1px solid #e5e7eb",
              borderRadius: 6, padding: "5px 8px",
              cursor: "pointer", color: "#374151",
              display: "flex", alignItems: "center",
            }}
          >
            <Menu size={16} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
            KiwiOrchard Management
          </span>
        </div>

        {/* Página activa */}
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </div>

      {/* Sidebar siempre visible en desktop y ocultar botón de menú */}
      <style>{`
        @media (min-width: 768px) {
          .sidebar-el {
            transform: translateX(0) !important;
            position: sticky !important;
            height: 100vh !important;
          }
          .menu-toggle-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, textTransform: "uppercase",
      letterSpacing: ".07em", color: "#9ca3af",
      padding: "2px 14px 6px",
    }}>
      {children}
    </div>
  );
}

function SideNavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        width: "100%", padding: "7px 14px",
        background: active ? "#eff6ff" : "none",
        border: "none",
        borderLeft: `2px solid ${active ? "#1d4ed8" : "transparent"}`,
        cursor: "pointer", fontSize: 13,
        color: active ? "#1d4ed8" : "#374151",
        fontWeight: active ? 500 : 400,
        textAlign: "left",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function SubNavItem({ icon, label, to, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 8px",
        fontSize: 12,
        color: isActive ? "#1d4ed8" : "#6b7280",
        fontWeight: isActive ? 500 : 400,
        textDecoration: "none",
        borderRadius: 4,
        background: isActive ? "#dbeafe" : "transparent",
        margin: "1px 4px 1px 0",
      })}
    >
      {icon}
      {label}
    </NavLink>
  );
}
