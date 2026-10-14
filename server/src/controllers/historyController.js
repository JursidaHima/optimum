import { query } from "../config/db.js";
import { assertOwnsProject } from "./projectsController.js";

export async function getHistory(req, res) {
  const projectId = req.params.id;

  await assertOwnsProject(projectId, req.user.id);

  const runs = await query(
    `
      SELECT
        r.run_id,
        r.project_id,
        r.model_id,
        r.solver_name,
        r.status,
        r.objective_value,
        r.total_allocated,
        r.total_return,
        r.total_risk,
        r.error_message,
        r.created_at,
        r.started_at,
        r.completed_at,
        m.model_name,
        m.objective_type
      FROM Optimization_Runs r
      INNER JOIN Models m
        ON m.model_id = r.model_id
      WHERE r.project_id = ?
      ORDER BY r.created_at DESC
    `,
    [projectId],
  );

  res.json({
    runs,
  });
}
