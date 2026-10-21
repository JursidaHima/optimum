import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi } from "../services/projectsApi";
import { getRunHistory } from "../services/historyApi";
import { getOptimizationResults } from "../services/resultsApi";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDateTime, formatPercent, isFinished, RUN_STATUSES } from "../utils/format";
import "../styles/run-history.css";

const ALL_STATUS = "All statuses";
const ALL_PROJECTS = "all";

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function money(value) {
  const n = asNumber(value);
  return n === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function number(value) {
  const n = asNumber(value);
  return n === null ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);
}

function percent(value) {
  const n = asNumber(value);
  return n === null ? "—" : formatPercent(n);
}

export default function RunHistory() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(ALL_PROJECTS);
  const [status, setStatus] = useState(ALL_STATUS);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");

  useEffect(() => {
    projectsApi.list()
      .then((data) => setProjects(Array.isArray(data) ? data : data.projects || []))
      .catch((err) => setError(err.message || "Unable to load projects."));
  }, []);

  const load = useCallback(async (id, { quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    if (!quiet) setError("");
    try {
      const data = await getRunHistory(id);
      setRuns(Array.isArray(data) ? data : data.runs || []);
    } catch (err) {
      setError(err.message || "Unable to load run history.");
      if (!quiet) setRuns([]);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelectedIds([]);
    setComparison(null);
    setCompareError("");
    load(projectId);
  }, [projectId, load]);

  const active = runs.some((run) => !isFinished(run.status));
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => load(projectId, { quiet: true }), 3000);
    return () => clearInterval(timer);
  }, [active, projectId, load]);

  const shown = runs.filter((run) => status === ALL_STATUS || run.status === status);
  const showProject = projectId === ALL_PROJECTS;
  const projectName = showProject
    ? "all projects"
    : projects.find((p) => String(p.project_id ?? p.id) === String(projectId))?.project_name || "this project";

  function toggleSelection(runId) {
    const id = String(runId);
    setComparison(null);
    setCompareError("");
    setSelectedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 2 ? [...current, id] : current);
  }

  async function compareSelected() {
    if (selectedIds.length !== 2) return;
    setComparing(true);
    setCompareError("");
    setComparison(null);
    try {
      const results = await Promise.all(selectedIds.map((id) => getOptimizationResults(id)));
      if (results.some((result) => !result?.run || result.run.status !== "Completed")) {
        throw new Error("Both runs must have completed results to compare.");
      }
      setComparison(results);
    } catch (err) {
      setCompareError(err.message || "Unable to compare the selected runs.");
    } finally {
      setComparing(false);
    }
  }

  const allocationA = comparison?.[0]?.allocations || [];
  const allocationB = comparison?.[1]?.allocations || [];
  const assetNames = [...new Set([
    ...allocationA.map((item) => item.asset_name),
    ...allocationB.map((item) => item.asset_name),
  ].filter(Boolean))].sort();

  function allocationValue(items, assetName, field) {
    const asset = items.find((item) => item.asset_name === assetName);
    return asset ? asNumber(asset[field]) : 0;
  }

  return (
    <main className="history">
      <div className="head">
        <h1>History</h1>
        <p>Review previous optimization runs and compare saved results.</p>
      </div>

      {error && <div className="bad" role="alert">{error}</div>}

      <section className="card filters">
        <div className="pick">
          <label htmlFor="history-project">Project:</label>
          <select id="history-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value={ALL_PROJECTS}>All projects</option>
            {projects.map((p) => (
              <option key={p.project_id ?? p.id} value={p.project_id ?? p.id}>
                {p.project_name ?? p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="pick">
          <label htmlFor="history-status">Status:</label>
          <select id="history-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value={ALL_STATUS}>{ALL_STATUS}</option>
            {RUN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </section>

      <section className="card">
        <p className="count">Showing {shown.length} run{shown.length === 1 ? "" : "s"} for {projectName}</p>
        <p className="hint">Select two completed runs to compare their results.</p>

        {loading ? (
          <p>Loading run history...</p>
        ) : shown.length === 0 ? (
          <p>No optimization runs found matching the selected filters.</p>
        ) : (
          <div className="wrap">
            <table>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Date &amp; Time</th>
                  {showProject && <th>Project</th>}
                  <th>Model</th>
                  <th>Status</th>
                  <th>Expected return</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((run) => {
                  const id = String(run.run_id);
                  const selectable = run.status === "Completed";
                  const selected = selectedIds.includes(id);
                  return (
                    <tr key={run.run_id} className={selected ? "selected-row" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select run ${id} for comparison`}
                          checked={selected}
                          disabled={!selectable || (selectedIds.length === 2 && !selected)}
                          onChange={() => toggleSelection(id)}
                        />
                      </td>
                      <td>{formatDateTime(run.created_at)}</td>
                      {showProject && <td>{run.project_name}</td>}
                      <td>{run.model_name}<span className="muted"> · {run.objective_type}</span></td>
                      <td><StatusBadge status={run.status} /></td>
                      <td>{selectable ? percent(run.total_return) : "—"}</td>
                      <td>
                        <button type="button" className="view" onClick={() => navigate(`/dashboard/results/${run.run_id}`)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="compare-actions">
          <span>{selectedIds.length} of 2 runs selected</span>
          <button type="button" className="compare-btn" disabled={selectedIds.length !== 2 || comparing} onClick={compareSelected}>
            {comparing ? "Comparing..." : "Compare Selected Runs"}
          </button>
        </div>
        {compareError && <div className="bad" role="alert">{compareError}</div>}
      </section>

      {comparison && (
        <section className="card comparison">
          <div className="comparison-head">
            <div>
              <h2>Optimization Run Comparison</h2>
              <p>Side-by-side results from the two selected runs.</p>
            </div>
            <button type="button" className="clear-btn" onClick={() => {
              setComparison(null);
              setSelectedIds([]);
              setCompareError("");
            }}>Clear Comparison</button>
          </div>

          <h3>Financial Summary</h3>
          <div className="wrap">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Run #{comparison[0].run.run_id}</th>
                  <th>Run #{comparison[1].run.run_id}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Model</td><td>{comparison[0].run.model_name || "—"}</td><td>{comparison[1].run.model_name || "—"}</td></tr>
                <tr><td>Objective</td><td>{comparison[0].run.objective_type || "—"}</td><td>{comparison[1].run.objective_type || "—"}</td></tr>
                <tr><td>Budget</td><td>{money(comparison[0].run.total_budget)}</td><td>{money(comparison[1].run.total_budget)}</td></tr>
                <tr><td>Objective value</td><td>{number(comparison[0].run.objective_value)}</td><td>{number(comparison[1].run.objective_value)}</td></tr>
                <tr><td>Total allocated</td><td>{money(comparison[0].run.total_allocated)}</td><td>{money(comparison[1].run.total_allocated)}</td></tr>
                <tr><td>Expected return</td><td>{percent(comparison[0].run.total_return)}</td><td>{percent(comparison[1].run.total_return)}</td></tr>
                <tr><td>Portfolio risk</td><td>{number(comparison[0].run.total_risk)}</td><td>{number(comparison[1].run.total_risk)}</td></tr>
              </tbody>
            </table>
          </div>

          <h3>Asset Allocation Comparison</h3>
          {assetNames.length === 0 ? (
            <p>No saved asset allocations were returned for these runs.</p>
          ) : (
            <div className="wrap">
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Run #{comparison[0].run.run_id}</th>
                    <th>Run #{comparison[1].run.run_id}</th>
                    <th>Difference (B − A)</th>
                  </tr>
                </thead>
                <tbody>
                  {assetNames.map((assetName) => {
                    const amountA = allocationValue(allocationA, assetName, "allocation_amount");
                    const amountB = allocationValue(allocationB, assetName, "allocation_amount");
                    const pctA = allocationValue(allocationA, assetName, "allocation_percent");
                    const pctB = allocationValue(allocationB, assetName, "allocation_percent");
                    return (
                      <tr key={assetName}>
                        <td>{assetName}</td>
                        <td>{money(amountA)} <span className="muted">· {percent(pctA)}</span></td>
                        <td>{money(amountB)} <span className="muted">· {percent(pctB)}</span></td>
                        <td>{amountA === null || amountB === null ? "—" : money(amountB - amountA)} <span className="muted">· {pctA === null || pctB === null ? "—" : percent(pctB - pctA)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
