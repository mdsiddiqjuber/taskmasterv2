import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const ROLE_OPTIONS = [
  {
    value: "manager",
    label: "Manager",
    icon: "🎯",
    description: "Create & manage projects, assign tasks to your team",
  },
  {
    value: "developer",
    label: "Developer",
    icon: "💻",
    description: "Work on assigned tasks, log hours, leave comments",
  },
  {
    value: "viewer",
    label: "Viewer",
    icon: "👁",
    description: "Read-only access to projects you're added to",
  },
];

const ROLE_COLORS = {
  manager: "#8b5cf6",
  developer: "#3b82f6",
  viewer: "#64748b",
};

export default function LoginPage() {
  const { login, register, loading, error } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    role: "developer", //default
  });
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    const result =
      mode === "login"
        ? await login(form.email, form.password)
        : await register(form);

    if (result.success) navigate("/");
    else setLocalError(result.message);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setLocalError("");
    setForm({ name: "", email: "", password: "", department: "", role: "developer" });
  };

  return (
    <div className="min-h-screen bg-[#060b14] flex items-center justify-center p-5 font-sans">

      {/* Card */}
      <div className="bg-[#0a0f1e] border border-slate-800 rounded-2xl px-9 py-10 w-full max-w-[420px] shadow-[0_25px_80px_rgba(0,0,0,0.6)]">

        {/* Logo */}
        <div className="text-[26px] font-extrabold text-slate-100 mb-3">
          Task<span className="text-blue-500">Master</span>
        </div>

        {/* Error */}
        {(error || localError) && (
          <div className="bg-[#2a0f0f] border border-red-500/30 rounded-lg px-3.5 py-2.5 text-red-300 font-mono text-xs mb-4">
            ⚠ {localError || error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >

          {/* Register Fields */}
          {mode === "register" && (
            <>
              <div>
                <label className="block font-sans text-[11px] text-slate-500 uppercase tracking-widest mb-1.5">
                  Full Name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Type your full name"
                  className="w-full bg-[#060b14] border border-slate-800 rounded-lg px-3.5 py-3 text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block font-sans text-[11px] text-slate-500 uppercase tracking-widest mb-1.5">
                  Department
                </label>
                <input
                  value={form.department}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      department: e.target.value,
                    }))
                  }
                  placeholder="Type your department"
                  className="w-full bg-[#060b14] border border-slate-800 rounded-lg px-3.5 py-3 text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {/* ── Role picker ── */}
              <div>
                <label className="block font-syne text-[11px] text-slate-500 uppercase tracking-[1px] mb-[6px]">
                  I want to join as
                </label>

                <div className="flex flex-col gap-2">
                  {ROLE_OPTIONS.map((opt) => {
                    const isSelected = form.role === opt.value;
                    const color = ROLE_COLORS[opt.value];

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, role: opt.value }))
                        }
                        className={`flex items-center gap-3 px-[14px] py-3 rounded-[10px] text-left transition-all duration-150 outline-none
                    ${isSelected ? "" : "bg-[#060b14]"}`}
                        style={{
                          border: `1px solid ${isSelected ? color + "66" : "#1e293b"
                            }`,
                          background: isSelected ? color + "11" : "#060b14",
                        }}
                      >
                        {/* Icon */}
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 transition-colors duration-150"
                          style={{
                            background: isSelected ? color + "22" : "#1e293b",
                          }}
                        >
                          {opt.icon}
                        </div>

                        {/* Text */}
                        <div className="flex-1">
                          <div
                            className="font-syne text-sm font-bold mb-[2px] transition-colors duration-150"
                            style={{
                              color: isSelected ? color : "#e2e8f0",
                            }}
                          >
                            {opt.label}
                          </div>

                          <div className="font-inter text-xs text-slate-500 leading-[1.4]">
                            {opt.description}
                          </div>
                        </div>

                        {/* Radio dot */}
                        <div
                          className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 transition-all duration-150"
                          style={{
                            border: `2px solid ${isSelected ? color : "#334155"
                              }`,
                            background: isSelected ? color : "transparent",
                          }}
                        >
                          {isSelected && (
                            <div className="w-[6px] h-[6px] rounded-full bg-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Shared fields */}
          {/* Email */}
          <div>
            <label className="block font-sans text-[11px] text-slate-500 uppercase tracking-widest mb-1.5">
              Email
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="Type your email"
              className="w-full bg-[#060b14] border border-slate-800 rounded-lg px-3.5 py-3 text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block font-sans text-[11px] text-slate-500 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="Type your password"
              className="w-full bg-[#060b14] border border-slate-800 rounded-lg px-3.5 py-3 text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 rounded-lg py-3 text-white font-sans text-[15px] font-bold mt-1 transition-colors disabled:opacity-50"
          >
            {loading
              ? "..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        {/* Toggle */}
        <div className="text-center mt-5 font-sans text-sm text-slate-500">
          {mode === "login" ? "No account?" : "Already registered?"}{" "}
          <button
            className="text-blue-500 font-semibold hover:underline"
            onClick={() =>
              switchMode(mode === "login" ? "register" : "login")
            }
          >
            {mode === "login" ? "Register" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}