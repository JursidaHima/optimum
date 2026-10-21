import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge.jsx";
import { adminApi } from "../../services/adminApi";
import { formatDateTime, formatDuration, RUN_STATUSES } from "../../utils/format";

export default function AdminJobs() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openLog, setOpenLog] = useState(null); // run_id whose error log is shown
  const [retrying, setRetrying] = useState(null);

  const load = useCallback(() => {
    adminApi.listJobs(status).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  // Keep the monitor live while anything is still Pending or Running.
  const hasActive = !!data && (data.summary.Pending > 0 || data.summary.Running > 0);
  useEffect(() => {
    if (!hasActive) return undefined;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [hasActive, load]);

  async function onRetry(job) {
    setRetrying(job.run_id);
    try {
      const res = await adminApi.retryJob(job.run_id);
      setNotice(`${res.message} (new run #${res.runId})`);
      setOpenLog(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRetrying(null);
    }
  }

  return (
    <section className="admin">
      <header className="admin__header">
        <h1>Solver &amp; Jobs</h1>
        <p>Monitor HiGHS runs across the platform, inspect failures and retry them.</p>
      </header>

      {notice && <p className="alert alert--success" role="status">{notice}</p>}
      {error && <p className="alert alert--error" role="alert">{error}</p>}
      {data && (
        <>
          <div className="admin__kpis admin__kpis--6">
            {RUN_STATUSES.map((s) => (
              <div key={s} className="admin__kpi"><span><StatusBadge status={s} /></span><strong>{data.summary[s]}</strong></div>
            ))}
            <div className="admin__kpi"><span>Avg solve time</span><strong>{formatDuration(data.summary.avgSolveMs)}</strong></div>
            <div className="admin__kpi"><span>Failure rate</span><strong>{(data.summary.failureRate * 100).toFixed(0)}%</strong></div>
          </div>
          <div className="admin__kpis admin__kpis--3">
            <div className="admin__kpi"><span>Slowest solve</span><strong>{formatDuration(data.summary.maxSolveMs)}</strong></div>
            <div className="admin__kpi"><span>Runs in last 24 h</span><strong>{data.summary.runsLast24h}</strong></div>
            <div className="admin__kpi"><span>Failed in last 24 h</span><strong>{data.summary.failedLast24h}</strong></div>
          </div>
        </>
      )}

      <div className="admin__card admin__filters">
        <label className="admin__filter">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {RUN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn--ghost btn--sm btn--dark" onClick={() => setStatus("Failed")}>Show failed only</button>
        <button type="button" className="btn btn--ghost btn--sm btn--dark" onClick={load}>Refresh</button>
      </div>

      <div className="admin__card">
        {!data ? (
          <p>Loading…</p>
        ) : data.jobs.length === 0 ? (
          <p className="admin__muted">No runs found.</p>
        ) : (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Run</th><th>User</th><th>Project / Model</th><th>Status</th>
                  <th>Solver</th><th>Started</th><th>Solve time</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.jobs.map((job) => (
                  <FragmentRow
                    key={job.run_id}
                    job={job}
                    open={openLog === job.run_id}
                    retrying={retrying === job.run_id}
                    onToggle={() => setOpenLog(openLog === job.run_id ? null : job.run_id)}
                    onRetry={() => onRetry(job)}
                    onView={() => navigate(`/admin/results/${job.run_id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function FragmentRow({ job, open, retrying, onToggle, onRetry, onView }) {
  const failed = job.status === "Failed";
  const completed = job.status === "Completed";
  return (
    <>
      <tr>
        <td>#{job.run_id}</td>
        <td>{job.email}</td>
        <td>{job.project_name} / {job.model_name}</td>
        <td><StatusBadge status={job.status} /></td>
        <td>{job.solver_name}</td>
        <td>{formatDateTime(job.started_at || job.created_at)}</td>
        <td>{formatDuration(job.duration_ms)}</td>
        <td className="admin__row-actions">
          {completed && <button type="button" className="admin__link-btn" onClick={onView}>View results</button>}
          {failed && <button type="button" className="admin__link-btn" onClick={onToggle}>{open ? "Hide log" : "Error log"}</button>}
          {failed && (
            <button type="button" className="admin__link-btn" onClick={onRetry} disabled={retrying}>
              {retrying ? "Retrying…" : "Retry"}
            </button>
          )}
        </td>
      </tr>
      {failed && open && (
        <tr className="admin__log-row">
          <td colSpan={8}>
            <strong>Error log for run #{job.run_id}</strong>
            <pre className="admin__log">{job.error_message || "No error message was recorded."}</pre>
          </td>
        </tr>
      )}
    </>
  );
}