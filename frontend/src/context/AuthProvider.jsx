import { useReducer, useEffect, useCallback, useRef } from "react";
import { AuthContext } from "./AuthContext";
import { authAPI } from "../services/api";

const initialState = {
  user: null,
  loading: true,
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "AUTH_INIT":
      return { ...state, loading: true, error: null };
    case "AUTH_SUCCESS":
      return { user: action.payload, loading: false, error: null };
    case "AUTH_FAILURE":
      return { user: null, loading: false, error: action.payload };
    case "AUTH_LOGOUT":
      return { user: null, loading: false, error: null };
    case "UPDATE_USER":
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const bootstrap = async () => {
      dispatch({ type: "AUTH_INIT" });

      try {
        const { data } = await authAPI.getMe();
        dispatch({ type: "AUTH_SUCCESS", payload: data.user });
      } catch {
        dispatch({ type: "AUTH_FAILURE", payload: null });
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: "AUTH_INIT" });
    try {
      const { data } = await authAPI.login({ email, password });
      dispatch({ type: "AUTH_SUCCESS", payload: data.user });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";
      dispatch({ type: "AUTH_FAILURE", payload: message });
      return { success: false, message };
    }
  }, []);

  const register = useCallback(async (formData) => {
    dispatch({ type: "AUTH_INIT" });
    try {
      const { data } = await authAPI.register(formData);
      dispatch({ type: "AUTH_SUCCESS", payload: data.user });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      dispatch({ type: "AUTH_FAILURE", payload: message });
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      const message = err.response?.data?.message || "Logout failed";
      dispatch({ type: "AUTH_FAILURE", payload: message });
      return { success: false, message };
    }
    dispatch({ type: "AUTH_LOGOUT" });
  }, []);

  const can = useCallback(
    (permission) => state.user?.permissions?.includes(permission) ?? false,
    [state.user]
  );

  const hasRole = useCallback(
    (...roles) => roles.includes(state.user?.role),
    [state.user]
  );

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, can, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
};