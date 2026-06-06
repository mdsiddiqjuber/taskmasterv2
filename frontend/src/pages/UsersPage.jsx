import { useUsers } from "../hooks/useData";
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

const ROLES = ["admin", "manager", "developer", "viewer"];

const PERMISSIONS_MAP = {
  admin: ["create:user","delete:user","manage:roles","create:project","delete:project","create:task","delete:task","assign:task","view:all","update:any"],
  manager: ["create:project","create:task","delete:task","assign:task","view:project","update:task","view:team"],
  developer: ["view:assigned","update:assigned","comment:task"],
  viewer: ["view:assigned"],
};

const Badge = ({ label, color, icon }) => (
  <span
    className="px-2 py-[2px] rounded text-[11px] font-mono font-semibold uppercase whitespace-nowrap"
    style={{
      background: color + "22",
      color,
      border: `1px solid ${color}44`,
    }}
  >
    {icon && `${icon} `}{label}
  </span>
);

export default function UsersPage() {
  const { data: users, loading, updateRole, deactivate } = useUsers();
  const { user: currentUser, can } = useAuth();

  const handleRoleChange = async (id, role) => {
    await updateRole(id, role);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Deactivate this user?")) return;
    await deactivate(id);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="px-7 py-[18px] border-b border-slate-800 bg-[#0a0f1e] shrink-0">
        <h1 className="text-xl font-bold text-slate-100 font-sans">
          Users & Roles
        </h1>
        <div className="text-[11px] font-mono text-slate-600 mt-1">
          RBAC role management · {users.length} users
        </div>
      </div>

      {/* Legend */}
      <div className="px-7 py-3 border-b border-slate-800 bg-[#060b14] flex gap-5 overflow-x-auto">
        {ROLES.map((role) => (
          <div key={role} className="flex items-center gap-2 shrink-0">
            <Badge
              label={role}
              color={ROLE_COLORS[role]}
              icon={ROLE_ICONS[role]}
            />
            <span className="text-[10px] font-mono text-slate-600">
              {PERMISSIONS_MAP[role].length} permissions
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-7 py-5">
        {loading ? (
          <div className="font-mono text-sm text-slate-600">
            Loading users...
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            
            {/* Header Row */}
            <div className="grid grid-cols-[1.5fr_110px_1fr_80px_200px] gap-3 px-4 py-2">
              {["USER","ROLE","PERMISSIONS","STATUS","ACTIONS"].map((h) => (
                <div
                  key={h}
                  className="text-[10px] font-mono text-slate-600 uppercase tracking-widest"
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {users.map((u) => (
              <div
                key={u._id}
                className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 grid grid-cols-[1.5fr_110px_1fr_80px_200px] gap-3 items-center"
              >
                
                {/* User */}
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: ROLE_COLORS[u.role] }}
                  >
                    {u.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>

                  <div className="overflow-hidden">
                    <div className="text-sm font-semibold text-slate-200 truncate">
                      {u.name}
                    </div>
                    <div className="text-xs font-mono text-slate-500 truncate">
                      {u.email}
                    </div>
                  </div>
                </div>

                {/* Role */}
                <Badge
                  label={u.role}
                  color={ROLE_COLORS[u.role]}
                  icon={ROLE_ICONS[u.role]}
                />

                {/* Permissions */}
                <div className="flex flex-wrap gap-1">
                  {(PERMISSIONS_MAP[u.role] || []).slice(0, 3).map((p) => (
                    <span
                      key={p}
                      className="text-[10px] font-mono text-slate-500 bg-[#0a0f1e] border border-slate-800 rounded px-1.5 py-[1px]"
                    >
                      {p}
                    </span>
                  ))}

                  {(PERMISSIONS_MAP[u.role] || []).length > 3 && (
                    <span className="text-[10px] text-blue-500 font-mono">
                      +{PERMISSIONS_MAP[u.role].length - 3}
                    </span>
                  )}
                </div>

                {/* Status */}
                <span
                  className={`text-xs font-mono ${
                    u.isActive ? "text-green-500" : "text-red-500"
                  }`}
                >
                  ● {u.isActive ? "Active" : "Inactive"}
                </span>

                {/* Actions */}
                <div className="flex gap-1.5 items-center">
                  {can("manage:roles") && u._id !== currentUser?._id ? (
                    <>
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u._id, e.target.value)
                        }
                        className="bg-[#0a0f1e] border rounded px-2 py-1 text-xs font-mono cursor-pointer outline-none"
                        style={{
                          borderColor: ROLE_COLORS[u.role] + "55",
                          color: ROLE_COLORS[u.role],
                        }}
                      >
                        {ROLES.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>

                      {u.isActive && (
                        <button
                          onClick={() => handleDeactivate(u._id)}
                          className="bg-red-900/30 border border-red-500/20 text-red-500 text-xs px-2 py-1 rounded"
                        >
                          ✕
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-800 font-mono">
                      {u._id === currentUser?._id ? "(you)" : "—"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}