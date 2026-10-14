import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi } from "../services/projectsApi";
import { modelsApi } from "../services/modelsApi";
import { runOptimization } from "../services/optimizationApi";
import { getOptimizationResults } from "../services/resultsApi";
import RunStatusSteps from "../components/RunStatusSteps.jsx";
import { isFinished } from "../utils/format";

import "../styles/optimization.css";

const POLL_MS = 1000;

export default function RunOptimization() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [model, setModel] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingModel, setLoadingModel] = useState(false);
  const [error, setError] = useState("");

  // Live run state: { runId, status, errorMessage }
  const [run, setRun] = useState(null);
  const [starting, setStarting] = useState(false);
  const pollTimer = useRef(null);

  const running = starting || (run && !isFinished(run.status));

  useEffect(() => () => clearTimeout(pollTimer.current), []);

  // 1. Load all projects when the page mounts
  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await projectsApi.getAll();
        setProjects(Array.isArray(data) ? data : data.projects || []);
      } catch (err) {
        setError(err.message || "Unable to load projects.");
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  // 2. Load the model whenever a project is selected
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
        if (!data.model) throw new Error("No model");
        setModel(data.model);
      } catch {
        setModel(null);
        setError("No model found for this project. Please build a model first.");
      } finally {
        setLoadingModel(false);
      }
    }

    loadModelForProject();
  }, [selectedProjectId]);

  function selectProject(projectId) {
    clearTimeout(pollTimer.current);
    setRun(null);
    setSelectedProjectId(projectId);
  }

  // Poll the run until it is Completed or Failed.
  async function watchRun(runId) {
    try {
      const { run: latest } = await getOptimizationResults(runId);
      setRun({ runId, status: latest.status, errorMessage: latest.error_message });

      if (latest.status === "Completed") {
        navigate(`/dashboard/results/${runId}`);
      } else if (!isFinished(latest.status)) {
        pollTimer.current = setTimeout(() => watchRun(runId), POLL_MS);
      }
    } catch (err) {
      setError(err.message || "Lost contact with the server while the run was in progress.");
    }
  }

  async function handleRun() {
    if (!model || !selectedProjectId) {
      setError("Please select a project and ensure a model exists before running.");
      return;
    }

    setStarting(true);
    setError("");
    setRun(null);

    try {
      const data = await runOptimization(selectedProjectId, model.model_id);
      setRun({ runId: data.runId, status: data.status, errorMessage: null });
      watchRun(data.runId);
    } catch (err) {
      // Model invalid or incomplete: the server rejects it before a run is created.
      setError(err.message || "Optimization could not start. Please review your model.");
    } finally {
      setStarting(false);
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

      {error && <div className="optimization__error" role="alert">{error}</div>}

      <section className="optimization__card optimization__card--spaced">
        <h2>Select Project</h2>
        <div className="optimization__field">
          <label htmlFor="run-project" className="optimization__label">Project</label>
          <select
            id="run-project"
            value={selectedProjectId}
            onChange={(e) => selectProject(e.target.value)}
            className="optimization__select optimization__select--full"
            disabled={running}
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

      {selectedProjectId && (
        <>
          {loadingModel ? (
            <div className="optimization__card">Loading model details...</div>
          ) : !model ? (
            <section className="optimization__card">
              <h2>No model found</h2>
              <p>This project does not have a saved financial model yet.</p>
              <button type="button" className="btn btn--primary" onClick={() => navigate("/dashboard/model-builder")}>
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
                  <strong>{model.total_budget ? `$${Number(model.total_budget).toLocaleString()}` : "N/A"}</strong>
                </div>
              </div>

              <button type="button" className="btn btn--primary" disabled={running} onClick={handleRun}>
                {running ? "Running Optimization..." : "Run Optimization"}
              </button>

              {run && (
                <div className="optimization__run" role="status" aria-live="polite">
                  <h3>Run #{run.runId}</h3>
                  <RunStatusSteps status={run.status} />

                  {run.status === "Failed" && (
                    <div className="optimization__error">
                      <strong>Optimization failed.</strong>
                      <p>{run.errorMessage || "The solver could not produce a solution."}</p>
                      <div className="optimization__actions">
                        <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate("/dashboard/model-builder")}>
                          Edit Model
                        </button>
                        <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate(`/dashboard/results/${run.runId}`)}>
                          View run details
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}