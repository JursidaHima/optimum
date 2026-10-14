import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi } from "../services/projectsApi";
import { getRunHistory } from "../services/historyApi";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDateTime, formatPercent, isFinished, RUN_STATUSES } from "../utils/format";
import "../styles/run-history.css";

const ALL = "All statuses";

export default function RunHistory() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(ALL);
  const [history, setHistory] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  // Load projects on mount and default to the first project
  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await projectsApi.list();
        const projectList = Array.isArray(data) ? data : data.projects || [];
        setProjects(projectList);
        if (projectList.length > 0) {
          setSelectedProjectId(projectList[0].project_id || projectList[0].id);
        }
      } catch (err) {
        setError(err.message || "Unable to load projects.");
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  const loadHistory = useCallback(async (projectId, { quiet = false } = {}) => {
    if (!quiet) setLoadingHistory(true);
    setError("");
    try {
      const data = await getRunHistory(projectId);
      setHistory(Array.isArray(data) ? data : data.runs || []);
    } catch {
      setError("Unable to load run history for this project.");
      setHistory([]);
    } finally {
      if (!quiet) setLoadingHistory(false);
    }
  }, []);

  // Fetch history whenever the selected project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setHistory([]);
      return;
    }
    loadHistory(selectedProjectId);
  }, [selectedProjectId, loadHistory]);

  // Keep Pending / Running rows live until they finish.
  const hasActive = history.some((run) => !isFinished(run.status));
  useEffect(() => {
    if (!hasActive || !selectedProjectId) return undefined;
    const timer = setInterval(() => loadHistory(selectedProjectId, { quiet: true }), 3000);
    return () => clearInterval(timer);
  }, [hasActive, selectedProjectId, loadHistory]);

  const filteredHistory = history.filter(
    (run) => selectedStatus === ALL || run.status === selectedStatus,
  );

  const selectedProject = projects.find(
    (p) => String(p.project_id || p.id) === String(selectedProjectId),
  );
  const selectedProjectName = selectedProject?.project_name || selectedProject?.name || "Project";

  if (loadingProjects) {
    return <div className="run-history">Loading projects...</div>;
  }

  return (
    <main className="run-history">
      <header className="run-history__header">
        <h1>History</h1>
        <p>Review your previous optimization runs.</p>
      </header>

      {error && <div className="run-history__error" role="alert">{error}</div>}

      <section className="run-history__card run-history__filters">
        <div className="run-history__filter">
          <label htmlFor="history-project">Project:</label>
          <select id="history-project" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
            {projects.map((proj) => (
              <option key={proj.project_id || proj.id} value={proj.project_id || proj.id}>
                {proj.project_name || proj.name}
              </option>
            ))}
          </select>
        </div>

        <div className="run-history__filter">
          <label htmlFor="history-status">Status:</label>
          <select id="history-status" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {RUN_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="run-history__card">
        <p className="run-history__count">
          Showing {filteredHistory.length} run{filteredHistory.length === 1 ? "" : "s"} for {selectedProjectName}
        </p>

        {loadingHistory ? (
          <p>Loading run history...</p>
        ) : filteredHistory.length === 0 ? (
          <p>No optimization runs found matching the selected filters.</p>
        ) : (
          <div className="run-history__table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Expected return</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((run) => (
                  <tr key={run.run_id}>
                    <td>{formatDateTime(run.created_at)}</td>
                    <td>
                      {run.model_name}
                      <span className="run-history__muted"> · {run.objective_type}</span>
                    </td>
                    <td>
                      <StatusBadge status={run.status} />
                      {run.status === "Failed" && run.error_message && (
                        <span className="run-history__reason">{run.error_message}</span>
                      )}
                    </td>
                    <td>{run.status === "Completed" ? formatPercent(run.total_return) : "—"}</td>
                    <td>
                      <button type="button" className="run-history__view" onClick={() => navigate(`/dashboard/results/${run.run_id}`)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}