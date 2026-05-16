import { useState } from "react";
import { Outlet, NavLink, useNavigate, useParams } from "react-router-dom";
import { LayoutDashboard, ClipboardList, BarChart3, Menu, X } from "lucide-react";
import { useSheets } from "../hooks/useSheets";

const ORCHARDS = [
  { id: "cas", name: "Casuarina"    },
  { id: "bro", name: "Brown Rabbit" },
  { id: "gra", name: "Grasshopper"  },
  { id: "jam", name: "JAM"          },
  { id: "mar", name: "Marshall"     },
  { id: "oce", name: "Oceanview"    },
  { id: "web", name: "Webb"         },
  { id: "whi", name: "White House"  },
];

export { ORCHARDS };

export default function Layout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const params   = useParams();
  const activeOrchardId = params.orchardId ?? "cas";

  const { getBayRate, config } = useSheets();

  function goTo(path) {
    navigate(path);
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

      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid #e5e7eb",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, bottom: 0, left: 0,
        overflowY: "auto", zIndex: 99,
        transform: open ? "translateX(0)" : "translateX(-220px)",
        transition: "transform .25s ease",
      }}
      className="sidebar-el"
      >
        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 14px 14px",
          borderBottom: "1px solid #f3f4f6",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🌿</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
              KiwiOrchard
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer",
                     color: "#9ca3af", padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Global nav */}
        <div style={{ padding: "10px 0 6px" }}>
          <SectionTitle>Vistas</SectionTitle>
          <SideNavItem
            icon={<BarChart3 size={14} />}
            label="Todos los orchards"
            active={window.location.pathname.includes("all-orchards")}
            onClick={() => goTo("/all-orchards")}
          />
        </div>

        {/* Orchards */}
        <div style={{ padding: "6px 0", flex: 1 }}>
          <SectionTitle>Orchards</SectionTitle>
          {ORCHARDS.map(o => {
            const isActive = activeOrchardId === o.id;
            const rate = config ? getBayRate(o.id) : 0;
            return (
              <div key={o.id}>
                <div
                  style={{
                    display: "flex", alignItems: "center",
                    padding: "6px 14px",
                    background: isActive ? "#eff6ff" : "transparent",
                    borderLeft: isActive ? "2px solid #1d4ed8" : "2px solid transparent",
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: isActive ? "#1d4ed8" : "#d1d5db",
                    flexShrink: 0, marginRight: 8,
                  }} />
                  <span style={{
                    fontSize: 13, flex: 1,
                    color: isActive ? "#1d4ed8" : "#374151",
                    fontWeight: isActive ? 500 : 400,
                  }}>
                    {o.name}
                  </span>
                </div>
                {isActive && (
                  <div style={{ paddingLeft: 22 }}>
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
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {config && (
          <div style={{
            padding: "10px 14px",
            borderTop: "1px solid #f3f4f6",
            fontSize: 11, color: "#9ca3af",
          }}>
            {config.orchards?.length ?? 0} orchards · {config.workers?.length ?? 0} workers
          </div>
        )}
      </aside>

      {/* Main content */}
      <div style={{
        flex: 1,
        marginLeft: 0,
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

        {/* Page content */}
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .sidebar-el {
            transform: translateX(0) !important;
            position: sticky !important;
            height: 100vh !important;
          }
          .sidebar-el + div { margin-left: 0; }
        }
      `}</style>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, textTransform: "uppercase",
      letterSpacing: ".07em", color: "#9ca3af",
      padding: "2px 14px 4px",
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
        border: "none", borderLeft: active ? "2px solid #1d4ed8" : "2px solid transparent",
        cursor: "pointer", fontSize: 13,
        color: active ? "#1d4ed8" : "#374151",
        fontWeight: active ? 500 : 400,
        textAlign: "left",
      }}
    >
      {icon}{label}
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
        padding: "5px 10px",
        fontSize: 12,
        color: isActive ? "#1d4ed8" : "#6b7280",
        fontWeight: isActive ? 500 : 400,
        textDecoration: "none",
        borderRadius: 4,
        background: isActive ? "#dbeafe" : "transparent",
        margin: "1px 6px 1px 0",
      })}
    >
      {icon}{label}
    </NavLink>
  );
}
