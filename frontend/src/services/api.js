import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// ─── Axios Instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: auto-refresh on 401 ───────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, data = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(data);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/refresh") &&
      !originalRequest.url.includes("/auth/me")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");

        processQueue(null);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        window.location.href = "/login";

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  refresh: (refreshToken) => api.post("/auth/refresh", { refreshToken }),
};

// ─── Tasks API ────────────────────────────────────────────────────────────────
export const tasksAPI = {
  getAll: (params) => api.get("/tasks", { params }),           // Paginated, filterable
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post("/tasks", data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  addComment: (id, content) => api.post(`/tasks/${id}/comments`, { content }),
  getStats: () => api.get("/tasks/stats"),
};

// ─── Projects API ─────────────────────────────────────────────────────────────
export const projectsAPI = {
  getAll: () => api.get("/projects"),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post("/projects", data),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  addMember: (id, userId, role) => api.post(`/projects/${id}/members`, { userId, role }),
};

// ─── Users API ────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params) => api.get("/users", { params }),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  deactivate: (id) => api.patch(`/users/${id}/deactivate`),
};

export default api;
