import { useState, useEffect, useCallback, useRef } from "react";
import { tasksAPI, projectsAPI, usersAPI } from "../services/api";

// ─── Generic paginated list hook ─────────────────────────────────────────────
export const usePaginatedList = (fetchFn, defaultParams = {}) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(defaultParams);
  const abortRef = useRef(null);

  const fetch = useCallback(async (overrideParams = {}) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const mergedParams = { ...params, ...overrideParams };
      const { data: res } = await fetchFn(mergedParams);
      setData(res.data);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      if (err.name !== "CanceledError") {
        setError(err.response?.data?.message || "Failed to fetch");
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFn, params]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, [params]);

  const updateParams = useCallback((newParams) => {
    setParams((prev) => ({ ...prev, ...newParams, page: 1 }));
  }, []);

  const goToPage = useCallback((page) => {
    setParams((prev) => ({ ...prev, page }));
  }, []);

  return { data, setData, pagination, loading, error, params, updateParams, goToPage, refetch: fetch };
};

// ─── Tasks hook ───────────────────────────────────────────────────────────────
export const useTasks = (initialParams = {}) => {
  const hook = usePaginatedList(tasksAPI.getAll, initialParams);

  const createTask = useCallback(async (taskData) => {
    const { data } = await tasksAPI.create(taskData);
    hook.setData((prev) => [data.data, ...prev]);
    return data.data;
  }, [hook]);

  const updateTask = useCallback(async (id, updates) => {
    const { data } = await tasksAPI.update(id, updates);
    hook.setData((prev) => prev.map((t) => (t._id === id ? data.data : t)));
    return data.data;
  }, [hook]);

  const deleteTask = useCallback(async (id) => {
    await tasksAPI.delete(id);
    hook.setData((prev) => prev.filter((t) => t._id !== id));
  }, [hook]);

  const addComment = useCallback(async (id, content) => {
    const { data } = await tasksAPI.addComment(id, content);
    hook.setData((prev) =>
      prev.map((t) => (t._id === id ? { ...t, comments: data.data } : t))
    );
  }, [hook]);

  return { ...hook, createTask, updateTask, deleteTask, addComment };
};

// ─── Projects hook ────────────────────────────────────────────────────────────
export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await projectsAPI.getAll();
      setProjects(data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const createProject = useCallback(async (projectData) => {
    const { data } = await projectsAPI.create(projectData);
    setProjects((prev) => [...prev, data.data]);
    return data.data;
  }, []);

  const addMember = useCallback(async (projectId, userId, role) => {
    const { data } = await projectsAPI.addMember(projectId, userId, role);
    setProjects((prev) => prev.map((p) => (p._id === projectId ? data.data : p)));
  }, []);

  return { projects, loading, error, refetch: fetch, createProject, addMember };
};

// ─── Task stats hook ──────────────────────────────────────────────────────────
export const useTaskStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    tasksAPI.getStats()
      .then(({ data }) => setStats(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
};

// ─── Users hook (admin) ───────────────────────────────────────────────────────
export const useUsers = () => {
  const hook = usePaginatedList(usersAPI.getAll);

  const updateRole = useCallback(async (userId, role) => {
    await usersAPI.updateRole(userId, role);
    hook.setData((prev) => prev.map((u) => (u._id === userId ? { ...u, role } : u)));
  }, [hook]);

  const deactivate = useCallback(async (userId) => {
    await usersAPI.deactivate(userId);
    hook.setData((prev) => prev.map((u) => (u._id === userId ? { ...u, isActive: false } : u)));
  }, [hook]);

  return { ...hook, updateRole, deactivate };
};
