import { query } from "../config/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import { assertOwnsProject } from "./projectsController.js";

/* Validate the Model Builder data. */
function validateModel(body) {
  const {
    modelName,
    objectiveType,
    totalBudget,
    assets,
    constraints = [],
  } = body;

  if (!modelName || !modelName.trim()) {
    throw new ApiError(400, "Model name is required.", "modelName");
  }

  if (
    objectiveType !== "Maximize Return" &&
    objectiveType !== "Minimize Risk"
  ) {
    throw new ApiError(400, "Invalid objective type.", "objectiveType");
  }

  if (
    totalBudget === undefined ||
    totalBudget === null ||
    Number.isNaN(Number(totalBudget)) ||
    Number(totalBudget) <= 0
  ) {
    throw new ApiError(
      400,
      "Total budget must be greater than 0.",
      "totalBudget",
    );
  }

  if (!Array.isArray(assets) || assets.length === 0) {
    throw new ApiError(400, "At least one asset is required.", "assets");
  }

  for (const asset of assets) {
    if (!asset.assetName || !asset.assetName.trim()) {
      throw new ApiError(400, "Every asset must have a name.", "assets");
    }

    if (
      asset.expectedReturn === undefined ||
      Number.isNaN(Number(asset.expectedReturn))
    ) {
      throw new ApiError(
        400,
        `Invalid expected return for ${asset.assetName}.`,
        "assets",
      );
    }

    if (
      asset.riskScore === undefined ||
      Number.isNaN(Number(asset.riskScore))
    ) {
      throw new ApiError(
        400,
        `Invalid risk score for ${asset.assetName}.`,
        "assets",
      );
    }

    if (
      Number.isNaN(Number(asset.minAllocation)) ||
      Number.isNaN(Number(asset.maxAllocation))
    ) {
      throw new ApiError(
        400,
        `Invalid allocation values for ${asset.assetName}.`,
        "assets",
      );
    }

    if (Number(asset.minAllocation) < 0 || Number(asset.maxAllocation) < 0) {
      throw new ApiError(
        400,
        `Allocation values cannot be negative for ${asset.assetName}.`,
        "assets",
      );
    }

    if (Number(asset.minAllocation) > Number(asset.maxAllocation)) {
      throw new ApiError(
        400,
        `Minimum allocation cannot exceed maximum allocation for ${asset.assetName}.`,
        "assets",
      );
    }
  }

  if (!Array.isArray(constraints)) {
    throw new ApiError(400, "Constraints must be an array.", "constraints");
  }

  for (const constraint of constraints) {
    if (!constraint.constraintType || !constraint.constraintType.trim()) {
      throw new ApiError(400, "Constraint type is required.", "constraints");
    }

    if (!["=", "<=", ">="].includes(constraint.operator)) {
      throw new ApiError(400, "Invalid constraint operator.", "constraints");
    }

    if (
      constraint.targetValue === undefined ||
      Number.isNaN(Number(constraint.targetValue))
    ) {
      throw new ApiError(
        400,
        "Constraint target must be a number.",
        "constraints",
      );
    }
  }
}

// Loads a model and makes sure it belongs to the given project.
async function assertOwnsModel(projectId, modelId) {
  const [model] = await query(
    "SELECT * FROM Models WHERE model_id = ? AND project_id = ?",
    [modelId, projectId],
  );
  if (!model) throw new ApiError(404, "Model not found in this project.");
  return model;
}

// Inserts the assets and constraints of a model.
async function insertParts(modelId, assets, constraints) {
  for (const asset of assets) {
    await query(
      `INSERT INTO Model_Assets
         (model_id, asset_name, expected_return, risk_score, min_allocation, max_allocation)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        modelId,
        asset.assetName.trim(),
        Number(asset.expectedReturn),
        Number(asset.riskScore),
        Number(asset.minAllocation),
        Number(asset.maxAllocation),
      ],
    );
  }

  for (const constraint of constraints) {
    await query(
      `INSERT INTO Model_Constraints
         (model_id, constraint_type, target_value, operator)
       VALUES (?, ?, ?, ?)`,
      [
        modelId,
        constraint.constraintType.trim(),
        Number(constraint.targetValue),
        constraint.operator,
      ],
    );
  }
}

/*
 * GET /api/projects/:id/models
 * Every model of the project, newest first.
 */
export async function listModels(req, res) {
  const projectId = req.params.id;
  await assertOwnsProject(projectId, req.user.id);

  const models = await query(
    `SELECT m.model_id, m.project_id, m.model_name, m.objective_type,
            m.total_budget, m.created_at,
            (SELECT COUNT(*) FROM Model_Assets a WHERE a.model_id = m.model_id) AS asset_count
     FROM Models m
     WHERE m.project_id = ?
     ORDER BY m.model_id DESC`,
    [projectId],
  );

  res.json({ models });
}

/*
 * GET /api/projects/:id/model            -> the latest model
 * GET /api/projects/:id/model?modelId=5  -> that specific model
 */
export async function getModel(req, res) {
  const projectId = req.params.id;
  await assertOwnsProject(projectId, req.user.id);

  const wanted = req.query.modelId;
  const models = wanted
    ? await query(
        `SELECT model_id, project_id, model_name, objective_type, total_budget, created_at
         FROM Models WHERE project_id = ? AND model_id = ?`,
        [projectId, wanted],
      )
    : await query(
        `SELECT model_id, project_id, model_name, objective_type, total_budget, created_at
         FROM Models WHERE project_id = ? ORDER BY model_id DESC LIMIT 1`,
        [projectId],
      );

  if (models.length === 0) {
    if (wanted) throw new ApiError(404, "Model not found in this project.");
    return res.json({ model: null, assets: [], constraints: [] });
  }

  const model = models[0];

  const assets = await query(
    `SELECT asset_id, model_id, asset_name, expected_return, risk_score,
            min_allocation, max_allocation
     FROM Model_Assets WHERE model_id = ? ORDER BY asset_id ASC`,
    [model.model_id],
  );

  const constraints = await query(
    `SELECT constraint_id, model_id, constraint_type, target_value, operator
     FROM Model_Constraints WHERE model_id = ? ORDER BY constraint_id ASC`,
    [model.model_id],
  );

  res.json({ model, assets, constraints });
}

/*
 * POST /api/projects/:id/model
 * Body with modelId  -> updates that model
 * Body without it    -> creates a NEW model in the project
 */
export async function saveModel(req, res) {
  const projectId = req.params.id;
  await assertOwnsProject(projectId, req.user.id);

  validateModel(req.body);

  const { modelId: existingId, modelName, objectiveType, totalBudget, assets, constraints = [] } = req.body;

  let modelId;

  if (existingId) {
    await assertOwnsModel(projectId, existingId);
    modelId = Number(existingId);

    await query(
      "UPDATE Models SET model_name = ?, objective_type = ?, total_budget = ? WHERE model_id = ?",
      [modelName.trim(), objectiveType, Number(totalBudget), modelId],
    );
    await query("DELETE FROM Model_Assets WHERE model_id = ?", [modelId]);
    await query("DELETE FROM Model_Constraints WHERE model_id = ?", [modelId]);
  } else {
    const result = await query(
      "INSERT INTO Models (project_id, model_name, objective_type, total_budget) VALUES (?, ?, ?, ?)",
      [projectId, modelName.trim(), objectiveType, Number(totalBudget)],
    );
    modelId = result.insertId;
  }

  await insertParts(modelId, assets, constraints);

  res.status(201).json({ message: "Model saved successfully.", modelId });
}

/*
 * DELETE /api/projects/:id/models/:modelId
 * The model's runs are deleted with it (ON DELETE CASCADE).
 */
export async function deleteModel(req, res) {
  const { id: projectId, modelId } = req.params;
  await assertOwnsProject(projectId, req.user.id);
  await assertOwnsModel(projectId, modelId);

  await query("DELETE FROM Models WHERE model_id = ?", [modelId]);
  res.json({ message: "Model deleted." });
}

/*Post /api/projects/:id/datasets/:datasetId/model
 * Creates a new model in the project based on the dataset.
 */
export async function createModelFromDataset(req, res) {
  const { id: projectId, datasetId } = req.params;
  await assertOwnsProject(projectId, req.user.id);

  const [dataset] = await query(
    "SELECT * FROM Datasets WHERE dataset_id = ? AND project_id = ?",
    [datasetId, projectId],
  );
  if (!dataset) throw new ApiError(404, "Dataset not found in this project.");

  const rows = await query(
    `SELECT ticker_or_asset, historical_return, volatility
     FROM Portfolio_Rows WHERE dataset_id = ? ORDER BY row_id ASC`,
    [datasetId],
  );

  const { modelName, objectiveType = "Maximize Return", totalBudget = 100000 } = req.body || {};

  const body = {
    modelName:
      (modelName && modelName.trim()) ||
      `${dataset.file_name.replace(/\.(csv|json)$/i, "")} model`,
    objectiveType,
    totalBudget,
    assets: rows.map((row) => ({
      assetName: row.ticker_or_asset,
      expectedReturn: Number(row.historical_return),
      riskScore: Number(row.volatility),
      minAllocation: 0,
      maxAllocation: 100,
    })),
    constraints: [],
  };
  body.modelName = body.modelName.slice(0, 150);

  validateModel(body);

  const result = await query(
    "INSERT INTO Models (project_id, model_name, objective_type, total_budget) VALUES (?, ?, ?, ?)",
    [projectId, body.modelName, body.objectiveType, Number(body.totalBudget)],
  );
  await insertParts(result.insertId, body.assets, body.constraints);

  res.status(201).json({
    message: "Model created from dataset.",
    modelId: result.insertId,
  });
}