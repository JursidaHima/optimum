import { query } from "../config/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import { assertOwnsProject } from "./projectsController.js";

// Loads a run with its allocations and constraint checks.
// userId = only that user's runs; null = any run (administrators).
async function loadResults(runId, userId) {
  const runs = await query(
    `
      SELECT
        r.*,
        m.model_name,
        m.objective_type,
        m.total_budget
      FROM Optimization_Runs r
      INNER JOIN Models m
        ON m.model_id = r.model_id
      INNER JOIN Projects p
        ON p.project_id = r.project_id
      WHERE r.run_id = ?
        ${userId === null ? "" : "AND p.user_id = ?"}
      LIMIT 1
    `,
    userId === null ? [runId] : [runId, userId],
  );

  if (runs.length === 0) {
    throw new ApiError(404, "Optimization run not found.");
  }

  const run = runs[0];

  const allocations = await query(
    `
      SELECT
        ar.result_id,
        ar.asset_id,
        ma.asset_name,
        ar.allocation_amount,
        ar.allocation_percent,
        ar.expected_return_contribution,
        ar.risk_contribution
      FROM Optimization_Results ar
      INNER JOIN Model_Assets ma
        ON ma.asset_id = ar.asset_id
      WHERE ar.run_id = ?
      ORDER BY ar.allocation_percent DESC
    `,
    [runId],
  );

  const constraints = await query(
    `
      SELECT
        id,
        label,
        operator,
        target_value,
        actual_value,
        satisfied
      FROM Run_Constraint_Results
      WHERE run_id = ?
      ORDER BY id ASC
    `,
    [runId],
  );

  return { run, allocations, constraints };
}

// GET /api/optimization-runs/:runId  (the owner of the run)
export async function getResults(req, res) {
  res.json(await loadResults(req.params.runId, req.user.id));
}

// GET /api/admin/runs/:runId/results  (administrators, any user's run)
export async function getResultsAdmin(req, res) {
  res.json(await loadResults(req.params.runId, null));
}
