import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getOptimizationResults } from "../services/resultsApi";
import { adminApi } from "../services/adminApi";
import StatusBadge from "../components/StatusBadge.jsx";
import RunStatusSteps from "../components/RunStatusSteps.jsx";
import {
  formatDateTime,
  formatDuration,
  formatMoney,
  formatNumber,
  formatPercent,
  isFinished,
} from "../utils/format";
import "../styles/optimization-results.css";

const POLL_MS = 1500;
const CHART_COLORS = ["#0f766e", "#12263f", "#d97706", "#7c3aed", "#0284c7", "#be123c", "#65a30d", "#6b7280"];

// admin = true when an administrator opens a run from Solver & Jobs
export default function OptimizationResults({ admin = false }) {
  const { runId } = useParams();
  const navigate = useNavigate();

  // Everything shown here comes from the API response for this run (the HiGHS solver output
  // that the server saved): run summary, allocations and constraint checks.
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const backPath = admin ? "/admin/jobs" : "/dashboard/history";
  const backLabel = admin ? "← Back to Jobs" : "← Back to History";

  const status = data?.run?.status;
  const finished = isFinished(status);

  // Load the run, and keep polling while it is still Pending or Running.
  useEffect(() => {
    let cancelled = false;
    let timer;

    async function load() {
      try {
        const response = admin ? await adminApi.getRunResults(runId) : await getOptimizationResults(runId);
        if (cancelled) return;
        setData(response);
        setError("");
        if (!isFinished(response.run.status)) timer = setTimeout(load, POLL_MS);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load optimization results.");
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [runId, admin]);

  if (error) {
    return (
      <main className="optimization-results">
        <div className="error" role="alert">
          <h2>Unable to load optimization results</h2>
          <p>{error}</p>
          <button type="button" className="btn primary small" onClick={() => navigate(backPath)}>
            {backLabel}
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="optimization-results">
        <div className="card"><p>Loading results…</p></div>
      </main>
    );
  }

  const { run, allocations, constraints } = data;
  const budget = Number(run.total_budget);
  const failed = status === "Failed";
  const completed = status === "Completed";
  const violated = constraints.filter((c) => !c.satisfied);

  const chartData = allocations
    .filter((a) => Number(a.allocation_percent) > 0)
    .map((a) => ({ name: a.asset_name, value: Number(a.allocation_percent) }));

  const headerLine = completed
    ? `Showing results for Run #${run.run_id}, completed ${formatDateTime(run.completed_at)}.`
    : failed
    ? `Run #${run.run_id} failed on ${formatDateTime(run.completed_at)}.`
    : `Run #${run.run_id} is ${status}. This page updates automatically.`;

  return (
    <main className="optimization-results">
      <header className="header">
        <div>
          <h1>Optimization Results</h1>
          <p>{headerLine}</p>
          <p className="sub">
            {run.model_name} · {run.objective_type} · Budget {formatMoney(budget)} · Solver {run.solver_name}
          </p>
        </div>
        <StatusBadge status={status} />
      </header>

      <section className="card">
        <RunStatusSteps status={status} />
      </section>

      {!finished && (
        <section className="card" role="status">
          <h2>{status === "Pending" ? "Waiting to start…" : "Solving…"}</h2>
          <p>The HiGHS solver is working on your model. Results will appear here as soon as the run completes.</p>
        </section>
      )}

      {failed && (
        <section className="error" role="alert">
          <h2>Optimization failed</h2>
          <p>{run.error_message || "The solver could not produce a solution."}</p>
          {!admin && (
            <button type="button" className="btn primary small" onClick={() => navigate("/dashboard/model-builder")}>
              Edit Model
            </button>
          )}
        </section>
      )}

      {completed && (
        <>
          <section className="kpis">
            <div className="kpi">
              <span>Expected return</span>
              <strong>{formatPercent(run.total_return)}</strong>
            </div>
            <div className="kpi">
              <span>Budget used</span>
              <strong>{formatMoney(run.total_allocated)}</strong>
              <small>of {formatMoney(budget)}</small>
            </div>
            <div className="kpi">
              <span>Portfolio risk score</span>
              <strong>{formatNumber(run.total_risk)}</strong>
            </div>
            <div className="kpi">
              <span>Solve time</span>
              <strong>{formatDuration(run.solve_duration_ms)}</strong>
            </div>
          </section>

          <section className="grid">
            <div className="card">
              <h2>Allocation</h2>
              {chartData.length === 0 ? (
                <p>The solver allocated nothing to any asset.</p>
              ) : (
                <>
                  <div className="chart">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                          {chartData.map((entry, index) => (
                            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="legend">
                    {chartData.map((entry, index) => (
                      <li key={entry.name}>
                        <span
                          className={`swatch color${index % CHART_COLORS.length}`}
                          aria-hidden="true"
                        />
                        {entry.name} — {entry.value.toFixed(2)}%
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="card">
              <h2>Constraint checklist</h2>
              {violated.length > 0 && (
                <p className="warn" role="alert">
                  {violated.length} constraint{violated.length === 1 ? "" : "s"} not satisfied.
                </p>
              )}
              {constraints.length === 0 ? (
                <p>This model has no extra constraints. The budget and each asset's allocation limits were enforced.</p>
              ) : (
                <ul className="constraints">
                  {constraints.map((c) => (
                    <li
                      key={c.id}
                      className={`constraint ${c.satisfied ? "ok" : "bad"}`}
                    >
                      <span className="constraint-icon" aria-hidden="true">{c.satisfied ? "✓" : "✕"}</span>
                      <div>
                        <strong>{c.label}</strong>
                        <p>
                          Target {c.operator} {formatNumber(c.target_value)} · Actual {formatNumber(c.actual_value)} ·{" "}
                          {c.satisfied ? "Satisfied" : "Violated"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="card">
            <h2>Recommended allocation</h2>
            {allocations.length === 0 ? (
              <p>No allocation rows were saved for this run.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Amount</th>
                      <th>% of budget</th>
                      <th>Return contribution</th>
                      <th>Risk contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((a) => (
                      <tr key={a.result_id}>
                        <td><strong>{a.asset_name}</strong></td>
                        <td>{formatMoney(a.allocation_amount)}</td>
                        <td>{formatPercent(a.allocation_percent)}</td>
                        <td>{formatPercent(a.expected_return_contribution)}</td>
                        <td>{formatNumber(a.risk_contribution)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>Total</strong></td>
                      <td><strong>{formatMoney(run.total_allocated)}</strong></td>
                      <td><strong>{formatPercent(allocations.reduce((s, a) => s + Number(a.allocation_percent), 0))}</strong></td>
                      <td><strong>{formatPercent(run.total_return)}</strong></td>
                      <td><strong>{formatNumber(run.total_risk)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <footer className="actions">
        <button type="button" className="btn primary small" onClick={() => navigate(backPath)}>
          {backLabel}
        </button>
        {completed && (
          <button type="button" className="btn primary small" onClick={() => window.print()}>
            Download Report
          </button>
        )}
      </footer>
    </main>
  );
}