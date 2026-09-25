import { query } from "../config/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import { assertOwnsProject } from "./projectsController.js";

/*
 * Validate the Model Builder data.
 */
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

/*
 * GET /api/projects/:id/model
 *
 * Loads the latest model belonging to the project.
 */
export async function getModel(req, res) {
  const projectId = req.params.id;

  // Verify project ownership.
  await assertOwnsProject(projectId, req.user.id);

  const models = await query(
    `
      SELECT
        model_id,
        project_id,
        model_name,
        objective_type,
        total_budget,
        created_at
      FROM Models
      WHERE project_id = ?
      ORDER BY model_id DESC
      LIMIT 1
    `,
    [projectId],
  );

  if (models.length === 0) {
    return res.json({
      model: null,
      assets: [],
      constraints: [],
    });
  }

  const model = models[0];

  const assets = await query(
    `
      SELECT
        asset_id,
        model_id,
        asset_name,
        expected_return,
        risk_score,
        min_allocation,
        max_allocation
      FROM Model_Assets
      WHERE model_id = ?
      ORDER BY asset_id ASC
    `,
    [model.model_id],
  );

  const constraints = await query(
    `
      SELECT
        constraint_id,
        model_id,
        constraint_type,
        target_value,
        operator
      FROM Model_Constraints
      WHERE model_id = ?
      ORDER BY constraint_id ASC
    `,
    [model.model_id],
  );

  res.json({
    model,
    assets,
    constraints,
  });
}

/*
 * POST /api/projects/:id/model
 *
 * Creates or updates the project's model.
 */
export async function saveModel(req, res) {
  const projectId = req.params.id;

  // Verify ownership first.
  await assertOwnsProject(projectId, req.user.id);

  // Validate incoming data.
  validateModel(req.body);

  const {
    modelName,
    objectiveType,
    totalBudget,
    assets,
    constraints = [],
  } = req.body;

  /*
   * Check if the project already has a model.
   */
  const existingModels = await query(
    `
      SELECT model_id
      FROM Models
      WHERE project_id = ?
      ORDER BY model_id DESC
      LIMIT 1
    `,
    [projectId],
  );

  let modelId;

  /*
   * Existing model:
   * update it and replace assets/constraints.
   */
  if (existingModels.length > 0) {
    modelId = existingModels[0].model_id;

    await query(
      `
        UPDATE Models
        SET
          model_name = ?,
          objective_type = ?,
          total_budget = ?
        WHERE model_id = ?
      `,
      [modelName.trim(), objectiveType, Number(totalBudget), modelId],
    );

    /*
     * Remove old assets.
     */
    await query(
      `
        DELETE FROM Model_Assets
        WHERE model_id = ?
      `,
      [modelId],
    );

    /*
     * Remove old constraints.
     */
    await query(
      `
        DELETE FROM Model_Constraints
        WHERE model_id = ?
      `,
      [modelId],
    );
  } else {
    /*
     * Create a new model.
     */
    const result = await query(
      `
        INSERT INTO Models
        (
          project_id,
          model_name,
          objective_type,
          total_budget
        )
        VALUES (?, ?, ?, ?)
      `,
      [projectId, modelName.trim(), objectiveType, Number(totalBudget)],
    );

    modelId = result.insertId;
  }

  /*
   * Insert assets.
   */
  for (const asset of assets) {
    await query(
      `
        INSERT INTO Model_Assets
        (
          model_id,
          asset_name,
          expected_return,
          risk_score,
          min_allocation,
          max_allocation
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
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

  /*
   * Insert constraints.
   */
  for (const constraint of constraints) {
    await query(
      `
        INSERT INTO Model_Constraints
        (
          model_id,
          constraint_type,
          target_value,
          operator
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        modelId,
        constraint.constraintType.trim(),
        Number(constraint.targetValue),
        constraint.operator,
      ],
    );
  }

  res.status(201).json({
    message: "Model saved successfully.",
    modelId,
  });
}
