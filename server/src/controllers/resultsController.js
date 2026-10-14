import { query } from "../config/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import { assertOwnsProject } from "./projectsController.js";

export async function getResults(req, res) {
  const runId = req.params.runId;

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
        AND p.user_id = ?
      LIMIT 1
    `,
    [runId, req.user.id],
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

  res.json({
    run,
    allocations,
    constraints,
  });
}
