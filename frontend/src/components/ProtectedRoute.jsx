import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

// Spinner shown while auth state is loading
const Spinner = () => (
  <div className="min-h-screen bg-[#060b14] flex items-center justify-center">
    <div className="font-mono text-[13px] text-slate-700">
      Loading...
    </div>
  </div>
);

// Blocks unauthenticated access
export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

// Blocks access below a minimum role
const ROLE_RANK = { viewer: 0, developer: 1, manager: 2, admin: 3 };

export const RoleGate = ({ minRole, fallback = null, children }) => {
  const { user } = useAuth();
  if (!user) return null;
  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) return fallback;
  return children;
};

// Blocks access without a specific permission
export const PermissionGate = ({ permission, fallback = null, children }) => {
  const { can } = useAuth();
  return can(permission) ? children : fallback;
};
