import { query } from "../config/db.js";
import { assertOwnsProject } from "./projectsController.js";

const RUN_COLUMNS = `
  r.run_id, r.project_id, r.model_id, r.solver_name, r.status,
  r.objective_value, r.total_allocated, r.total_return, r.total_risk,
  r.error_message, r.created_at, r.started_at, r.completed_at,
  m.model_name, m.objective_type, p.project_name
`;

// GET /api/projects/:id/optimization-runs  (one project)
export async function getHistory(req, res) {
  const projectId = req.params.id;
  await assertOwnsProject(projectId, req.user.id);

  const runs = await query(
    `SELECT ${RUN_COLUMNS}
     FROM optimization_runs r
     INNER JOIN Models m ON m.model_id = r.model_id
     INNER JOIN Projects p ON p.project_id = r.project_id
     WHERE r.project_id = ?
     ORDER BY r.created_at DESC`,
    [projectId],
  );

  res.json({ runs });
}

// GET /api/optimization-runs  (all projects of the logged-in user)
export async function getAllHistory(req, res) {
  const runs = await query(
    `SELECT ${RUN_COLUMNS}
     FROM optimization_runs r
     INNER JOIN Models m ON m.model_id = r.model_id
     INNER JOIN Projects p ON p.project_id = r.project_id
     WHERE p.user_id = ?
     ORDER BY r.created_at DESC
     LIMIT 500`,
    [req.user.id],
  );

  res.json({ runs });
}
