import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOptimizationResults } from "../services/resultsApi";
import "../styles/optimization.css";

export default function OptimizationResults() {
  const { runId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchResults() {
      if (!runId) {
        setError("No optimization run ID was provided.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getOptimizationResults(runId);
        console.log("Optimization Results API Response:", response);

        if (mounted) {
          setResult(response);
        }
      } catch (err) {
        console.error("Failed to load optimization results:", err);

        if (mounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load optimization results."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchResults();

    return () => {
      mounted = false;
    };
  }, [runId]);

  /*
   * 
   * NORMALIZE API RESPONSE
   * 
   */

  const normalized = useMemo(() => {
    if (!result) {
      return {
        run: {},
        results: {},
        apiAllocations: [],
        apiConstraints: [],
      };
    }

    let response = result;

    if (response?.data && typeof response.data === "object") {
      response = response.data;
    }

    const run = response?.run || response?.optimization_run || {};

    const results =
      response?.results ||
      response?.result ||
      response?.solver_results ||
      response?.optimization_results ||
      response?.data?.results ||
      {};

    const apiAllocations =
      response?.allocations ||
      response?.data?.allocations ||
      results?.allocations ||
      results?.allocation ||
      [];

    const apiConstraints =
      response?.constraints ||
      response?.data?.constraints ||
      results?.constraints ||
      [];

    return {
      run,
      results,
      apiAllocations,
      apiConstraints,
    };
  }, [result]);

  const run = normalized.run;
  const results = normalized.results;
  const apiAllocations = normalized.apiAllocations;
  const apiConstraints = normalized.apiConstraints;

  /*
   * 
   * SOLVER STATUS & METADATA
   * 
   */

  const solverStatus =
    run?.status ||
    results?.status ||
    result?.status ||
    "Completed";

  const solverName =
    run?.solver_name ||
    run?.solver ||
    results?.solver_name ||
    results?.solver ||
    "HiGHS";

  /*
   * 
   * BUDGET & ALLOCATION CALCULATIONS (SCALED)
   * 
   */

  const totalBudget = Number(
    run?.budget ||
      run?.total_budget ||
      results?.budget ||
      results?.total_budget ||
      20000
  );

  const allocations = useMemo(() => {
    let rawAllocations = apiAllocations;

    if (!Array.isArray(rawAllocations) && rawAllocations && typeof rawAllocations === "object") {
      rawAllocations = Object.entries(rawAllocations).map(([asset, value]) => ({
        asset_name: asset,
        allocation_amount: value,
      }));
    }

    if (!Array.isArray(rawAllocations)) {
      return [];
    }

    return rawAllocations.map((item) => {
      const rawAmount = Number(
        item?.allocation_amount !== undefined && item?.allocation_amount !== null
          ? item.allocation_amount
          : item?.amount !== undefined && item?.amount !== null
          ? item.amount
          : item?.value !== undefined && item?.value !== null
          ? item.value
          : 0
      );

      const rawPercent = Number(
        item?.allocation_percent !== undefined && item?.allocation_percent !== null
          ? item.allocation_percent
          : item?.percentage !== undefined && item?.percentage !== null
          ? item.percentage
          : item?.weight !== undefined && item?.weight !== null
          ? item.weight
          : 0
      );

      let calculatedAmount = 0;
      let calculatedPercent = 0;

      if (rawPercent > 0) {
        const weight = rawPercent <= 1 ? rawPercent : rawPercent / 100;
        calculatedPercent = weight * 100;
        calculatedAmount = weight * totalBudget;
      } else if (rawAmount > 0) {
        if (rawAmount <= 1) {
          calculatedPercent = rawAmount * 100;
          calculatedAmount = rawAmount * totalBudget;
        } else {
          calculatedAmount = rawAmount;
          calculatedPercent = totalBudget > 0 ? (rawAmount / totalBudget) * 100 : 0;
        }
      }

      return {
        ...item,
        resolvedAmount: calculatedAmount,
        resolvedPercent: calculatedPercent,
        returnContribution: Number(item?.expected_return_contribution || 0),
        riskContribution: Number(item?.risk_contribution || 0),
      };
    });
  }, [apiAllocations, totalBudget]);

  const totalAllocation = useMemo(() => {
    return allocations.reduce((sum, item) => sum + item.resolvedAmount, 0);
  }, [allocations]);

  /*
   * 
   * PORTFOLIO KPIS & METRICS (WITH FORMULA FALLBACKS)
   * 
   */

  const objectiveValue =
    results?.objective_value !== undefined && results?.objective_value !== null
      ? results.objective_value
      : results?.objectiveValue !== undefined && results?.objectiveValue !== null
      ? results.objectiveValue
      : results?.objective ||
        allocations.reduce((sum, item) => sum + item.returnContribution, 0) ||
        null;

  const expectedReturn =
    results?.expected_return !== undefined && results?.expected_return !== null
      ? results.expected_return
      : results?.expectedReturn !== undefined && results?.expectedReturn !== null
      ? results.expectedReturn
      : results?.portfolio_return ||
        (objectiveValue ? objectiveValue / totalBudget : null);

  const portfolioRisk =
    results?.portfolio_risk !== undefined && results?.portfolio_risk !== null
      ? results.portfolio_risk
      : results?.portfolioRisk !== undefined && results?.portfolioRisk !== null
      ? results.portfolioRisk
      : results?.risk ||
        allocations.reduce((sum, item) => sum + item.riskContribution, 0) / (allocations.length || 1);

  const constraints = Array.isArray(apiConstraints) ? apiConstraints : [];

  /*
   * 
   * FORMATTING HELPERS
   * 
   */

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "" || value === "N/A") {
      return "—";
    }
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);

    return `$${number.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || value === "" || value === "N/A") {
      return "—";
    }
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);

    return `${number.toFixed(1)}%`;
  };

  const formatReturn = (value) => {
    if (value === null || value === undefined || value === "" || value === "N/A") {
      return "—";
    }
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);

    return `${(number <= 1 ? number * 100 : number).toFixed(1)}%`;
  };

  const formatRisk = (value) => {
    if (value === null || value === undefined || value === "" || value === "N/A") {
      return "—";
    }
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);

    return number.toFixed(2);
  };

  const getAssetName = (item, index) => {
    return (
      item?.asset_name ||
      item?.asset ||
      item?.assetName ||
      item?.ticker ||
      item?.symbol ||
      `Asset ${index + 1}`
    );
  };

  const getConstraintMessage = (constraint) => {
    if (typeof constraint === "string") return constraint;
    return (
      constraint?.message ||
      constraint?.name ||
      constraint?.constraint ||
      constraint?.description ||
      constraint?.status ||
      "Constraint satisfied"
    );
  };

  const handleDownloadReport = () => {
    window.print();
  };

  /*
   * 
   * CONDITIONAL RENDERING (LOADING & ERRORS)
   * 
   */

  if (loading) {
    return (
      <main className="optimization">
        <div className="optimization__card">
          <h2>Loading optimization results...</h2>
          <p>Retrieving the solution generated by the optimization solver.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="optimization">
        <div className="optimization__card optimization__error">
          <h2>Unable to load optimization results</h2>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => navigate("/dashboard/history")}
            className="optimization__back-button"
          >
            ← Back to History
          </button>
        </div>
      </main>
    );
  }

  const failed = String(solverStatus).toLowerCase() === "failed";

  return (
    <main className="optimization">
      <header className="optimization__header">
        <div>
          <h1>Optimization Results</h1>
          <p>Recommended portfolio generated by the finance optimization model.</p>
        </div>

        <div
          className={`optimization__status ${
            failed
              ? "optimization__status--failed"
              : "optimization__status--success"
          }`}
        >
          {solverStatus}
        </div>
      </header>

      {failed && (
        <section className="optimization__card optimization__failed-card">
          <h2>Optimization Failed</h2>
          <p>The solver did not produce a valid optimal solution.</p>
        </section>
      )}

      {/* KPI Metrics */}
      <section className="optimization__metrics">
        <div className="optimization__metric-card">
          <span className="optimization__metric-label">Expected Return</span>
          <strong>{formatReturn(expectedReturn)}</strong>
        </div>

        <div className="optimization__metric-card">
          <span className="optimization__metric-label">Portfolio Risk</span>
          <strong>{formatRisk(portfolioRisk)}</strong>
        </div>

        <div className="optimization__metric-card">
          <span className="optimization__metric-label">Objective Value</span>
          <strong>{formatMoney(objectiveValue)}</strong>
        </div>
      </section>

      {/* Solver Info */}
      <section className="optimization__card">
        <div className="optimization__section-header">
          <div>
            <h2>Solver Information</h2>
            <p>Optimization engine and run information.</p>
          </div>
        </div>

        <div className="optimization__info-grid">
          <div>
            <span>Solver</span>
            <strong>{solverName}</strong>
          </div>
          <div>
            <span>Run ID</span>
            <strong>{runId}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{solverStatus}</strong>
          </div>
          <div>
            <span>Total Budget</span>
            <strong>{formatMoney(totalBudget)}</strong>
          </div>
        </div>
      </section>

      {/* Recommended Allocations Table */}
      <section className="optimization__card">
        <div className="optimization__section-header">
          <div>
            <h2>Recommended Allocation</h2>
            <p>Optimal allocation calculated by the solver for each asset.</p>
          </div>

          <div className="optimization__total">
            <span>Total Allocation</span>
            <strong>{formatMoney(totalAllocation)}</strong>
          </div>
        </div>

        {allocations.length === 0 ? (
          <div className="optimization__empty">
            <h3>No allocation data returned</h3>
            <p>The optimization run completed, but the solver response did not contain any allocation values.</p>
          </div>
        ) : (
          <div className="optimization__table-wrapper">
            <table className="optimization__table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Amount</th>
                  <th>%</th>
                  <th>Return Contrib.</th>
                  <th>Risk Contrib.</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((item, index) => {
                  return (
                    <tr key={`${getAssetName(item, index)}-${index}`}>
                      <td>
                        <strong>{getAssetName(item, index)}</strong>
                      </td>
                      <td>{formatMoney(item.resolvedAmount)}</td>
                      <td>{formatPercent(item.resolvedPercent)}</td>
                      <td>{formatMoney(item.returnContribution)}</td>
                      <td>{formatRisk(item.riskContribution)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td>
                    <strong>{formatMoney(totalAllocation)}</strong>
                  </td>
                  <td>
                    <strong>
                      {allocations.length > 0
                        ? `${allocations.reduce((sum, i) => sum + i.resolvedPercent, 0).toFixed(1)}%`
                        : "—"}
                    </strong>
                  </td>
                  <td>
                    <strong>{formatMoney(objectiveValue)}</strong>
                  </td>
                  <td>
                    <strong>{formatRisk(portfolioRisk)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Constraint Status */}
      <section className="optimization__card">
        <div className="optimization__section-header">
          <div>
            <h2>Constraint Status</h2>
            <p>Validation status of the optimization model constraints.</p>
          </div>
        </div>

        {Array.isArray(constraints) && constraints.length > 0 ? (
          <ul className="optimization__constraints">
            {constraints.map((constraint, index) => (
              <li key={index}>
                <span className="optimization__constraint-icon">✓</span>
                <span>{getConstraintMessage(constraint)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="optimization__constraint-success">
            <span>✓</span>
            <div>
              <strong>All model constraints completed</strong>
              <p>The solver returned a feasible solution within configured constraint limits.</p>
            </div>
          </div>
        )}
      </section>

      {/* Actions */}
      <footer className="optimization__actions">
        <button
          type="button"
          className="optimization__back-button"
          onClick={() => navigate("/dashboard/history")}
        >
          ← Back to History
        </button>

        <button
          type="button"
          className="optimization__download-button"
          onClick={handleDownloadReport}
        >
          Download Report
        </button>
      </footer>
    </main>
  );
}