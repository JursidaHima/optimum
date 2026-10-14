import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import DashboardLayout from "./components/app/DashboardLayout.jsx";
import AdminLayout from "./components/app/AdminLayout.jsx";

import Home from "./pages/Home.jsx";
import FinanceSolution from "./pages/FinanceSolution.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import Documentation from "./pages/Documentation.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import UserDashboard from "./pages/UserDashboard.jsx";
import Projects from "./pages/Projects.jsx";
import ModelBuilder from "./pages/ModelBuilder.jsx";
import DataUpload from "./pages/DataUpload.jsx";
import RunOptimization from "./pages/RunOptimization.jsx";
import OptimizationResults from "./pages/OptimizationResults.jsx";
import RunHistory from "./pages/RunHistory.jsx";

// All admin pages live in src/pages/admin/
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminTemplates from "./pages/admin/AdminTemplates.jsx";
import AdminJobs from "./pages/admin/AdminJobs.jsx";
import AdminAuditLog from "./pages/admin/AdminAuditLog.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="solutions/finance" element={<FinanceSolution />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="documentation" element={<Documentation />} />

        {/* Auth */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* Protected user dashboard */}
      <Route element={<ProtectedRoute />}>
        <Route path="dashboard" element={<DashboardLayout />}>
          <Route index element={<UserDashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId" element={<Projects />} />
          <Route path="model-builder" element={<ModelBuilder />} />
          <Route path="data-upload" element={<DataUpload />} />
          <Route path="run-optimization" element={<RunOptimization />} />
          <Route path="history" element={<RunHistory />} />
          <Route path="results/:runId" element={<OptimizationResults />} />
        </Route>
      </Route>

      {/* Admin role only */}
      <Route element={<AdminRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="templates" element={<AdminTemplates />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="audit-log" element={<AdminAuditLog />} />
        </Route>
      </Route>
    </Routes>
  );
}
