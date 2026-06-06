import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/ToastContext";

const STATUS_LABELS = { backlog: "Backlog", todo: "To Do", in_progress: "In Progress", in_review: "In Review", done: "Done", cancelled: "Cancelled" };
const STATUS_COLORS = { backlog: "#64748b", todo: "#3b82f6", in_progress: "#f59e0b", in_review: "#8b5cf6", done: "#10b981", cancelled: "#ef4444" };
const PRIORITY_COLORS = { low: "#64748b", medium: "#3b82f6", high: "#f59e0b", critical: "#ef4444" };
const STATUSES = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"];
const PRIORITIES = ["low", "medium", "high", "critical"];
const ROLE_COLORS = { admin: "#ef4444", manager: "#8b5cf6", developer: "#3b82f6", viewer: "#64748b" };

const Avatar = ({ user, size = 30 }) => {
  if (!user) return null;
  const initials = user.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "??";
  return (
    <div className="flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: ROLE_COLORS[user.role] || "#3b82f6",
        fontSize: size * 0.33,
        fontFamily: "'Syne', sans-serif",
      }}>
      {initials}
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="mb-5">
    <div className="font-[Syne] text-[10px] font-bold text-slate-700 uppercase tracking-[1.5px] mb-2.5">{title}</div>
    {children}
  </div>
);

export default function TaskDetailModal({ task, onClose, onUpdate, onDelete, allUsers = [] }) {
  const { user: currentUser, can } = useAuth();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [logHours, setLogHours] = useState("");
  const [showLogHours, setShowLogHours] = useState(false);

  // Local draft state for inline editing
  const [draft, setDraft] = useState({
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    estimatedHours: task.estimatedHours || "",
    tags: (task.tags || []).join(", "),
  });

  const isOverdue = task.dueDate && task.status !== "done" && new Date() > new Date(task.dueDate);
  const canEdit = can("update:any") || (currentUser.role === "developer" && task.assignees?.some((a) => (a._id || a) === currentUser._id));
  const canDelete = can("delete:task");
  const canComment = can("comment:task") || canEdit;

  const progressPct = task.estimatedHours > 0
    ? Math.min(Math.round((task.loggedHours / task.estimatedHours) * 100), 100)
    : 0;

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...draft,
        tags: draft.tags ? draft.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        estimatedHours: Number(draft.estimatedHours) || 0,
        dueDate: draft.dueDate || null,
      };
      await onUpdate(task._id, payload);
      setEditing(false);
      toast("Task updated successfully", "success");
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      toast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await onUpdate(task._id, { status: newStatus });
      toast(`Status → ${STATUS_LABELS[newStatus]}`, "info");
    } catch {
      toast("Status update failed", "error");
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await onUpdate(task._id, { $push: { comments: { author: currentUser._id, content: commentText } } });
      setCommentText("");
      toast("Comment added", "success");
    } catch {
      toast("Failed to add comment", "error");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLogHours = async () => {
    const hrs = parseFloat(logHours);
    if (!hrs || hrs <= 0) return;
    try {
      await onUpdate(task._id, { loggedHours: (task.loggedHours || 0) + hrs });
      setLogHours("");
      setShowLogHours(false);
      toast(`Logged ${hrs}h`, "success");
    } catch {
      toast("Failed to log hours", "error");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await onDelete(task._id);
      onClose();
      toast("Task deleted", "warning");
    } catch {
      toast("Failed to delete task", "error");
    }
  };

  // ─── Styles ────────────────────────────────────────────────────────────────
  const inputStyle = {
    background: "#060b14", border: "1px solid #1e293b", borderRadius: 6,
    padding: "8px 10px", color: "#e2e8f0", fontFamily: "'Inter', sans-serif",
    fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box",
  };
  const selStyle = { ...inputStyle, cursor: "pointer" };

  const assignees = task.assignees || [];

  return (
    <div
      className="fixed inset-0 bg-black/85 z-[1000] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0a0f1e] border border-slate-800 rounded-2xl w-full max-w-[780px] max-h-[92vh] flex flex-col shadow-[0_30px_90px_rgba(0,0,0,0.85)] overflow-hidden"
      >
        {/* ── Top bar ── */}
        <div className="px-6 py-[18px] border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex gap-2 items-center">
            <span
              className="px-[10px] py-[3px] rounded text-[11px] font-mono font-bold uppercase"
              style={{
                background: PRIORITY_COLORS[task.priority] + "22",
                color: PRIORITY_COLORS[task.priority],
                border: `1px solid ${PRIORITY_COLORS[task.priority]}44`,
              }}
            >
              {task.priority}
            </span>

            {canEdit && !editing ? (
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded px-[10px] py-[3px] text-[11px] font-bold uppercase cursor-pointer outline-none font-mono"
                style={{
                  background: STATUS_COLORS[task.status] + "22",
                  color: STATUS_COLORS[task.status],
                  border: `1px solid ${STATUS_COLORS[task.status]}44`,
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className="rounded px-[10px] py-[3px] text-[11px] font-bold uppercase font-mono"
                style={{
                  background: STATUS_COLORS[task.status] + "22",
                  color: STATUS_COLORS[task.status],
                  border: `1px solid ${STATUS_COLORS[task.status]}44`,
                }}
              >
                {STATUS_LABELS[task.status]}
              </span>
            )}

            {isOverdue && (
              <span className="font-mono text-[11px] text-red-500 bg-[#2a0f0f] border border-[#ef444433] rounded px-[8px] py-[3px]">
                ⚠ OVERDUE
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="bg-[#1e293b] border border-[#334155] rounded-md px-[12px] py-[6px] text-[#94a3b8] text-[12px] font-semibold cursor-pointer"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                ✏ Edit
              </button>
            )}

            {canDelete && !editing && (
              <button
                onClick={handleDelete}
                className="bg-[#2a0f0f] border border-[#ef444433] rounded-md px-[12px] py-[6px] text-red-500 text-[12px] font-semibold cursor-pointer"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                ✕ Delete
              </button>
            )}

            <button
              onClick={onClose}
              className="bg-transparent border-none text-[#64748b] cursor-pointer text-[20px] leading-none px-[4px]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto flex">

          {/* Left column — main content */}
          <div className="flex-1 p-6 border-r border-slate-800 overflow-auto">

            {/* Title */}
            {editing ? (
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="w-full text-[18px] font-bold font-[Syne] mb-4 border border-blue-500 rounded px-3 py-2 bg-transparent text-slate-200 outline-none"
              />
            ) : (
              <h2 className="font-[Syne] text-[20px] font-bold text-slate-100 mb-3 leading-[1.35]">
                {task.title}
              </h2>
            )}

            {/* Description */}
            <Section title="Description">
              {editing ? (
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  rows={4}
                  placeholder="Add a description..."
                  className="w-full resize-y leading-[1.6] rounded px-3 py-2 bg-transparent border border-slate-700 text-slate-200 outline-none"
                />
              ) : (
                <div
                  className={`font-[Inter] text-[14px] leading-[1.7] ${task.description
                    ? "text-slate-400 not-italic"
                    : "text-slate-700 italic"
                    }`}
                >
                  {task.description || "No description provided."}
                </div>
              )}
            </Section>

            {/* Progress bar */}
            {task.estimatedHours > 0 && (
              <Section
                title={`Progress — ${task.loggedHours}h logged / ${task.estimatedHours}h estimated`}
              >
                <div className="h-2 bg-slate-800 rounded overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded transition-all duration-400 ${task.loggedHours > task.estimatedHours
                      ? "bg-red-500"
                      : "bg-emerald-500"
                      }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="flex justify-between">
                  <span className="font-mono text-[11px] text-slate-600">
                    {progressPct}% complete
                  </span>

                  {canEdit && (
                    <button
                      onClick={() => setShowLogHours((v) => !v)}
                      className="bg-transparent border-none text-blue-500 font-[Syne] text-[12px] font-semibold cursor-pointer"
                    >
                      {showLogHours ? "Cancel" : "+ Log Hours"}
                    </button>
                  )}
                </div>

                {showLogHours && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="number"
                      value={logHours}
                      onChange={(e) => setLogHours(e.target.value)}
                      placeholder="Hours worked..."
                      min="0.5"
                      step="0.5"
                      className="flex-1 rounded px-3 py-2 bg-transparent border border-slate-700 text-slate-200 outline-none"
                    />
                    <button
                      onClick={handleLogHours}
                      className="bg-emerald-500 border-none rounded px-4 py-2 text-white font-[Syne] text-[13px] font-bold cursor-pointer"
                    >
                      Log
                    </button>
                  </div>
                )}
              </Section>
            )}

            {/* Tags */}
            <Section title="Tags">
              {editing ? (
                <input
                  value={draft.tags}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, tags: e.target.value }))
                  }
                  placeholder="backend, security, api (comma-separated)"
                  className="w-full rounded px-3 py-2 bg-transparent border border-slate-700 text-slate-200 outline-none"
                />
              ) : (
                <div className="flex gap-1.5 flex-wrap">
                  {(task.tags || []).length === 0 ? (
                    <span className="font-mono text-[12px] text-slate-700">
                      No tags
                    </span>
                  ) : (
                    (task.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="bg-slate-800 text-slate-400 px-2.5 py-[3px] rounded text-[12px] font-mono"
                      >
                        #{tag}
                      </span>
                    ))
                  )}
                </div>
              )}
            </Section>

            {/* Edit buttons */}
            {editing && (
              <div className="flex gap-2.5 mb-5">
                <button
                  onClick={() => {
                    setEditing(false);
                    setDraft({
                      title: task.title,
                      description: task.description || "",
                      status: task.status,
                      priority: task.priority,
                      dueDate: task.dueDate
                        ? task.dueDate.split("T")[0]
                        : "",
                      estimatedHours: task.estimatedHours || "",
                      tags: (task.tags || []).join(", "),
                    });
                  }}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-400 font-[Syne] text-[13px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex-[2] rounded-lg p-2.5 font-[Syne] text-[14px] font-bold ${saving
                    ? "bg-blue-900 text-slate-500 cursor-not-allowed"
                    : "bg-blue-500 text-white cursor-pointer"
                    }`}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}

            {/* Comments */}
            <Section title={`Comments (${(task.comments || []).length})`}>
              <div className="flex flex-col gap-3 mb-3.5">
                {(task.comments || []).length === 0 && (
                  <div className="font-[Inter] text-[13px] text-slate-700 italic">
                    No comments yet.
                  </div>
                )}

                {(task.comments || []).map((c, i) => {
                  const author =
                    typeof c.author === "object"
                      ? c.author
                      : allUsers.find((u) => u._id === c.author);

                  return (
                    <div key={i} className="flex gap-2.5">
                      <Avatar user={author || { name: "?", role: "viewer" }} size={30} />

                      <div className="flex-1 bg-[#060b14] border border-slate-800 rounded-lg px-3.5 py-2.5">
                        <div className="flex justify-between mb-1">
                          <span className="font-[Syne] text-[12px] font-semibold text-slate-500">
                            {author?.name || "Unknown"}
                          </span>

                          {c.createdAt && (
                            <span className="font-mono text-[10px] text-slate-700">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <div className="font-[Inter] text-[13px] text-slate-300 leading-[1.6]">
                          {c.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {canComment && (
                <div className="flex gap-2.5">
                  <Avatar user={currentUser} size={30} />

                  <div className="flex-1 flex gap-2">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        handleAddComment()
                      }
                      placeholder="Add a comment… (Enter to submit)"
                      className="flex-1 rounded px-3 py-2 bg-transparent border border-slate-700 text-slate-200 outline-none"
                    />

                    <button
                      onClick={handleAddComment}
                      disabled={submittingComment || !commentText.trim()}
                      className={`rounded px-4 py-2 font-[Syne] text-[13px] font-semibold transition ${commentText.trim()
                        ? "bg-blue-500 text-white cursor-pointer"
                        : "bg-slate-800 text-slate-600 cursor-not-allowed"
                        }`}
                    >
                      Post
                    </button>
                  </div>
                </div>
              )}
            </Section>
          </div>

          {/* Right sidebar — metadata */}
          <div className="w-[240px] px-5 py-6 flex flex-col gap-5 shrink-0">

            {/* Status / Priority in edit mode */}
            {editing && (
              <>
                <div>
                  <div className="font-['Syne',sans-serif] text-[10px] font-bold text-slate-700 uppercase tracking-[1.5px] mb-2">Status</div>
                  <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))} style={{ ...selStyle, color: STATUS_COLORS[draft.status] }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <div className="font-['Syne',sans-serif] text-[10px] font-bold text-slate-700 uppercase tracking-[1.5px] mb-2">Priority</div>
                  <select value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))} style={{ ...selStyle, color: PRIORITY_COLORS[draft.priority] }}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Assignees */}
            <div>
              <div className="font-['Syne',sans-serif] text-[10px] font-bold text-slate-700 uppercase tracking-[1.5px] mb-[10px]">
                Assignees
              </div>

              {assignees.length === 0 ? (
                <span className="font-['JetBrains_Mono',monospace] text-xs text-slate-700">
                  Unassigned
                </span>
              ) : (
                <div className="flex flex-col gap-2">
                  {assignees.map((a, i) => {
                    const u =
                      typeof a === "object"
                        ? a
                        : allUsers.find((u) => u._id === a);
                    if (!u) return null;

                    return (
                      <div
                        key={u._id || i}
                        className="flex items-center gap-2"
                      >
                        <Avatar user={u} size={28} />

                        <div>
                          <div className="font-['Syne',sans-serif] text-[13px] text-slate-200 font-semibold">
                            {u.name}
                          </div>
                          <div className="font-['JetBrains_Mono',monospace] text-[10px] text-slate-600">
                            {u.role}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Project */}
            {task.project && (
              <div>
                <div className="font-['Syne',sans-serif] text-[10px] font-bold text-slate-700 uppercase tracking-[1.5px] mb-2">
                  Project
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="w-[10px] h-[10px] rounded-full shrink-0"
                    style={{ background: task.project?.color || "#3b82f6" }}
                  />
                  <span className="font-['Syne',sans-serif] text-[13px] text-slate-200">
                    {task.project?.icon} {task.project?.name || "—"}
                  </span>
                </div>
              </div>
            )}

            {/* Due date */}
            <div>
              <div className="font-['Syne',sans-serif] text-[10px] font-bold text-slate-700 uppercase tracking-[1.5px] mb-2">
                Due Date
              </div>

              {editing ? (
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, dueDate: e.target.value }))
                  }
                  className="font-['JetBrains_Mono',monospace] text-sm px-3 py-2 rounded-md border border-slate-700 bg-slate-900 outline-none"
                  style={{ colorScheme: "dark" }}
                />
              ) : (
                <span
                  className="font-['JetBrains_Mono',monospace] text-[13px]"
                  style={{
                    color: isOverdue
                      ? "#ef4444"
                      : task.dueDate
                        ? "#e2e8f0"
                        : "#334155",
                  }}
                >
                  {task.dueDate ? task.dueDate.split("T")[0] : "No due date"}
                </span>
              )}
            </div>

            {/* Estimated hours */}
            <div>
              <div className="font-['Syne',sans-serif] text-[10px] font-bold text-slate-700 uppercase tracking-[1.5px] mb-2">
                Estimated Hours
              </div>

              {editing ? (
                <input
                  type="number"
                  value={draft.estimatedHours}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, estimatedHours: e.target.value }))
                  }
                  min="0"
                  step="0.5"
                  className="font-['JetBrains_Mono',monospace] text-sm px-3 py-2 rounded-md border border-slate-700 bg-slate-900 outline-none"
                />
              ) : (
                <span
                  className="font-['JetBrains_Mono',monospace] text-[13px]"
                  style={{
                    color: task.estimatedHours ? "#e2e8f0" : "#334155",
                  }}
                >
                  {task.estimatedHours
                    ? `${task.estimatedHours}h`
                    : "Not estimated"}
                </span>
              )}
            </div>

            {/* Created by / Created at */}
            <div>
              <div className="font-['Syne',sans-serif] text-[10px] font-bold text-slate-700 uppercase tracking-[1.5px] mb-2">
                Created By
              </div>

              {(() => {
                const creator =
                  typeof task.createdBy === "object"
                    ? task.createdBy
                    : allUsers.find((u) => u._id === task.createdBy);

                return creator ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar user={creator} size={22} />
                    <span className="font-['Syne',sans-serif] text-[13px] text-slate-400">
                      {creator.name}
                    </span>
                  </div>
                ) : (
                  <span className="font-['JetBrains_Mono',monospace] text-xs text-slate-700">
                    —
                  </span>
                );
              })()}
            </div>

            {task.createdAt && (
              <div>
                <div className="font-['Syne',sans-serif] text-[10px] font-bold text-slate-700 uppercase tracking-[1.5px] mb-[6px]">
                  Created
                </div>

                <span className="font-['JetBrains_Mono',monospace] text-xs text-slate-600">
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}

            {task.completedAt && (
              <div>
                <div className="font-['Syne',sans-serif] text-[10px] font-bold text-emerald-500 uppercase tracking-[1.5px] mb-[6px]">
                  Completed
                </div>

                <span className="font-['JetBrains_Mono',monospace] text-xs text-emerald-500">
                  {new Date(task.completedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
