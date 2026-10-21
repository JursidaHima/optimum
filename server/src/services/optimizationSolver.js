import loadHighs from "highs";

function formatNumber(value) {
  return Number(value).toFixed(8);
}

function sanitizeVariableName(name, index) {
  const cleaned = String(name)
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_");

  // Always start with a letter: LP variable names cannot begin with a digit
  return `x${index}_${cleaned || "asset"}`;
}

function getConstraintExpression(constraint, assets) {
  const type = constraint.constraint_type.toLowerCase();

  /*
   * Budget/allocation constraint:
   * x1 + x2 + x3 ...
   */
  if (
    type.includes("budget") ||
    type.includes("allocation") ||
    type.includes("total")
  ) {
    return assets
      .map(
        (asset, index) => `1 ${sanitizeVariableName(asset.asset_name, index)}`,
      )
      .join(" + ");
  }

  // Expected return constraint
  if (type.includes("return")) {
    return assets
      .map(
        (asset, index) =>
          `${formatNumber(asset.expected_return)} ${sanitizeVariableName(
            asset.asset_name,
            index,
          )}`,
      )
      .join(" + ");
  }

  // Risk score constraint
  if (type.includes("risk")) {
    return assets
      .map(
        (asset, index) =>
          `${formatNumber(asset.risk_score)} ${sanitizeVariableName(
            asset.asset_name,
            index,
          )}`,
      )
      .join(" + ");
  }

  return null;
}

function buildLpProblem({ model, assets, constraints }) {
  const maximize = model.objective_type === "Maximize Return";

  const objective = assets
    .map(
      (asset, index) =>
        `${formatNumber(
          maximize ? asset.expected_return : asset.risk_score,
        )} ${sanitizeVariableName(asset.asset_name, index)}`,
    )
    .join(" + ");

  const lines = [];

  lines.push(maximize ? "Maximize" : "Minimize");
  lines.push(` objective: ${objective}`);

  lines.push("Subject To");

  //The portfolio allocation percentages must sum up to 100%.
  const budgetExpression = assets
    .map((asset, index) => `1 ${sanitizeVariableName(asset.asset_name, index)}`)
    .join(" + ");

  lines.push(` budget: ${budgetExpression} = 100`);

  // Add user-defined constraints
  constraints.forEach((constraint, index) => {
    const expression = getConstraintExpression(constraint, assets);

    if (!expression) {
      return;
    }

    lines.push(
      ` constraint_${index + 1}: ${expression} ${
        constraint.operator
      } ${formatNumber(constraint.target_value)}`,
    );
  });

  //Asset bounds using raw percentage values directly (0 to 100).
  lines.push("Bounds");

  assets.forEach((asset, index) => {
    const variable = sanitizeVariableName(asset.asset_name, index);

    lines.push(
      `${formatNumber(asset.min_allocation)} <= ${variable} <= ${formatNumber(
        asset.max_allocation,
      )}`,
    );
  });

  lines.push("End");

  return {
    lp: lines.join("\n"),
    variableMap: assets.map((asset, index) => ({
      variable: sanitizeVariableName(asset.asset_name, index),
      assetName: asset.asset_name,
    })),
  };
}

export async function solveOptimization({ model, assets, constraints }) {
  const highs = await loadHighs();

  const { lp, variableMap } = buildLpProblem({
    model,
    assets,
    constraints,
  });

  const solution = highs.solve(lp, {
    output_flag: false,
  });

  if (solution.Status === "Infeasible") {
    throw new Error(
      "No feasible solution found. The budget, allocation limits and constraints contradict each other. Edit the model and try again.",
    );
  }

  if (solution.Status !== "Optimal") {
    throw new Error(
      `HiGHS could not find an optimal solution. Solver status: ${solution.Status}`,
    );
  }

  const columns = {};

  for (const item of variableMap) {
    const column = solution.Columns[item.variable];

    columns[item.assetName] = {
      primal: Number(column?.Primal || 0),
    };
  }

  return {
    status: solution.Status,
    objectiveValue: Number(solution.ObjectiveValue || 0),
    columns,
    raw: solution,
  };
}
