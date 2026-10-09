import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi } from "../services/projectsApi";
import { getRunHistory } from "../services/historyApi";
import "../styles/optimization.css";

export default function RunHistory() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All statuses");
  const [history, setHistory] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  //  Load projects on mount and default to the first project
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

  //  Fetch history whenever selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) {
      setHistory([]);
      return;
    }

    async function loadHistoryForProject() {
      setLoadingHistory(true);
      setError("");
      try {
        const data = await getRunHistory(selectedProjectId);
        setHistory(Array.isArray(data) ? data : data.history || data.runs || []);
      } catch (err) {
        setError("Unable to load run history for this project.");
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    }

    loadHistoryForProject();
  }, [selectedProjectId]);

  // 3. Filter history runs based on the selected status dropdown
  const filteredHistory = history.filter((run) => {
    if (selectedStatus === "All statuses") return true;
    return (run.status || "").toLowerCase() === selectedStatus.toLowerCase();
  });

  const selectedProjectName = projects.find(
    (p) => String(p.project_id || p.id) === String(selectedProjectId)
  )?.project_name || projects.find(
    (p) => String(p.project_id || p.id) === String(selectedProjectId)
  )?.name || "Project";

  if (loadingProjects) {
    return <div className="optimization">Loading projects...</div>;
  }

  return (
    <main className="optimization">
      <header className="optimization__header">
        <div>
          <h1>History</h1>
          <p>Review your previous optimization runs.</p>
        </div>
      </header>

      {error && <div className="optimization__error">{error}</div>}

      {/* Filter Bar */}
      <section className="optimization__card" style={{ marginBottom: "1.5rem", display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label style={{ fontWeight: "500" }}>Project:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="optimization__select"
            style={{ padding: "0.4rem 0.75rem", borderRadius: "4px" }}
          >
            {projects.map((proj) => (
              <option key={proj.project_id || proj.id} value={proj.project_id || proj.id}>
                {proj.project_name || proj.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label style={{ fontWeight: "500" }}>Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="optimization__select"
            style={{ padding: "0.4rem 0.75rem", borderRadius: "4px" }}
          >
            <option value="All statuses">All statuses</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </section>

      {/* History Table Container */}
      <section className="optimization__card">
        <p style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#666" }}>
          Showing {filteredHistory.length} runs for {selectedProjectName}
        </p>

        {loadingHistory ? (
          <p>Loading run history...</p>
        ) : filteredHistory.length === 0 ? (
          <p>No optimization runs found matching the selected filters.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee", fontSize: "0.85rem", color: "#555" }}>
                <th style={{ padding: "0.75rem" }}>Date & Time</th>
                <th style={{ padding: "0.75rem" }}>Model / Parameters</th>
                <th style={{ padding: "0.75rem" }}>Status</th>
                <th style={{ padding: "0.75rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((run, index) => (
                <tr key={run.run_id || run.id || index} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                    {new Date(run.created_at || Date.now()).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                    {run.model_name || run.parameters || "Model v1"}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                    <span style={{ 
                      color: (run.status || "Completed").toLowerCase() === "failed" ? "#d9534f" : "#28a745",
                      fontWeight: "500"
                    }}>
                      {run.status || "Completed"}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/results/${run.run_id || run.id}`)}
                      style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer", padding: 0 }}
                    >
                      view
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}