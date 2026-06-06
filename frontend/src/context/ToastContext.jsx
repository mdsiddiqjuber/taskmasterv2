import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 3500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const COLORS = {
    success: { bg: "#0f2a1a", border: "#10b98155", text: "#34d399", icon: "✓" },
    error:   { bg: "#2a0f0f", border: "#ef444455", text: "#fc8181", icon: "✕" },
    info:    { bg: "#0f1f3a", border: "#3b82f655", text: "#93c5fd", icon: "ℹ" },
    warning: { bg: "#2a1f0f", border: "#f59e0b55", text: "#fcd34d", icon: "⚠" },
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* Toast container */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {toasts.map((t) => {
          const c = COLORS[t.type] || COLORS.success;
          return (
            <div
              key={t.id}
              onClick={() => removeToast(t.id)}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 10,
                padding: "12px 18px",
                color: c.text,
                fontFamily: "'Syne', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                pointerEvents: "auto",
                cursor: "pointer",
                animation: "slideIn 0.2s ease",
                minWidth: 240,
                maxWidth: 400,
              }}
            >
              <span style={{ fontSize: 14 }}>{c.icon}</span>
              {t.message}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
};
