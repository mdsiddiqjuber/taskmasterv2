import { useTaskStats } from "../hooks/useData";
import { useAuth } from "../context/useAuth";

const STATUS_COLORS = {
  backlog: "#64748b",
  todo: "#3b82f6",
  in_progress: "#f59e0b",
  in_review: "#8b5cf6",
  done: "#10b981",
  cancelled: "#ef4444",
};

const STATUS_LABELS = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

const PRIORITY_COLORS = {
  low: "#64748b",
  medium: "#3b82f6",
  high: "#f59e0b",
  critical: "#ef4444",
};

export function DashboardPage() {
  const { stats, loading } = useTaskStats();
  const { user } = useAuth();

  const byStatus = stats?.byStatus || [];
  const byPriority = stats?.byPriority || [];
  const overdue = stats?.overdue?.[0]?.count || 0;
  const completedThisWeek = stats?.completedThisWeek?.[0]?.count || 0;
  const total = byStatus.reduce((s, x) => s + x.count, 0);

  return (
    <div className="flex-1 overflow-auto px-8 py-7">

      {/* Header */}
      <div className="mb-7">
        <h1 className="font-sans text-[22px] font-bold text-slate-100">
          Dashboard
        </h1>
        <p className="font-mono text-[11px] text-slate-600 mt-1">
          Welcome back, {user?.name} · {user?.role} view
        </p>
      </div>

      {loading ? (
        <div className="font-mono text-[13px] text-slate-600">
          Loading stats...
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="flex gap-3.5 mb-7 flex-wrap">
            {[
              { label: "Total Tasks", value: total, color: "#e2e8f0" },
              { label: "Completed (7d)", value: completedThisWeek, color: "#10b981" },
              { label: "Overdue", value: overdue, color: overdue > 0 ? "#ef4444" : "#64748b" },
              {
                label: "Critical Open",
                value: byPriority.find(p => p._id === "critical")?.count || 0,
                color: "#ef4444",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-5 flex-1 min-w-[140px]"
              >
                <div
                  className="font-mono text-[28px] font-bold leading-none"
                  style={{ color }}
                >
                  {value}
                </div>
                <div className="font-sans text-[11px] text-slate-500 mt-1.5 uppercase tracking-widest">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Status Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-5 mb-5">
            <div className="font-sans text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-4">
              Status Distribution
            </div>

            <div className="flex gap-2.5 flex-wrap">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const entry = byStatus.find(s => s._id === key);
                const count = entry?.count || 0;
                const pct = total ? Math.round((count / total) * 100) : 0;

                return (
                  <div
                    key={key}
                    className="flex-1 min-w-[90px] text-center bg-[#0a0f1e] rounded-lg px-2 py-3"
                    style={{
                      borderTop: `3px solid ${STATUS_COLORS[key]}`,
                    }}
                  >
                    <div
                      className="font-mono text-[20px] font-bold"
                      style={{ color: STATUS_COLORS[key] }}
                    >
                      {count}
                    </div>

                    <div className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-1">
                      {label}
                    </div>

                    <div className="font-mono text-[10px] text-slate-600 mt-0.5">
                      {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-5">
            <div className="font-sans text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-4">
              Priority Breakdown
            </div>

            <div className="flex flex-col gap-2.5">
              {["critical", "high", "medium", "low"].map((priority) => {
                const count =
                  byPriority.find((p) => p._id === priority)?.count || 0;
                const pct = total ? (count / total) * 100 : 0;

                return (
                  <div
                    key={priority}
                    className="flex items-center gap-3"
                  >
                    <div
                      className="w-16 font-mono text-[11px] uppercase"
                      style={{ color: PRIORITY_COLORS[priority] }}
                    >
                      {priority}
                    </div>

                    <div className="flex-1 h-1.5 bg-slate-800 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          background: PRIORITY_COLORS[priority],
                        }}
                      />
                    </div>

                    <div className="w-7 font-mono text-[12px] text-slate-500 text-right">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;