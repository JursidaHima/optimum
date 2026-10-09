import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi } from "../services/projectsApi"; // Adjust path if needed
import { modelsApi } from "../services/modelsApi";
import { runOptimization } from "../services/optimizationApi";

import "../styles/optimization.css";

export default function RunOptimization() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [model, setModel] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingModel, setLoadingModel] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  // 1. Load all projects when the page mounts
  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await projectsApi.getAll(); // Adjust based on your projectsApi method name
        // Depending on your API response structure, it might be data.projects or just data
        setProjects(Array.isArray(data) ? data : data.projects || []);
      } catch (err) {
        setError(err.message || "Unable to load projects.");
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  // 2. Load the model whenever a project is selected from the dropdown
  useEffect(() => {
    if (!selectedProjectId) {
      setModel(null);
      return;
    }

    async function loadModelForProject() {
      setLoadingModel(true);
      setError("");
      try {
        const data = await modelsApi.get(selectedProjectId);
        setModel(data.model || data);
      } catch (err) {
        setModel(null);
        setError("No model found for this project. Please build a model first.");
      } finally {
        setLoadingModel(false);
      }
    }

    loadModelForProject();
  }, [selectedProjectId]);

  async function handleRun() {
    if (!model || !selectedProjectId) {
      setError("Please select a project and ensure a model exists before running.");
      return;
    }

    setRunning(true);
    setError("");

    try {
      const data = await runOptimization(selectedProjectId, model.model_id);
      navigate(`/dashboard/results/${data.runId}`);
    } catch (err) {
      setError(err.message || "Optimization failed. Please review your model.");
    } finally {
      setRunning(false);
    }
  }

  if (loadingProjects) {
    return <div className="optimization">Loading projects...</div>;
  }

  return (
    <main className="optimization">
      <header className="optimization__header">
        <div>
          <h1>Run Optimization</h1>
          <p>Select a project and solve its model using the HiGHS optimization solver.</p>
        </div>
      </header>

      {error && <div className="optimization__error">{error}</div>}

      {/* Project Selection Dropdown */}
      <section className="optimization__card" style={{ marginBottom: "1.5rem" }}>
        <h2>Select Project</h2>
        <div style={{ marginTop: "0.75rem" }}>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="optimization__select"
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px" }}
          >
            <option value="">-- Choose a project --</option>
            {projects.map((proj) => (
              <option key={proj.project_id || proj.id} value={proj.project_id || proj.id}>
                {proj.project_name || proj.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Model Status Section */}
      {selectedProjectId && (
        <>
          {loadingModel ? (
            <div className="optimization__card">Loading model details...</div>
          ) : !model ? (
            <section className="optimization__card">
              <h2>No model found</h2>
              <p>This project does not have a saved financial model yet.</p>
              <button
                type="button"
                onClick={() => navigate(`/dashboard/model-builder`)}
              >
                Go to Model Builder
              </button>
            </section>
          ) : (
            <section className="optimization__card">
              <h2>{model.model_name || "Model Configuration"}</h2>

              <div className="optimization__summary">
                <div>
                  <span>Objective</span>
                  <strong>{model.objective_type || "N/A"}</strong>
                </div>

                <div>
                  <span>Total Budget</span>
                  <strong>
                    {model.total_budget ? `$${Number(model.total_budget).toLocaleString()}` : "N/A"}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                disabled={running}
                onClick={handleRun}
                style={{ marginTop: "1rem" }}
              >
                {running ? "Running Optimization..." : "Run Optimization"}
              </button>
            </section>
          )}
        </>
      )}
    </main>
  );
}