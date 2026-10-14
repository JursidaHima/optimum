import { pool, query } from "../config/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import { solveOptimization } from "./optimizationSolver.js";
import { logAction } from "../utils/audit.js";

/*
 * Units used everywhere:
 *   - allocation variables are PERCENT of the budget (0-100), they must sum to 100
 *   - expected_return is in percent, risk_score is a plain score
 *   - the portfolio return / risk are the allocation-weighted averages (x / 100)
 */

const SUPPORTED_CONSTRAINT_WORDS = [
  "budget",
  "allocation",
  "total",
  "return",
  "risk",
];

export function isSupportedConstraint(constraintType) {
  const type = String(constraintType || "").toLowerCase();
  return SUPPORTED_CONSTRAINT_WORDS.some((word) => type.includes(word));
}

function buildConstraintResult(constraint, assets, allocation) {
  const target = Number(constraint.target_value);
  const type = constraint.constraint_type.toLowerCase();

  let actual = 0;
  if (
    type.includes("budget") ||
    type.includes("allocation") ||
    type.includes("total")
  ) {
    actual = assets.reduce(
      (s, a) => s + Number(allocation[a.asset_name] || 0),
      0,
    );
  } else if (type.includes("return")) {
    actual = assets.reduce(
      (s, a) =>
        s + Number(a.expected_return) * Number(allocation[a.asset_name] || 0),
      0,
    );
  } else if (type.includes("risk")) {
    actual = assets.reduce(
      (s, a) =>
        s + Number(a.risk_score) * Number(allocation[a.asset_name] || 0),
      0,
    );
  }

  let satisfied = false;
  if (constraint.operator === "=") satisfied = Math.abs(actual - target) < 0.01;
  if (constraint.operator === "<=") satisfied = actual <= target + 0.01;
  if (constraint.operator === ">=") satisfied = actual >= target - 0.01;

  return {
    label: constraint.constraint_type,
    operator: constraint.operator,
    targetValue: target,
    actualValue: actual,
    satisfied,
  };
}

async function loadModelData(modelId) {
  const [model] = await query("SELECT * FROM Models WHERE model_id = ?", [
    modelId,
  ]);
  const assets = await query(
    `SELECT asset_id, model_id, asset_name, expected_return, risk_score, min_allocation, max_allocation
     FROM Model_Assets WHERE model_id = ? ORDER BY asset_id ASC`,
    [modelId],
  );
  const constraints = await query(
    `SELECT constraint_id, model_id, constraint_type, target_value, operator
     FROM Model_Constraints WHERE model_id = ? ORDER BY constraint_id ASC`,
    [modelId],
  );
  return { model, assets, constraints };
}

/*
 * Validates the model and creates the run in the Pending state.
 * Throws ApiError (400/404) when the model is invalid or incomplete.
 */
export async function createRun(projectId, modelId) {
  const [model] = await query(
    "SELECT model_id FROM Models WHERE model_id = ? AND project_id = ?",
    [modelId, projectId],
  );
  if (!model) {
    throw new ApiError(
      404,
      "The selected model does not belong to this project.",
    );
  }

  const { assets, constraints } = await loadModelData(modelId);

  if (assets.length === 0) {
    throw new ApiError(
      400,
      "The model has no assets. Add at least one asset before running.",
    );
  }
  const badConstraint = constraints.find(
    (c) => !isSupportedConstraint(c.constraint_type),
  );
  if (badConstraint) {
    throw new ApiError(
      400,
      `Constraint "${badConstraint.constraint_type}" is not supported. Constraint names must contain: budget, allocation, total, return or risk.`,
    );
  }

  const insert = await query(
    "INSERT INTO Optimization_Runs (project_id, model_id, solver_name, status) VALUES (?, ?, 'HiGHS', 'Pending')",
    [projectId, modelId],
  );
  return insert.insertId;
}

/*
 * Runs a Pending run in the background: Pending -> Running -> Completed | Failed.
 * The HTTP request does not wait for it; the client polls the run status.
 */
export function startRun(runId, userId = null) {
  setImmediate(() => {
    executeRun(runId, userId).catch((err) =>
      console.error("Run crashed:", err),
    );
  });
}

async function markFailed(runId, message, userId, solveMs = null) {
  await query(
    "UPDATE Optimization_Runs SET status = 'Failed', error_message = ?, solve_duration_ms = ?, completed_at = NOW() WHERE run_id = ?",
    [message, solveMs, runId],
  );
  await logAction(userId, "RUN_FAILED", `Run #${runId}: ${message}`);
}

export async function executeRun(runId, userId = null) {
  await query(
    "UPDATE Optimization_Runs SET status = 'Running', started_at = NOW() WHERE run_id = ?",
    [runId],
  );

  const [run] = await query(
    "SELECT * FROM Optimization_Runs WHERE run_id = ?",
    [runId],
  );
  const { model, assets, constraints } = await loadModelData(run.model_id);

  let solution;
  const solveStart = performance.now();
  try {
    solution = await solveOptimization({ model, assets, constraints });
  } catch (error) {
    return markFailed(
      runId,
      error.message,
      userId,
      Math.round(performance.now() - solveStart),
    );
  }
  const solveMs = Math.round(performance.now() - solveStart);

  const budget = Number(model.total_budget);
  const allocation = {};
  for (const asset of assets) {
    allocation[asset.asset_name] = Number(
      solution.columns[asset.asset_name]?.primal || 0,
    );
  }

  // Check every constraint; a violated constraint is never reported as a successful run.
  const constraintResults = constraints.map((c) =>
    buildConstraintResult(c, assets, allocation),
  );
  const violated = constraintResults.filter((c) => !c.satisfied);
  if (violated.length > 0) {
    return markFailed(
      runId,
      `The solution violates: ${violated.map((v) => v.label).join(", ")}.`,
      userId,
      solveMs,
    );
  }

  const totalPercent = assets.reduce((s, a) => s + allocation[a.asset_name], 0);
  const totalReturn =
    assets.reduce(
      (s, a) => s + Number(a.expected_return) * allocation[a.asset_name],
      0,
    ) / 100;
  const totalRisk =
    assets.reduce(
      (s, a) => s + Number(a.risk_score) * allocation[a.asset_name],
      0,
    ) / 100;
  const objectiveValue = solution.objectiveValue / 100;
  const totalAllocated = (totalPercent / 100) * budget;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const asset of assets) {
      const percent = allocation[asset.asset_name];
      const amount = (percent / 100) * budget;
      await conn.execute(
        `INSERT INTO Optimization_Results
           (run_id, asset_id, allocation_amount, allocation_percent, expected_return_contribution, risk_contribution)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          runId,
          asset.asset_id,
          amount,
          percent,
          (Number(asset.expected_return) * percent) / 100,
          (Number(asset.risk_score) * percent) / 100,
        ],
      );
      await conn.execute(
        `INSERT INTO Asset_Allocations (run_id, asset_name, allocated_amount, allocation_percentage)
         VALUES (?, ?, ?, ?)`,
        [runId, asset.asset_name, amount, percent],
      );
    }

    for (const r of constraintResults) {
      await conn.execute(
        `INSERT INTO Run_Constraint_Results (run_id, label, operator, target_value, actual_value, satisfied)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          runId,
          r.label,
          r.operator,
          r.targetValue,
          r.actualValue,
          r.satisfied ? 1 : 0,
        ],
      );
    }

    await conn.execute(
      `UPDATE Optimization_Runs
       SET status = 'Completed', objective_value = ?, total_allocated = ?, total_return = ?,
           total_risk = ?, solve_duration_ms = ?, error_message = NULL, completed_at = NOW()
       WHERE run_id = ?`,
      [objectiveValue, totalAllocated, totalReturn, totalRisk, solveMs, runId],
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    conn.release();
    return markFailed(
      runId,
      `Could not save the results: ${error.message}`,
      userId,
    );
  }
  conn.release();
  await logAction(userId, "RUN_COMPLETED", `Run #${runId} completed.`);
}

// Runs left Pending/Running by a server restart can never finish, so mark them Failed.
export async function failInterruptedRuns() {
  await query(
    `UPDATE Optimization_Runs
     SET status = 'Failed', error_message = 'Interrupted by a server restart. Please retry.', completed_at = NOW()
     WHERE status IN ('Pending', 'Running')`,
  );
}
