import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../services/adminApi";
import { formatDateTime, formatDuration, RUN_STATUSES } from "../../utils/format";
import StatusBadge from "../../components/StatusBadge.jsx";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.overview().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="alert alert--error" role="alert">{error}</p>;
  if (!data) return <p>Loading…</p>;

  return (
    <section className="admin">
      <header className="admin__header">
        <h1>Admin Dashboard</h1>
        <p>Platform overview: users, templates and solver activity.</p>
      </header>

      <div className="admin__kpis">
        <div className="admin__kpi"><span>Optimizers</span><strong>{data.users.total}</strong></div>
        <div className="admin__kpi"><span>Active</span><strong>{data.users.active}</strong></div>
        <div className="admin__kpi"><span>Suspended</span><strong>{data.users.suspended}</strong></div>
        <div className="admin__kpi"><span>Projects</span><strong>{data.projects}</strong></div>
        <div className="admin__kpi"><span>Templates</span><strong>{data.templates}</strong></div>
      </div>

      <div className="admin__card">
        <div className="admin__card-head">
          <h2>Optimization runs by status</h2>
          <Link to="/admin/jobs" className="btn btn--primary btn--sm">Open job monitor</Link>
        </div>
        <div className="admin__kpis admin__kpis--4">
          {RUN_STATUSES.map((status) => (
            <div key={status} className="admin__kpi">
              <span><StatusBadge status={status} /></span>
              <strong>{data.runs[status]}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="admin__card">
        <div className="admin__card-head">
          <h2>System performance</h2>
        </div>
        <div className="admin__kpis admin__kpis--4">
          <div className="admin__kpi"><span>Avg solve time</span><strong>{formatDuration(data.performance.avgSolveMs)}</strong></div>
          <div className="admin__kpi"><span>Slowest solve</span><strong>{formatDuration(data.performance.maxSolveMs)}</strong></div>
          <div className="admin__kpi"><span>Failure rate</span><strong>{(data.performance.failureRate * 100).toFixed(0)}%</strong></div>
          <div className="admin__kpi"><span>Runs in last 24 h</span><strong>{data.performance.runsLast24h}</strong></div>
        </div>
      </div>

      <div className="admin__card">
        <div className="admin__card-head">
          <h2>Recent failed jobs</h2>
          <Link to="/admin/jobs" className="admin__link">View all jobs</Link>
        </div>
        {data.recentFailed.length === 0 ? (
          <p className="admin__muted">No failed jobs. Everything is running well.</p>
        ) : (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr><th>Run</th><th>When</th><th>User</th><th>Project / Model</th><th>Why it failed</th></tr>
              </thead>
              <tbody>
                {data.recentFailed.map((job) => (
                  <tr key={job.run_id}>
                    <td>#{job.run_id}</td>
                    <td>{formatDateTime(job.created_at)}</td>
                    <td>{job.email}</td>
                    <td>{job.project_name} / {job.model_name}</td>
                    <td>{job.error_message || "No error message was recorded."}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin__card">
        <div className="admin__card-head">
          <h2>Recent activity</h2>
          <Link to="/admin/audit-log" className="admin__link">View full audit log</Link>
        </div>
        {data.recentActivity.length === 0 ? (
          <p className="admin__muted">No activity recorded yet.</p>
        ) : (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr><th>When</th><th>User</th><th>Action</th><th>Details</th></tr>
              </thead>
              <tbody>
                {data.recentActivity.map((log) => (
                  <tr key={log.log_id}>
                    <td>{formatDateTime(log.timestamp)}</td>
                    <td>{log.email || "—"}</td>
                    <td><code>{log.action_type}</code></td>
                    <td>{log.details || "—"}</td>
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