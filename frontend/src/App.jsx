
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ReportIssue from "./pages/ReportIssue";
import MyIssues from "./pages/MyIssues";
import AdminDashboard from "./pages/AdminDashboard";

import "./App.css";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("campusfix_token");

  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <ReportIssue />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-issues"
          element={
            <ProtectedRoute>
              <MyIssues />
            </ProtectedRoute>
          }
        />
        <Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
