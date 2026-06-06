import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const ROLE_COLORS = {
  admin: "#ef4444",
  manager: "#8b5cf6",
  developer: "#3b82f6",
  viewer: "#64748b",
};

const ROLE_ICONS = {
  admin: "👑",
  manager: "🎯",
  developer: "💻",
  viewer: "👁",
};

const NAV = [
  { to: "/dashboard", icon: "▣", label: "Dashboard", minRole: "viewer" },
  { to: "/tasks", icon: "✓", label: "Tasks", minRole: "viewer" },
  { to: "/board", icon: "⊞", label: "Board", minRole: "viewer" },
  { to: "/projects", icon: "◈", label: "Projects", minRole: "viewer" },
  { to: "/users", icon: "◎", label: "Users & Roles", permission: "manage:roles" },
];

const ROLE_RANK = { viewer: 0, developer: 1, manager: 2, admin: 3 };

export default function Layout() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const visibleNav = NAV.filter((item) => {
    if (item.permission) return can(item.permission);
    if (item.minRole) return ROLE_RANK[user?.role] >= ROLE_RANK[item.minRole];
    return true;
  });

  return (
    <div className="flex h-screen bg-[#060b14] text-slate-200 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-[220px] bg-[#0a0f1e] border-r border-slate-800 flex flex-col shrink-0">
        
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b border-slate-800">
          <div className="text-xl font-extrabold text-slate-100 font-sans">
            Task<span className="text-blue-500">Master</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-2.5 py-3 flex-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold font-sans mb-1 transition-all ${
                  isActive
                    ? "bg-blue-900/40 text-blue-300"
                    : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
                }`
              }
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Card */}
        <div className="px-4 py-3.5 border-t border-slate-800">
          
          <div className="flex items-center gap-2.5 mb-3">
            
            {/* Avatar */}
            <div
              className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{
                background: ROLE_COLORS[user?.role] || "#3b82f6",
              }}
            >
              {user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>

            {/* User Info */}
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-slate-200 truncate">
                {user?.name}
              </div>

              <span
                className="inline-block mt-1 px-1.5 py-[1px] rounded text-[10px] font-mono font-semibold uppercase"
                style={{
                  background: ROLE_COLORS[user?.role] + "22",
                  color: ROLE_COLORS[user?.role],
                  border: `1px solid ${ROLE_COLORS[user?.role]}44`,
                }}
              >
                {ROLE_ICONS[user?.role]} {user?.role}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full bg-slate-900 border border-slate-800 rounded-md py-1.5 text-slate-500 text-xs font-semibold hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}