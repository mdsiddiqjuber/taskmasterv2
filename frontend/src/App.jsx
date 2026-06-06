import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import TasksPage from "./pages/TasksPage.jsx";
import BoardPage from "./pages/BoardPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/board" element={<BoardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}