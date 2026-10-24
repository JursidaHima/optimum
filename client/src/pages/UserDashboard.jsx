import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { dashboardApi } from "../services/dashboardApi";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDateTime, formatMoney, formatPercent, RUN_STATUSES } from "../utils/format";
import "../styles/user-dashboard.css";

export default function UserDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardApi.summary().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="alert error" role="alert">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const { counts, runs, recentRuns, latestCompleted } = data;

  return (
    <section className="user-dash">
      <header className="header">
        <h1>Welcome back{user?.name ? `, ${user.name}` : ""}</h1>
        <p>Your optimization workspace at a glance.</p>
      </header>

      <div className="kpis">
        <div className="kpi"><span>Projects</span><strong>{counts.projects}</strong></div>
        <div className="kpi"><span>Models</span><strong>{counts.models}</strong></div>
        <div className="kpi"><span>Datasets</span><strong>{counts.datasets}</strong></div>
        <div className="kpi"><span>Total runs</span><strong>{counts.runs}</strong></div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Runs by status</h2>
          <ul className="status-list">
            {RUN_STATUSES.map((status) => (
              <li key={status}>
                <StatusBadge status={status} />
                <strong>{runs[status]}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2>Latest completed result</h2>
          {latestCompleted ? (
            <>
              <p className="muted">
                {latestCompleted.project_name} / {latestCompleted.model_name}
              </p>
              <p className="big">{formatPercent(latestCompleted.total_return)}</p>
              <p className="muted">
                expected return on {formatMoney(latestCompleted.total_allocated)} · {formatDateTime(latestCompleted.completed_at)}
              </p>
              <Link to={`/dashboard/results/${latestCompleted.run_id}`} className="btn primary small">
                View results
              </Link>
            </>
          ) : (
            <p className="muted">No completed runs yet. Build a model and run your first optimization.</p>
          )}
        </div>

        <div className="card">
          <h2>Quick actions</h2>
          <div className="actions">
            <Link to="/dashboard/projects" className="btn primary small">Projects</Link>
            <Link to="/dashboard/model-builder" className="btn primary small">Build a model</Link>
            <Link to="/dashboard/data-upload" className="btn primary small">Upload data</Link>
            <Link to="/dashboard/run-optimization" className="btn primary small">Run optimization</Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Recent runs</h2>
          <Link to="/dashboard/history" className="link">View full history</Link>
        </div>

        {recentRuns.length === 0 ? (
          <p className="muted">No runs yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>When</th><th>Project / Model</th><th>Status</th><th>Expected return</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.run_id}>
                    <td>{formatDateTime(run.created_at)}</td>
                    <td>{run.project_name} / {run.model_name}</td>
                    <td><StatusBadge status={run.status} /></td>
                    <td>{run.status === "Completed" ? formatPercent(run.total_return) : "—"}</td>
                    <td><Link to={`/dashboard/results/${run.run_id}`} className="link">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}