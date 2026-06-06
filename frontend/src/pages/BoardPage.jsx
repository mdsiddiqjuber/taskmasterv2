import { useTasks, useProjects } from "../hooks/useData";

const STATUSES = ["backlog", "todo", "in_progress", "in_review", "done"];
const STATUS_LABELS = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const STATUS_COLORS = {
  backlog: "#64748b",
  todo: "#3b82f6",
  in_progress: "#f59e0b",
  in_review: "#8b5cf6",
  done: "#10b981",
};

const PRIORITY_COLORS = {
  low: "#64748b",
  medium: "#3b82f6",
  high: "#f59e0b",
  critical: "#ef4444",
};

export default function BoardPage() {
  const { data: tasks, loading } = useTasks({ limit: 100 });
  // eslint-disable-next-line no-unused-vars
  const { projects } = useProjects();

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-[13px] text-slate-600">
        Loading board...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="px-7 py-[18px] border-b border-slate-800 bg-[#0a0f1e] shrink-0">
        <h1 className="font-sans text-xl font-bold text-slate-100">
          Kanban Board
        </h1>
        <div className="font-mono text-[11px] text-slate-600 mt-1">
          {tasks.length} tasks across {STATUSES.length} columns
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-auto px-6 py-5 flex gap-3.5">
        {STATUSES.map((status) => (
          <div
            key={status}
            className="min-w-[270px] flex-1 flex flex-col gap-2.5"
          >
            
            {/* Column Header */}
            <div
              className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-lg border border-slate-800 shrink-0"
              style={{ borderTop: `3px solid ${STATUS_COLORS[status]}` }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: STATUS_COLORS[status] }}
                />
                <span className="font-sans text-[12px] font-bold text-slate-400 uppercase tracking-wide">
                  {STATUS_LABELS[status]}
                </span>
              </div>
              <span className="font-mono text-[12px] text-slate-500">
                {byStatus[status].length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
              {byStatus[status].map((task) => (
                <div
                  key={task._id}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-3 transition-colors duration-150 hover:border-slate-700"
                  style={{
                    borderLeft: `3px solid ${
                      task.project?.color || "#3b82f6"
                    }`,
                  }}
                >
                  
                  {/* Title + Priority */}
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <div className="font-sans text-[13px] font-semibold text-slate-200 flex-1 leading-snug">
                      {task.title}
                    </div>

                    <span
                      className="px-1.5 py-[1px] rounded text-[10px] font-mono font-semibold uppercase shrink-0"
                      style={{
                        background:
                          PRIORITY_COLORS[task.priority] + "22",
                        color: PRIORITY_COLORS[task.priority],
                        border: `1px solid ${
                          PRIORITY_COLORS[task.priority]
                        }44`,
                      }}
                    >
                      {task.priority}
                    </span>
                  </div>

                  {/* Project */}
                  <div className="font-mono text-[10px] text-slate-500 mb-1">
                    {task.project?.icon} {task.project?.name}
                  </div>

                  {/* Due Date */}
                  {task.dueDate && (
                    <div
                      className="font-mono text-[10px] mt-1"
                      style={{
                        color:
                          new Date() > new Date(task.dueDate) &&
                          task.status !== "done"
                            ? "#ef4444"
                            : "#334155",
                      }}
                    >
                      📅 {task.dueDate.split("T")[0]}
                    </div>
                  )}

                  {/* Progress */}
                  {task.estimatedHours > 0 && (
                    <div className="mt-2">
                      <div className="h-0.5 bg-slate-800 rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              (task.loggedHours /
                                task.estimatedHours) *
                                100,
                              100
                            )}%`,
                            background:
                              task.loggedHours >
                              task.estimatedHours
                                ? "#ef4444"
                                : "#10b981",
                          }}
                        />
                      </div>
                      <div className="font-mono text-[10px] text-slate-600 mt-1">
                        {task.loggedHours}h / {task.estimatedHours}h
                      </div>
                    </div>
                  )}

                  {/* Assignees */}
                  {task.assignees?.length > 0 && (
                    <div className="flex mt-2">
                      {task.assignees.slice(0, 4).map((a, i) => (
                        <div
                          key={a._id || i}
                          title={a.name}
                          className={`w-[22px] h-[22px] rounded-full bg-blue-500 border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-white font-sans ${
                            i > 0 ? "-ml-1.5" : ""
                          }`}
                        >
                          {a.name?.slice(0, 2).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Empty */}
              {byStatus[status].length === 0 && (
                <div className="border border-dashed border-slate-800 rounded-lg p-6 text-center text-slate-800 font-mono text-xs">
                  empty
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}