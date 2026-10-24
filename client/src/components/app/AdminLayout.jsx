import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "../../styles/dashboard.css";
import "../../styles/admin.css";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const linkClass = ({ isActive }) => `link${isActive ? " active" : ""}`;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <Link to="/" className="logo">Optimum</Link>
          <p className="role">Administrator</p>

          <nav className="nav">
            <NavLink to="/admin" end className={linkClass}>Dashboard</NavLink>
            <NavLink to="/admin/users" className={linkClass}>Users</NavLink>
            <NavLink to="/admin/templates" className={linkClass}>Templates</NavLink>
            <NavLink to="/admin/jobs" className={linkClass}>Solver &amp; Jobs</NavLink>
            <NavLink to="/admin/audit-log" className={linkClass}>Audit Log</NavLink>
          </nav>
        </div>

        <div className="foot">
          <p>
            {user?.name} {user?.surname}
            <br />
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