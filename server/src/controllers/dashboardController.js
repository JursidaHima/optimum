import { query } from "../config/db.js";

const STATUSES = ["Pending", "Running", "Completed", "Failed"];

// GET /api/dashboard/summary
// Overview numbers for the logged-in Optimizer only.
export async function getDashboardSummary(req, res) {
  const userId = req.user.id;

  const [projects] = await query(
    "SELECT COUNT(*) AS total FROM Projects WHERE user_id = ?",
    [userId],
  );

  const [models] = await query(
    `SELECT COUNT(*) AS total FROM Models m
     JOIN Projects p ON p.project_id = m.project_id 
     WHERE p.user_id = ?`,
    [userId],
  );

  const [datasets] = await query(
    `SELECT COUNT(*) AS total FROM Datasets d
     JOIN Projects p ON p.project_id = d.project_id 
     WHERE p.user_id = ?`,
    [userId],
  );

  const statusRows = await query(
    `SELECT o.status, COUNT(*) AS count FROM Optimization_Runs o
     JOIN Projects p ON p.project_id = o.project_id
     WHERE p.user_id = ? GROUP BY o.status`,
    [userId],
  );

  const runs = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const row of statusRows) {
    runs[row.status] = Number(row.count);
  }

  const recentRuns = await query(
    `SELECT o.run_id, o.status, o.total_return, o.created_at, o.error_message,
            p.project_id, p.project_name, m.model_name, m.objective_type
     FROM Optimization_Runs o
     JOIN Projects p ON p.project_id = o.project_id
     JOIN Models m ON m.model_id = o.model_id
     WHERE p.user_id = ?
     ORDER BY o.created_at DESC, o.run_id DESC LIMIT 5`,
    [userId],
  );

  const [latestCompleted] = await query(
    `SELECT o.run_id, o.total_return, o.total_allocated, o.completed_at,
            p.project_name, m.model_name, m.total_budget
     FROM Optimization_Runs o
     JOIN Projects p ON p.project_id = o.project_id
     JOIN Models m ON m.model_id = o.model_id
     WHERE p.user_id = ? AND o.status = 'Completed'
     ORDER BY o.completed_at DESC, o.run_id DESC LIMIT 1`,
    [userId],
  );

  res.json({
    counts: {
      projects: Number(projects.total),
      models: Number(models.total),
      datasets: Number(datasets.total),
      runs: STATUSES.reduce((sum, s) => sum + runs[s], 0),
    },
    runs,
    recentRuns,
    latestCompleted: latestCompleted || null,
  });
}
