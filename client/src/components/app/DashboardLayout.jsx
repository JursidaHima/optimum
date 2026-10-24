import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "../../styles/dashboard.css";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const params = useParams();
  const projectId = params.projectId;
  const linkClass = ({ isActive }) => `link${isActive ? " active" : ""}`; // Still available if you need it for nested project views

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="logo">Optimum</Link>
        
        <nav className="nav">
          <NavLink to="/dashboard" end className={linkClass}>Dashboard</NavLink>
          <NavLink to="/dashboard/projects" className={linkClass}>Projects</NavLink>
          <NavLink to="/dashboard/model-builder" className={linkClass}>Model Builder</NavLink>
          <NavLink to="/dashboard/data-upload" className={linkClass}>Data Upload</NavLink>

          {user?.role === "Admin" && (
            <Link to="/admin" className="link">Admin area</Link>
          )}

          {/* Standalone Global Pages */}
          <NavLink to="/dashboard/run-optimization" className={linkClass}>
            Run Optimization
          </NavLink>
          <NavLink to="/dashboard/history" className={linkClass}>
            History
          </NavLink>

          {/* Conditionally show other project-specific links only when viewing a project */}
          {projectId && (
            <div className="section">
              <div className="section-title">
                Active Project Actions
              </div>
              <Link to={`/dashboard/projects/${projectId}/model`} className="link">
                Model Setup
              </Link>
            </div>
          )}
        </nav>

        <div className="foot">
          <p>
            {user?.name} {user?.surname}<br />
            <span className="email">{user?.email}</span>
          </p>
          <button type="button" className="btn ghost small block" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}