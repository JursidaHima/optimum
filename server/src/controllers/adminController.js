import { query } from "../config/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import { MESSAGES } from "../utils/messages.js";
import { logAction } from "../utils/audit.js";
import { createRun, startRun } from "../services/runService.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RUN_STATUSES = ["Pending", "Running", "Completed", "Failed"];

// Dashboard admin

// GET /api/admin/overview
// Returns dashboard statistics and recent activity
export async function getOverview(req, res) {
  const [users] = await query(`
    SELECT
      COUNT(*) AS total,
      SUM(status = 'Active') AS active,
      SUM(status = 'Suspended') AS suspended
    FROM Users u
    JOIN Roles r ON r.role_id = u.role_id
    WHERE r.role_name = 'Optimizer'
  `);

  const [projects] = await query("SELECT COUNT(*) AS total FROM Projects");

  const [templates] = await query(
    "SELECT COUNT(*) AS total FROM System_Templates",
  );

  const rows = await query(`
    SELECT status, COUNT(*) AS count
    FROM Optimization_Runs
    GROUP BY status
  `);

  const runs = {
    Pending: 0,
    Running: 0,
    Completed: 0,
    Failed: 0,
  };

  for (const row of rows) {
    runs[row.status] = Number(row.count);
  }

  const activity = await query(`
    SELECT a.log_id, a.user_id, a.action_type,
           a.details, a.timestamp, u.email
    FROM Audit_Logs a
    LEFT JOIN Users u ON u.user_id = a.user_id
    ORDER BY a.timestamp DESC, a.log_id DESC
    LIMIT 10
  `);

  res.json({
    users: {
      total: Number(users.total || 0),
      active: Number(users.active || 0),
      suspended: Number(users.suspended || 0),
    },
    projects: Number(projects.total),
    templates: Number(templates.total),
    runs,
    recentActivity: activity,
  });
}

// Users

// Helper to find a user by ID and avoid repeated SQL queries
async function findUser(userId) {
  const users = await query(
    `SELECT u.user_id, u.name, u.surname, u.email,
            u.status, u.created_at, r.role_name
     FROM Users u
     JOIN Roles r ON r.role_id = u.role_id
     WHERE u.user_id = ?`,
    [userId],
  );

  if (!users.length) {
    throw new ApiError(404, MESSAGES.notFound);
  }

  return users[0];
}

// GET /api/admin/users?search=&status=
export async function listUsers(req, res) {
  const { search = "", status = "" } = req.query;
  const where = [];
  const params = [];

  if (String(search).trim()) {
    const like = `%${String(search).trim()}%`;
    where.push("(u.name LIKE ? OR u.surname LIKE ? OR u.email LIKE ?)");
    params.push(like, like, like);
  }
  if (status === "Active" || status === "Suspended") {
    where.push("u.status = ?");
    params.push(status);
  }

  const users = await query(
    `SELECT u.user_id, u.name, u.surname, u.email, u.status, u.created_at, r.role_name,
        (SELECT COUNT(*) FROM Projects p WHERE p.user_id = u.user_id) AS project_count,
        (SELECT COUNT(*) FROM Optimization_Runs o JOIN Projects p ON p.project_id = o.project_id
           WHERE p.user_id = u.user_id) AS run_count,
        (SELECT MAX(s.created_at) FROM Sessions s WHERE s.user_id = u.user_id) AS last_login
     FROM Users u JOIN Roles r ON r.role_id = u.role_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY u.created_at DESC`,
    params,
  );
  res.json({ users });
}

// GET /api/admin/users/:id   (profile / activity)
export async function getUser(req, res) {
  const user = await findUser(req.params.id);

  const activity = await query(
    `SELECT log_id, action_type, details, timestamp FROM Audit_Logs
     WHERE user_id = ? ORDER BY timestamp DESC, log_id DESC LIMIT 20`,
    [user.user_id],
  );
  const runs = await query(
    `SELECT o.run_id, o.status, o.created_at, p.project_name, m.model_name
     FROM Optimization_Runs o
     JOIN Projects p ON p.project_id = o.project_id
     JOIN Models m ON m.model_id = o.model_id
     WHERE p.user_id = ? ORDER BY o.created_at DESC LIMIT 10`,
    [user.user_id],
  );
  res.json({ user, activity, runs });
}

// PUT /api/admin/users/:id { name, surname, email }
export async function updateUser(req, res) {
  const user = await findUser(req.params.id);
  if (user.role_name !== "Optimizer") {
    throw new ApiError(403, "Only Optimizer accounts can be edited here.");
  }

  const { name = "", surname = "", email = "" } = req.body;
  if (!name.trim()) throw new ApiError(400, MESSAGES.required("Name"), "name");
  if (!surname.trim())
    throw new ApiError(400, MESSAGES.required("Surname"), "surname");
  if (!EMAIL_REGEX.test(email.trim()))
    throw new ApiError(400, MESSAGES.invalidEmail, "email");

  const cleanEmail = email.trim().toLowerCase();
  const clash = await query(
    "SELECT user_id FROM Users WHERE email = ? AND user_id <> ?",
    [cleanEmail, user.user_id],
  );
  if (clash.length) throw new ApiError(409, MESSAGES.emailExists, "email");

  await query(
    "UPDATE Users SET name = ?, surname = ?, email = ? WHERE user_id = ?",
    [name.trim(), surname.trim(), cleanEmail, user.user_id],
  );
  await logAction(
    req.user.id,
    "ADMIN_USER_UPDATED",
    `Edited user #${user.user_id} (${cleanEmail}).`,
  );

  res.json({
    user: await findUser(user.user_id),
    message: MESSAGES.userUpdated,
  });
}

async function setStatus(req, res, status) {
  const user = await findUser(req.params.id);
  if (user.user_id === req.user.id)
    throw new ApiError(400, MESSAGES.cannotSuspendSelf);
  if (user.role_name !== "Optimizer")
    throw new ApiError(403, MESSAGES.cannotSuspendAdmin);

  await query("UPDATE Users SET status = ? WHERE user_id = ?", [
    status,
    user.user_id,
  ]);
  if (status === "Suspended") {
    await query("DELETE FROM Sessions WHERE user_id = ?", [user.user_id]);
  }
  await logAction(
    req.user.id,
    status === "Suspended" ? "ADMIN_USER_SUSPENDED" : "ADMIN_USER_REACTIVATED",
    `User #${user.user_id} (${user.email}) set to ${status}.`,
  );

  res.json({
    user: await findUser(user.user_id),
    message:
      status === "Suspended"
        ? MESSAGES.userSuspended
        : MESSAGES.userReactivated,
  });
}

// POST /api/admin/users/:id/suspend
export const suspendUser = (req, res) => setStatus(req, res, "Suspended");
// POST /api/admin/users/:id/reactivate
export const reactivateUser = (req, res) => setStatus(req, res, "Active");

// Templates

function validateTemplate(body) {
  const { templateName = "", description = "", defaultConfigJson = "" } = body;

  if (!String(templateName).trim()) {
    throw new ApiError(400, "Template name is required.", "templateName");
  }
  if (String(templateName).trim().length > 150) {
    throw new ApiError(
      400,
      "Template name must be 150 characters or fewer.",
      "templateName",
    );
  }
  if (!String(description).trim()) {
    throw new ApiError(400, "Description is required.", "description");
  }

  let config;
  try {
    config =
      typeof defaultConfigJson === "string"
        ? JSON.parse(defaultConfigJson)
        : defaultConfigJson;
  } catch {
    throw new ApiError(
      400,
      "Default configuration is not valid JSON.",
      "defaultConfigJson",
    );
  }
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new ApiError(
      400,
      "Default configuration must be a JSON object.",
      "defaultConfigJson",
    );
  }

  const field = "defaultConfigJson";
  if (!["Maximize Return", "Minimize Risk"].includes(config.objectiveType)) {
    throw new ApiError(
      400,
      'objectiveType must be "Maximize Return" or "Minimize Risk".',
      field,
    );
  }
  if (!(Number(config.totalBudget) > 0)) {
    throw new ApiError(400, "totalBudget must be greater than 0.", field);
  }
  if (!Array.isArray(config.assets) || config.assets.length === 0) {
    throw new ApiError(400, "assets must contain at least one asset.", field);
  }
  for (const a of config.assets) {
    if (!a || !String(a.assetName || "").trim()) {
      throw new ApiError(400, "Every asset needs an assetName.", field);
    }
    for (const key of [
      "expectedReturn",
      "riskScore",
      "minAllocation",
      "maxAllocation",
    ]) {
      if (
        a[key] === undefined ||
        a[key] === "" ||
        Number.isNaN(Number(a[key]))
      ) {
        throw new ApiError(
          400,
          `Asset "${a.assetName}": ${key} must be a number.`,
          field,
        );
      }
    }
    if (Number(a.minAllocation) > Number(a.maxAllocation)) {
      throw new ApiError(
        400,
        `Asset "${a.assetName}": ${MESSAGES.allocationMinMax}`,
        field,
      );
    }
  }
  if (config.constraints !== undefined) {
    if (!Array.isArray(config.constraints)) {
      throw new ApiError(400, "constraints must be an array.", field);
    }
    for (const c of config.constraints) {
      if (
        !c ||
        !String(c.constraintType || "").trim() ||
        !["=", "<=", ">="].includes(c.operator) ||
        Number.isNaN(Number(c.targetValue)) ||
        c.targetValue === "" ||
        c.targetValue === undefined
      ) {
        throw new ApiError(
          400,
          "Each constraint needs constraintType, operator (=, <=, >=) and a numeric targetValue.",
          field,
        );
      }
    }
  }

  return {
    templateName: String(templateName).trim(),
    description: String(description).trim(),
    json: JSON.stringify(config, null, 2),
  };
}

async function findTemplate(id) {
  const rows = await query(
    "SELECT * FROM System_Templates WHERE template_id = ?",
    [id],
  );
  if (!rows[0]) throw new ApiError(404, MESSAGES.notFound);
  return rows[0];
}

// GET /api/admin/templates
export async function listTemplates(req, res) {
  const templates = await query(
    "SELECT * FROM System_Templates ORDER BY created_at DESC, template_id DESC",
  );
  res.json({ templates });
}

// POST /api/admin/templates
export async function createTemplate(req, res) {
  const t = validateTemplate(req.body);
  const result = await query(
    "INSERT INTO System_Templates (template_name, description, default_config_json) VALUES (?, ?, ?)",
    [t.templateName, t.description, t.json],
  );
  await logAction(
    req.user.id,
    "ADMIN_TEMPLATE_CREATED",
    `Template #${result.insertId} "${t.templateName}".`,
  );
  res
    .status(201)
    .json({
      template: await findTemplate(result.insertId),
      message: MESSAGES.templateCreated,
    });
}

// PUT /api/admin/templates/:id
export async function updateTemplate(req, res) {
  await findTemplate(req.params.id);
  const t = validateTemplate(req.body);
  await query(
    "UPDATE System_Templates SET template_name = ?, description = ?, default_config_json = ? WHERE template_id = ?",
    [t.templateName, t.description, t.json, req.params.id],
  );
  await logAction(
    req.user.id,
    "ADMIN_TEMPLATE_UPDATED",
    `Template #${req.params.id} "${t.templateName}".`,
  );
  res.json({
    template: await findTemplate(req.params.id),
    message: MESSAGES.templateUpdated,
  });
}

// DELETE /api/admin/templates/:id
export async function deleteTemplate(req, res) {
  const template = await findTemplate(req.params.id);
  await query("DELETE FROM System_Templates WHERE template_id = ?", [
    template.template_id,
  ]);
  await logAction(
    req.user.id,
    "ADMIN_TEMPLATE_DELETED",
    `Template #${template.template_id} "${template.template_name}".`,
  );
  res.json({ message: MESSAGES.templateDeleted });
}

//Solver / jobs

// GET /api/admin/jobs?status=
export async function listJobs(req, res) {
  const { status = "" } = req.query;
  const filter = RUN_STATUSES.includes(status);

  const jobs = await query(
    `SELECT o.run_id, o.status, o.solver_name, o.error_message, o.created_at, o.started_at, o.completed_at,
        o.solve_duration_ms AS duration_ms,
        p.project_name, m.model_name, u.user_id, u.email
     FROM Optimization_Runs o
     JOIN Projects p ON p.project_id = o.project_id
     JOIN Models m ON m.model_id = o.model_id
     JOIN Users u ON u.user_id = p.user_id
     ${filter ? "WHERE o.status = ?" : ""}
     ORDER BY o.created_at DESC, o.run_id DESC LIMIT 200`,
    filter ? [status] : [],
  );

  const counts = await query(
    "SELECT status, COUNT(*) AS count FROM Optimization_Runs GROUP BY status",
  );
  const summary = Object.fromEntries(RUN_STATUSES.map((s) => [s, 0]));
  for (const row of counts) summary[row.status] = Number(row.count);

  const [perf] = await query(
    `SELECT AVG(solve_duration_ms) AS avg_ms
     FROM Optimization_Runs WHERE status = 'Completed' AND solve_duration_ms IS NOT NULL`,
  );
  const finished = summary.Completed + summary.Failed;

  res.json({
    jobs,
    summary: {
      ...summary,
      avgSolveMs:
        perf?.avg_ms === null || perf?.avg_ms === undefined
          ? null
          : Number(perf.avg_ms),
      failureRate: finished > 0 ? summary.Failed / finished : 0,
    },
  });
}

// POST /api/admin/jobs/:runId/retry  – re-submits the same model as a new run
export async function retryJob(req, res) {
  const [run] = await query(
    "SELECT run_id, project_id, model_id, status FROM Optimization_Runs WHERE run_id = ?",
    [req.params.runId],
  );
  if (!run) throw new ApiError(404, MESSAGES.notFound);
  if (run.status !== "Failed")
    throw new ApiError(400, MESSAGES.onlyFailedRetry);

  const newRunId = await createRun(run.project_id, run.model_id);
  await logAction(
    req.user.id,
    "ADMIN_JOB_RETRIED",
    `Run #${run.run_id} retried as run #${newRunId}.`,
  );
  startRun(newRunId, req.user.id);

  res
    .status(202)
    .json({ runId: newRunId, status: "Pending", message: MESSAGES.jobRetried });
}

// Audit log

// GET /api/admin/audit-logs?limit=
export async function listAuditLogs(req, res) {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || 100, 1),
    500,
  );
  const logs = await query(
    `SELECT a.log_id, a.user_id, a.action_type, a.details, a.timestamp, u.email
     FROM Audit_Logs a LEFT JOIN Users u ON u.user_id = a.user_id
     ORDER BY a.timestamp DESC, a.log_id DESC LIMIT ${limit}`,
  );
  res.json({ logs });
}
