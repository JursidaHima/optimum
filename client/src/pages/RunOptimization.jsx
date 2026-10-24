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
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingModel, setLoadingModel] = useState(false);
  const [error, setError] = useState("");

  // Live run state: { runId, status, errorMessage }
  const [run, setRun] = useState(null);
  const [starting, setStarting] = useState(false);
  const pollTimer = useRef(null);

  const model = models.find((m) => String(m.model_id) === String(modelId)) || null;
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

  // 2. Load ALL models of the project whenever a project is selected
  useEffect(() => {
    if (!selectedProjectId) {
      setModels([]);
      setModelId("");
      return undefined;
    }

    let cancelled = false;
    async function loadModels() {
      setLoadingModel(true);
      setError("");
      try {
        const data = await modelsApi.list(selectedProjectId);
        if (cancelled) return;
        const list = data.models || [];
        setModels(list);
        setModelId(list.length ? String(list[0].model_id) : "");
      } catch (err) {
        if (cancelled) return;
        setModels([]);
        setModelId("");
        setError(err.message || "Unable to load the models of this project.");
      } finally {
        if (!cancelled) setLoadingModel(false);
      }
    }

    loadModels();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  function selectProject(projectId) {
    clearTimeout(pollTimer.current);
    setRun(null);
    setSelectedProjectId(projectId);
  }

  function selectModel(id) {
    clearTimeout(pollTimer.current);
    setRun(null);
    setModelId(id);
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
      setError("Please select a project and a model before running.");
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
      <header className="header">
        <div>
          <h1>Run Optimization</h1>
          <p>Select a project, choose one of its models, and solve it with the HiGHS optimization solver.</p>
        </div>
      </header>

      {error && <div className="error" role="alert">{error}</div>}

      <section className="card spaced">
        <h2>Select Project</h2>
        <div className="group">
          <label htmlFor="run-project" className="label">Project</label>
          <select
            id="run-project"
            value={selectedProjectId}
            onChange={(e) => selectProject(e.target.value)}
            className="select full"
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
            <div className="card">Loading model details...</div>
          ) : !model ? (
            <section className="card">
              <h2>No model found</h2>
              <p>This project does not have a saved financial model yet.</p>
              <button type="button" className="btn primary" onClick={() => navigate("/dashboard/model-builder")}>
                Go to Model Builder
              </button>
            </section>
          ) : (
            <section className="card">
              <h2>Choose a model</h2>
              <p>{models.length} model{models.length === 1 ? "" : "s"} in this project. Pick the one to run.</p>

              <ul className="models">
                {models.map((m) => {
                  const on = String(m.model_id) === String(modelId);
                  return (
                    <li key={m.model_id}>
                      <label className={on ? "on" : ""}>
                        <input
                          type="radio"
                          name="model"
                          value={m.model_id}
                          checked={on}
                          disabled={running}
                          onChange={() => selectModel(String(m.model_id))}
                        />
                        <span>
                          <strong>{m.model_name}</strong>
                          <small>
                            {m.objective_type} · {m.asset_count} asset{Number(m.asset_count) === 1 ? "" : "s"}
                          </small>
                        </span>
                        <span className="budget">
                          {m.total_budget ? `$${Number(m.total_budget).toLocaleString()}` : "N/A"}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <button type="button" className="btn primary" disabled={running} onClick={handleRun}>
                {running ? "Running Optimization..." : `Run "${model?.model_name}"`}
              </button>

              {run && (
                <div className="run" role="status" aria-live="polite">
                  <h3>Run #{run.runId}</h3>
                  <RunStatusSteps status={run.status} />

                  {run.status === "Failed" && (
                    <div className="error">
                      <strong>Optimization failed.</strong>
                      <p>{run.errorMessage || "The solver could not produce a solution."}</p>
                      <div className="actions">
                        <button type="button" className="btn primary small" onClick={() => navigate("/dashboard/model-builder")}>
                          Edit Model
                        </button>
                        <button type="button" className="btn primary small" onClick={() => navigate(`/dashboard/results/${run.runId}`)}>
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