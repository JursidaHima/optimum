import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/" className="logo">Optimum</Link>
        <nav>
          <Link to="/dashboard" className="app-sidebar__link">Projects</Link>
          <Link to="/dashboard/model-builder" className="app-sidebar__link" >Model Builder</Link>
        </nav>
        <div className="app-sidebar__foot">
          <p>  {user.name} {user.surname}<br /><span style={{ opacity: 0.7 }}>{user.email}</span></p>
          <button type="button" className="btn btn--ghost btn--sm btn--block" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}