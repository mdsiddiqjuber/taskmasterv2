import { useState, useMemo } from "react";
import { useTasks, useProjects } from "../hooks/useData";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/ToastContext";
import { PermissionGate } from "../components/ProtectedRoute";
import TaskDetailModal from "../components/TaskDetailModal";

const STATUS_LABELS = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  backlog: "#64748b",
  todo: "#3b82f6",
  in_progress: "#f59e0b",
  in_review: "#8b5cf6",
  done: "#10b981",
  cancelled: "#ef4444",
};

const PRIORITY_COLORS = {
  low: "#64748b",
  medium: "#3b82f6",
  high: "#f59e0b",
  critical: "#ef4444",
};

const ROLE_COLORS = {
  admin: "#ef4444",
  manager: "#8b5cf6",
  developer: "#3b82f6",
  viewer: "#64748b",
};

const Badge = ({ label, color }) => (
  <span
    className="px-2 py-[2px] rounded text-[11px] font-mono font-semibold uppercase whitespace-nowrap"
    style={{ background: color + "22", color, border: `1px solid ${color}44` }}
  >
    {label}
  </span>
);

const inputCls =
  "w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors";

const Label = ({ children }) => (
  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
    {children}
  </label>
);

const UserAvatar = ({ user, size = 28, showName = false }) => {
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.33,
          background: ROLE_COLORS[user?.role] || "#3b82f6",
        }}
      >
        {initials}
      </div>
      {showName && (
        <div>
          <div className="text-sm text-slate-200 font-semibold leading-none">
            {user?.name}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {user?.role}
          </div>
        </div>
      )}
    </div>
  );
};

export default function TasksPage() {
  // eslint-disable-next-line no-unused-vars
  const { can } = useAuth();
  const toast = useToast();
  const { projects } = useProjects();

  const {
    data: tasks,
    loading,
    pagination,
    updateParams,
    goToPage,
    updateTask,
    createTask,
    deleteTask,
  } = useTasks();

  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    project: "",
    search: "",
  });

  const EMPTY_TASK = {
    title: "",
    description: "",
    priority: "medium",
    project: "",
    assignees: [],   // array of user _id strings
    dueDate: "",
    estimatedHours: "",
    tags: "",
  };
  const [newTask, setNewTask] = useState(EMPTY_TASK);

  // ─── Derive assignable members from selected project ───────────────────────
  // Projects come back with members[].user populated (name, email, role).
  // We also include the project owner. Viewers are excluded from assignment.
  const assignableMembers = useMemo(() => {
    if (!newTask.project) return [];
    const proj = projects.find((p) => p._id === newTask.project);
    if (!proj) return [];

    const seen = new Set();
    const members = [];

    // Owner
    if (proj.owner && typeof proj.owner === "object") {
      seen.add(proj.owner._id);
      if (proj.owner.role !== "viewer") members.push(proj.owner);
    }

    // Members
    (proj.members || []).forEach((m) => {
      const u = m.user;
      if (!u || seen.has(u._id)) return;
      if (m.role === "viewer") return; // viewers can't be assigned tasks
      seen.add(u._id);
      members.push(u);
    });

    return members;
  }, [newTask.project, projects]);

  const toggleAssignee = (userId) => {
    setNewTask((n) => ({
      ...n,
      assignees: n.assignees.includes(userId)
        ? n.assignees.filter((id) => id !== userId)
        : [...n.assignees, userId],
    }));
  };

  // ─── Filters ───────────────────────────────────────────────────────────────
  const applyFilter = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    const params = {};
    Object.entries(updated).forEach(([k, v]) => { if (v) params[k] = v; });
    updateParams(params);
  };

  const clearFilters = () => {
    setFilters({ status: "", priority: "", project: "", search: "" });
    updateParams({});
  };

  const hasFilters =
    filters.status || filters.priority || filters.project || filters.search;

  // ─── Create ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setNewTask(EMPTY_TASK);
    setFormError("");
    setShowCreate(true);
  };

  const handleCreate = async () => {
    setFormError("");
    if (!newTask.title.trim()) {
      setFormError("Task title is required.");
      return;
    }
    if (!newTask.project) {
      setFormError("Please select a project.");
      return;
    }

    setCreating(true);
    try {
      await createTask({
        title:          newTask.title.trim(),
        description:    newTask.description.trim(),
        priority:       newTask.priority,
        project:        newTask.project,
        assignees:      newTask.assignees,
        dueDate:        newTask.dueDate || undefined,
        estimatedHours: Number(newTask.estimatedHours) || 0,
        tags:           newTask.tags
          ? newTask.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
      });
      setShowCreate(false);
      setNewTask(EMPTY_TASK);
      toast("Task created!", "success");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to create task.";
      setFormError(msg);
      toast(msg, "error");
    } finally {
      setCreating(false);
    }
  };

  // ─── Update / Delete ───────────────────────────────────────────────────────
  const handleUpdate = async (id, updates) => {
    const updated = await updateTask(id, updates);
    if (selectedTask?._id === id) setSelectedTask(updated);
    return updated;
  };

  const handleDelete = async (id) => {
    await deleteTask(id);
    setSelectedTask(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="px-7 py-[18px] border-b border-slate-800 bg-[#0a0f1e] flex justify-between items-center shrink-0">
        <div>
          <h1 className="font-sans text-xl font-bold text-slate-100">Tasks</h1>
          <div className="font-mono text-[11px] text-slate-600 mt-0.5">
            {pagination.total} total · page {pagination.page} /{" "}
            {pagination.pages || 1}
          </div>
        </div>
        <PermissionGate permission="create:task">
          <button
            onClick={openCreate}
            className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-lg px-4 py-2 text-white text-sm font-bold"
          >
            + New Task
          </button>
        </PermissionGate>
      </div>

      {/* ── Filters ── */}
      <div className="px-7 py-3 border-b border-slate-800 bg-[#0a0f1e] flex gap-2.5 flex-wrap shrink-0">
        <input
          value={filters.search}
          onChange={(e) => applyFilter("search", e.target.value)}
          placeholder="🔍  Search tasks…"
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none focus:border-blue-500 w-56"
        />
        <select
          value={filters.status}
          onChange={(e) => applyFilter("status", e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none cursor-pointer"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => applyFilter("priority", e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none cursor-pointer"
        >
          <option value="">All Priorities</option>
          {["low", "medium", "high", "critical"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={filters.project}
          onChange={(e) => applyFilter("project", e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none cursor-pointer"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.icon} {p.name}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="border border-slate-700 rounded-lg px-3 py-2 text-slate-500 text-xs hover:border-slate-600 hover:text-slate-400 transition-colors"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Task List ── */}
      <div className="flex-1 overflow-auto px-7 py-5">
        {loading ? (
          <div className="font-mono text-sm text-slate-600 p-5">Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-slate-500 font-sans text-base mb-2">No tasks found</div>
            <div className="text-slate-700 text-sm font-mono">Try adjusting your filters</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {tasks.map((task) => {
              const isOverdue =
                task.dueDate &&
                task.status !== "done" &&
                new Date() > new Date(task.dueDate);
              const pct =
                task.estimatedHours > 0
                  ? Math.min((task.loggedHours / task.estimatedHours) * 100, 100)
                  : 0;

              return (
                <div
                  key={task._id}
                  onClick={() => setSelectedTask(task)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 cursor-pointer hover:border-slate-700 hover:-translate-y-px transition-all"
                  style={{ borderLeft: `3px solid ${task.project?.color || "#3b82f6"}` }}
                >
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="font-sans text-sm font-semibold text-slate-200 flex-1 leading-snug">
                      {task.title}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Badge label={task.priority} color={PRIORITY_COLORS[task.priority]} />
                      <Badge label={STATUS_LABELS[task.status]} color={STATUS_COLORS[task.status]} />
                    </div>
                  </div>

                  {task.description && (
                    <div className="text-xs text-slate-500 mb-2.5 leading-relaxed line-clamp-2">
                      {task.description}
                    </div>
                  )}

                  {task.tags?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-2.5">
                      {task.tags.map((tag) => (
                        <span key={tag} className="bg-slate-800 text-slate-500 text-[11px] font-mono px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                      {task.assignees?.length > 0 && (
                        <div className="flex">
                          {task.assignees.slice(0, 3).map((a, i) => (
                            <div
                              key={a._id || i}
                              title={typeof a === "object" ? a.name : ""}
                              className="w-5 h-5 rounded-full bg-blue-500 border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-white"
                              style={{ marginLeft: i > 0 ? -6 : 0 }}
                            >
                              {(typeof a === "object" ? a.name : "?")
                                ?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                          ))}
                          {task.assignees.length > 3 && (
                            <div className="w-5 h-5 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-400" style={{ marginLeft: -6 }}>
                              +{task.assignees.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                      <span>{task.project?.icon} {task.project?.name}</span>
                      {task.dueDate && (
                        <span className={isOverdue ? "text-red-500" : ""}>
                          {isOverdue ? "⚠ " : "📅 "}{task.dueDate.split("T")[0]}
                        </span>
                      )}
                    </div>

                    {task.estimatedHours > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1 bg-slate-800 rounded overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${pct}%`,
                              background: task.loggedHours > task.estimatedHours ? "#ef4444" : "#10b981",
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-600">
                          {task.loggedHours}h/{task.estimatedHours}h
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded text-xs text-slate-500 disabled:opacity-40"
            >
              ← Prev
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-1.5 rounded text-xs font-mono ${
                  page === pagination.page
                    ? "bg-blue-500 text-white font-bold"
                    : "bg-slate-900 border border-slate-800 text-slate-500"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded text-xs text-slate-500 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Task Detail Modal ── */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {/* ── Create Task Modal ── */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-5"
          onClick={() => setShowCreate(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0f1e] border border-slate-800 rounded-2xl p-7 w-full max-w-[560px] shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-sans text-lg font-bold text-slate-100">New Task</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-slate-500 hover:text-slate-300 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Error */}
            {formError && (
              <div className="bg-red-950 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-400 text-sm font-mono mb-5">
                ⚠ {formError}
              </div>
            )}

            <div className="flex flex-col gap-4">

              {/* Title */}
              <div>
                <Label>Title *</Label>
                <input
                  autoFocus
                  value={newTask.title}
                  onChange={(e) => setNewTask((n) => ({ ...n, title: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="What needs to be done?"
                  className={inputCls}
                />
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <textarea
                  rows={3}
                  value={newTask.description}
                  onChange={(e) => setNewTask((n) => ({ ...n, description: e.target.value }))}
                  placeholder="Add more context…"
                  className={`${inputCls} resize-y`}
                />
              </div>

              {/* Project + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Project *</Label>
                  <select
                    value={newTask.project}
                    onChange={(e) =>
                      // clear assignees when project changes
                      setNewTask((n) => ({ ...n, project: e.target.value, assignees: [] }))
                    }
                    className={`${inputCls} cursor-pointer`}
                  >
                    <option value="">Select a project…</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.icon} {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask((n) => ({ ...n, priority: e.target.value }))}
                    className={`${inputCls} cursor-pointer`}
                    style={{ color: PRIORITY_COLORS[newTask.priority] }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Assignees — shown only after a project is selected */}
              <div>
                <Label>
                  Assignees
                  {newTask.assignees.length > 0 && (
                    <span className="ml-2 text-blue-400 normal-case tracking-normal">
                      ({newTask.assignees.length} selected)
                    </span>
                  )}
                </Label>

                {!newTask.project ? (
                  <div className="text-slate-600 text-xs font-mono py-2">
                    Select a project first to see available members
                  </div>
                ) : assignableMembers.length === 0 ? (
                  <div className="text-slate-600 text-xs font-mono py-2">
                    No assignable members in this project
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {assignableMembers.map((u) => {
                      const isSelected = newTask.assignees.includes(u._id);
                      return (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => toggleAssignee(u._id)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${
                            isSelected
                              ? "bg-blue-500/10 border-blue-500/40"
                              : "bg-slate-900 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {/* Avatar */}
                          <div
                            className="rounded-full flex items-center justify-center font-bold text-white shrink-0 text-[11px]"
                            style={{
                              width: 32,
                              height: 32,
                              background: ROLE_COLORS[u.role] || "#3b82f6",
                            }}
                          >
                            {u.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>

                          {/* Name + role */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-200 truncate">
                              {u.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {u.role} · {u.email}
                            </div>
                          </div>

                          {/* Checkmark */}
                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center text-xs shrink-0 transition-colors ${
                              isSelected
                                ? "bg-blue-500 border-blue-500 text-white"
                                : "border-slate-700"
                            }`}
                          >
                            {isSelected && "✓"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Due Date + Estimated Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Due Date</Label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask((n) => ({ ...n, dueDate: e.target.value }))}
                    className={`${inputCls} [color-scheme:dark]`}
                  />
                </div>
                <div>
                  <Label>Estimated Hours</Label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newTask.estimatedHours}
                    onChange={(e) => setNewTask((n) => ({ ...n, estimatedHours: e.target.value }))}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <input
                  value={newTask.tags}
                  onChange={(e) => setNewTask((n) => ({ ...n, tags: e.target.value }))}
                  placeholder="backend, security, api  (comma-separated)"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg py-2.5 text-slate-400 text-sm font-semibold hover:border-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-[2] bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-bold transition-colors"
              >
                {creating ? "Creating…" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}