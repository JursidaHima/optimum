import { query } from "../config/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import { MESSAGES } from "../utils/messages.js";

// Loads a project and throws the right error if it doesn't exist (404) or
// belongs to someone else (403). Every other feature that hangs off a
// project imports this same function.
export async function assertOwnsProject(projectId, userId) {
  const rows = await query("SELECT * FROM Projects WHERE project_id = ?", [
    projectId,
  ]);
  const project = rows[0];
  if (!project) throw new ApiError(404, MESSAGES.notFound);
  if (project.user_id !== userId)
    throw new ApiError(403, MESSAGES.accessDenied);
  return project;
}

// GET /api/projects
export async function listProjects(req, res) {
  const rows = await query(
    `SELECT p.*, (SELECT COUNT(*) FROM Models m WHERE m.project_id = p.project_id) AS model_count
     FROM Projects p WHERE p.user_id = ? ORDER BY p.updated_at DESC`,
    [req.user.id],
  );
  res.json({ projects: rows });
}

// GET /api/projects/:id
export async function getProject(req, res) {
  const project = await assertOwnsProject(req.params.id, req.user.id);
  res.json({ project });
}

// POST /api/projects  { projectName, description }
export async function createProject(req, res) {
  const { projectName = "", description = "" } = req.body;
  if (!projectName.trim())
    throw new ApiError(400, MESSAGES.projectNameRequired, "projectName");

  const result = await query(
    "INSERT INTO Projects (user_id, project_name, description) VALUES (?, ?, ?)",
    [req.user.id, projectName.trim(), description || null],
  );
  const [project] = await query("SELECT * FROM Projects WHERE project_id = ?", [
    result.insertId,
  ]);
  res.status(201).json({ project, message: MESSAGES.projectAdded });
}

// PUT /api/projects/:id  { projectName, description }
export async function updateProject(req, res) {
  await assertOwnsProject(req.params.id, req.user.id);
  const { projectName = "", description = "" } = req.body;
  if (!projectName.trim())
    throw new ApiError(400, MESSAGES.projectNameRequired, "projectName");

  await query(
    "UPDATE Projects SET project_name = ?, description = ? WHERE project_id = ?",
    [projectName.trim(), description || null, req.params.id],
  );
  const [project] = await query("SELECT * FROM Projects WHERE project_id = ?", [
    req.params.id,
  ]);
  res.json({ project, message: "Project updated." });
}

// DELETE /api/projects/:id
export async function deleteProject(req, res) {
  await assertOwnsProject(req.params.id, req.user.id);
  await query("DELETE FROM Projects WHERE project_id = ?", [req.params.id]);
  res.json({ message: MESSAGES.projectDeleted });
}
