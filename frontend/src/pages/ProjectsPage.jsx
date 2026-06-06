import { useState, useMemo } from "react";
import { useProjects, useUsers } from "../hooks/useData";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/ToastContext";
import { PermissionGate } from "../components/ProtectedRoute";

const STATUS_COLORS = {
  active: "#10b981",
  on_hold: "#f59e0b",
  completed: "#3b82f6",
  archived: "#64748b",
};

const ROLE_COLORS = {
  admin: "#ef4444",
  manager: "#8b5cf6",
  developer: "#3b82f6",
  viewer: "#64748b",
};

const PROJECT_ICONS = ["📋", "📊", "💳", "🤖", "🚀", "🔧", "🎯", "💡", "🔐", "🌐"];
const PRESET_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4"];

// Project-level roles a member can be assigned
const MEMBER_ROLES = [
  { value: "developer", label: "Developer", description: "Can work on assigned tasks" },
  { value: "viewer",    label: "Viewer",    description: "Read-only access" },
];

const inputCls =
  "w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors";

const Label = ({ children }) => (
  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
    {children}
  </label>
);

export default function ProjectsPage() {
  const { projects, loading, createProject } = useProjects();
  const { data: allUsers, loading: usersLoading } = useUsers();
  const { can, user: currentUser } = useAuth();
  const toast = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const EMPTY_FORM = {
    name: "",
    description: "",
    color: "#3b82f6",
    icon: "📋",
    isPublic: false,
    startDate: "",
    endDate: "",
    // members: [{ userId, role }]
    members: [],
  };
  const [form, setForm] = useState(EMPTY_FORM);

  // ─── Member helpers ───────────────────────────────────────────────────────
  // Exclude the current user (they become owner automatically) and filter by search
  const pickableUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (u._id === currentUser?._id) return false; // owner is added automatically
      if (!u.isActive) return false;
      if (!memberSearch.trim()) return true;
      const q = memberSearch.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [allUsers, currentUser, memberSearch]);

  const getMemberEntry = (userId) => form.members.find((m) => m.userId === userId);
  const isSelected = (userId) => !!getMemberEntry(userId);

  const toggleMember = (userId) => {
    setForm((f) => {
      if (isSelected(userId)) {
        return { ...f, members: f.members.filter((m) => m.userId !== userId) };
      }
      return { ...f, members: [...f.members, { userId, role: "developer" }] };
    });
  };

  const setMemberRole = (userId, role) => {
    setForm((f) => ({
      ...f,
      members: f.members.map((m) => (m.userId === userId ? { ...m, role } : m)),
    }));
  };

  // ─── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast("Project name is required", "error");
      return;
    }
    setCreating(true);
    try {
      await createProject({
        name:        form.name.trim(),
        description: form.description.trim(),
        color:       form.color,
        icon:        form.icon,
        isPublic:    form.isPublic,
        startDate:   form.startDate || undefined,
        endDate:     form.endDate || undefined,
        // Send members as [{ user: id, role }] matching the Project schema
        members:     form.members.map((m) => ({ user: m.userId, role: m.role })),
      });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setMemberSearch("");
      toast("Project created!", "success");
    } catch (err) {
      toast(err?.response?.data?.message || "Failed to create project", "error");
    } finally {
      setCreating(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-7 py-[18px] border-b border-slate-800 bg-[#0a0f1e] flex justify-between items-center shrink-0">
        <div>
          <h1 className="font-sans text-xl font-bold text-slate-100">Projects</h1>
          <div className="font-mono text-[11px] text-slate-600 mt-0.5">
            {projects.length} active workspaces
          </div>
        </div>
        <PermissionGate permission="create:project">
          <button
            onClick={() => { setForm(EMPTY_FORM); setMemberSearch(""); setShowCreate(true); }}
            className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-lg px-4 py-2 text-white text-sm font-bold"
          >
            + New Project
          </button>
        </PermissionGate>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-7 py-6">
        {loading ? (
          <div className="font-mono text-sm text-slate-600">Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-slate-500 text-base mb-2">No projects yet.</div>
            {can("create:project") && (
              <div className="text-slate-700 text-sm font-mono">Click "+ New Project" to get started.</div>
            )}
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {projects.map((p) => (
              <div
                key={p._id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:-translate-y-0.5 transition-all"
                style={{ borderTop: `4px solid ${p.color || "#3b82f6"}` }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="text-3xl leading-none">{p.icon}</div>
                  <span
                    className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded"
                    style={{
                      background: STATUS_COLORS[p.status] + "22",
                      color: STATUS_COLORS[p.status],
                      border: `1px solid ${STATUS_COLORS[p.status]}44`,
                    }}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="font-sans text-base font-bold text-slate-100 mb-1">{p.name}</div>
                <div className="text-sm text-slate-500 leading-relaxed mb-4 min-h-[40px]">
                  {p.description}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                  <div className="font-mono text-[11px] text-slate-500">
                    👥 {p.memberCount ?? p.members?.length ?? 0} members
                  </div>
                  <div className="font-mono text-[11px] text-slate-600">
                    {p.owner?.name?.split(" ")[0] || "—"}
                  </div>
                </div>

                {/* Member avatars */}
                {p.members?.length > 0 && (
                  <div className="flex mt-3">
                    {p.members.slice(0, 5).map((m, i) => (
                      <div
                        key={m.user?._id || i}
                        title={m.user?.name}
                        className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-white"
                        style={{
                          marginLeft: i > 0 ? -8 : 0,
                          background: ROLE_COLORS[m.user?.role] || "#3b82f6",
                        }}
                      >
                        {m.user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                    ))}
                    {p.members.length > 5 && (
                      <div
                        className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-400"
                        style={{ marginLeft: -8 }}
                      >
                        +{p.members.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Project Modal ── */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-5"
          onClick={() => setShowCreate(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0f1e] border border-slate-800 rounded-2xl w-full max-w-[620px] shadow-2xl flex flex-col max-h-[92vh]"
          >
            {/* Modal header */}
            <div className="flex justify-between items-center px-7 pt-7 pb-4 shrink-0">
              <h2 className="font-sans text-lg font-bold text-slate-100">New Project</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-slate-500 hover:text-slate-300 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-7 pb-2 flex flex-col gap-5">

              {/* Name */}
              <div>
                <Label>Project Name *</Label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Payment Gateway"
                  className={inputCls}
                />
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What is this project about?"
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Icon + Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Icon</Label>
                  <div className="flex gap-2 flex-wrap">
                    {PROJECT_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, icon }))}
                        className={`text-xl px-2.5 py-1.5 rounded-lg border transition-all ${
                          form.icon === icon
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-slate-800 bg-slate-900 hover:border-slate-700"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Colour</Label>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, color }))}
                        className="rounded-full transition-all"
                        style={{
                          width: 28,
                          height: 28,
                          background: color,
                          border: form.color === color ? "3px solid #fff" : "3px solid transparent",
                          outline: form.color === color ? `2px solid ${color}` : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className={`${inputCls} [color-scheme:dark]`}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className={`${inputCls} [color-scheme:dark]`}
                  />
                </div>
              </div>

              {/* Public toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setForm((f) => ({ ...f, isPublic: !f.isPublic }))}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    form.isPublic ? "bg-blue-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      form.isPublic ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-300">Public project</div>
                  <div className="text-xs text-slate-500">Visible to all users in your organisation</div>
                </div>
              </label>

              {/* ── Member Picker ── */}
              <div>
                <Label>
                  Add Members
                  {form.members.length > 0 && (
                    <span className="ml-2 text-blue-400 normal-case tracking-normal font-normal">
                      {form.members.length} added
                    </span>
                  )}
                </Label>

                {/* Search */}
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className={`${inputCls} mb-2`}
                />

                {usersLoading ? (
                  <div className="font-mono text-xs text-slate-600 py-2">Loading users…</div>
                ) : pickableUsers.length === 0 ? (
                  <div className="font-mono text-xs text-slate-600 py-2">No users found</div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {pickableUsers.map((u) => {
                      const selected = isSelected(u._id);
                      const memberEntry = getMemberEntry(u._id);

                      return (
                        <div
                          key={u._id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                            selected
                              ? "bg-blue-500/10 border-blue-500/40"
                              : "bg-slate-900 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleMember(u._id)}
                            className={`w-5 h-5 rounded border shrink-0 flex items-center justify-center text-xs transition-colors ${
                              selected
                                ? "bg-blue-500 border-blue-500 text-white"
                                : "border-slate-600"
                            }`}
                          >
                            {selected && "✓"}
                          </button>

                          {/* Avatar */}
                          <div
                            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
                            style={{ background: ROLE_COLORS[u.role] || "#3b82f6" }}
                          >
                            {u.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>

                          {/* Name + email */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-200 truncate">
                              {u.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">
                              {u.email} · {u.role}
                            </div>
                          </div>

                          {/* Project-role selector — only shown when selected */}
                          {selected && (
                            <select
                              value={memberEntry.role}
                              onChange={(e) => setMemberRole(u._id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-[11px] font-mono text-slate-300 outline-none cursor-pointer shrink-0"
                            >
                              {MEMBER_ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Selected summary */}
                {form.members.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.members.map((m) => {
                      const u = allUsers.find((u) => u._id === m.userId);
                      if (!u) return null;
                      return (
                        <span
                          key={m.userId}
                          className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full pl-1 pr-2 py-0.5 text-xs text-slate-300"
                        >
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                            style={{ background: ROLE_COLORS[u.role] || "#3b82f6" }}
                          >
                            {u.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          {u.name.split(" ")[0]}
                          <span className="font-mono text-[10px] text-slate-500">· {m.role}</span>
                          <button
                            type="button"
                            onClick={() => toggleMember(m.userId)}
                            className="text-slate-600 hover:text-slate-400 leading-none ml-0.5"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex gap-3 px-7 py-5 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg py-2.5 text-slate-400 text-sm font-semibold hover:border-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim()}
                className="flex-[2] bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-bold transition-colors"
              >
                {creating
                  ? "Creating…"
                  : `${form.icon} Create Project${form.members.length > 0 ? ` · ${form.members.length} member${form.members.length > 1 ? "s" : ""}` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
