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

  if (error) return <p className="alert alert--error" role="alert">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const { counts, runs, recentRuns, latestCompleted } = data;

  return (
    <section className="user-dash">
      <header className="user-dash__header">
        <h1>Welcome back{user?.name ? `, ${user.name}` : ""}</h1>
        <p>Your optimization workspace at a glance.</p>
      </header>

      <div className="user-dash__kpis">
        <div className="user-dash__kpi"><span>Projects</span><strong>{counts.projects}</strong></div>
        <div className="user-dash__kpi"><span>Models</span><strong>{counts.models}</strong></div>
        <div className="user-dash__kpi"><span>Datasets</span><strong>{counts.datasets}</strong></div>
        <div className="user-dash__kpi"><span>Total runs</span><strong>{counts.runs}</strong></div>
      </div>

      <div className="user-dash__grid">
        <div className="user-dash__card">
          <h2>Runs by status</h2>
          <ul className="user-dash__status-list">
            {RUN_STATUSES.map((status) => (
              <li key={status}>
                <StatusBadge status={status} />
                <strong>{runs[status]}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="user-dash__card">
          <h2>Latest completed result</h2>
          {latestCompleted ? (
            <>
              <p className="user-dash__muted">
                {latestCompleted.project_name} / {latestCompleted.model_name}
              </p>
              <p className="user-dash__big">{formatPercent(latestCompleted.total_return)}</p>
              <p className="user-dash__muted">
                expected return on {formatMoney(latestCompleted.total_allocated)} · {formatDateTime(latestCompleted.completed_at)}
              </p>
              <Link to={`/dashboard/results/${latestCompleted.run_id}`} className="btn btn--primary btn--sm">
                View results
              </Link>
            </>
          ) : (
            <p className="user-dash__muted">No completed runs yet. Build a model and run your first optimization.</p>
          )}
        </div>

        <div className="user-dash__card">
          <h2>Quick actions</h2>
          <div className="user-dash__actions">
            <Link to="/dashboard/projects" className="btn btn--primary btn--sm">Projects</Link>
            <Link to="/dashboard/model-builder" className="btn btn--primary btn--sm">Build a model</Link>
            <Link to="/dashboard/data-upload" className="btn btn--primary btn--sm">Upload data</Link>
            <Link to="/dashboard/run-optimization" className="btn btn--primary btn--sm">Run optimization</Link>
          </div>
        </div>
      </div>

      <div className="user-dash__card">
        <div className="user-dash__card-head">
          <h2>Recent runs</h2>
          <Link to="/dashboard/history" className="user-dash__link">View full history</Link>
        </div>

        {recentRuns.length === 0 ? (
          <p className="user-dash__muted">No runs yet.</p>
        ) : (
          <div className="user-dash__table-wrap">
            <table className="user-dash__table">
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
                    <td><Link to={`/dashboard/results/${run.run_id}`} className="user-dash__link">View</Link></td>
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