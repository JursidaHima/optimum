import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardLayout from "./components/app/DashboardLayout.jsx";


import Home from "./pages/Home.jsx";
import FinanceSolution from "./pages/FinanceSolution.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import Documentation from "./pages/Documentation.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Projects from "./pages/Projects.jsx";
import ModelBuilder from "./pages/ModelBuilder";

export default function App() {
  return (
    <Routes>

      {/* public pages*/}
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        <Route
          path="solutions/finance"
          element={<FinanceSolution />}
        />

        <Route
          path="how-it-works"
          element={<HowItWorks />}
        />

        <Route
          path="documentation"
          element={<Documentation />}
        />

        {/* auth */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>
{/* protected dashboard */}
<Route element={<ProtectedRoute />}>
  <Route path="dashboard" element={<DashboardLayout />}>
    <Route index element={<Projects />} />
    <Route path="model-builder" element={<ModelBuilder />} />
  </Route>
</Route>

 

    </Routes>
  );
}