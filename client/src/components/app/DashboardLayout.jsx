import { Link, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "../../styles/dashboard.css";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const params = useParams();
  const projectId = params.projectId; // Still available if you need it for nested project views

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/" className="logo">Optimum</Link>
        
        <nav className="app-sidebar__nav">
          <Link to="/dashboard" className="app-sidebar__link">Projects</Link>
          <Link to="/dashboard/model-builder" className="app-sidebar__link">Model Builder</Link>
          <Link to="/dashboard/data-upload" className="app-sidebar__link">Data Upload</Link>

          {/* Standalone Global Pages */}
          <Link to="/dashboard/run-optimization" className="app-sidebar__link">
            Run Optimization
          </Link>
          <Link to="/dashboard/history" className="app-sidebar__link">
            History
          </Link>

          {/* Conditionally show other project-specific links only when viewing a project */}
          {projectId && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.6, marginBottom: "0.5rem" }}>
                Active Project Actions
              </div>
              <Link to={`/dashboard/projects/${projectId}/model`} className="app-sidebar__link">
                Model Setup
              </Link>
            </div>
          )}
        </nav>

        <div className="app-sidebar__foot">
          <p>
            {user?.name} {user?.surname}<br />
            <span style={{ opacity: 0.7 }}>{user?.email}</span>
          </p>
          <button type="button" className="btn btn--ghost btn--sm btn--block" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}