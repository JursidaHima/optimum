import { query } from "../config/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import { assertOwnsProject } from "./projectsController.js";

const MAX_ROWS = 5000;

function validateRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ApiError(400, "Dataset must contain at least one row.", "rows");
  }
  if (rows.length > MAX_ROWS) {
    throw new ApiError(
      400,
      `Dataset cannot contain more than ${MAX_ROWS} rows.`,
      "rows",
    );
  }

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    if (!row.ticker_or_asset || !String(row.ticker_or_asset).trim()) {
      throw new ApiError(
        400,
        `Row ${rowNumber}: asset name is required.`,
        "rows",
      );
    }
    if (
      row.historical_return === "" ||
      Number.isNaN(Number(row.historical_return))
    ) {
      throw new ApiError(
        400,
        `Row ${rowNumber}: historical_return must be numeric.`,
        "rows",
      );
    }
    if (row.volatility === "" || Number.isNaN(Number(row.volatility))) {
      throw new ApiError(
        400,
        `Row ${rowNumber}: volatility must be numeric.`,
        "rows",
      );
    }
  }
}

export async function listDatasets(req, res) {
  await assertOwnsProject(req.params.id, req.user.id);
  const datasets = await query(
    `SELECT dataset_id, project_id, file_name, file_path, row_count, uploaded_at
     FROM Datasets WHERE project_id = ? ORDER BY uploaded_at DESC`,
    [req.params.id],
  );
  res.json({ datasets });
}

export async function createDataset(req, res) {
  const projectId = req.params.id;
  await assertOwnsProject(projectId, req.user.id);

  const { fileName = "", rows = [] } = req.body;
  if (!fileName.trim())
    throw new ApiError(400, "File name is required.", "fileName");
  if (!/\.(csv|json)$/i.test(fileName)) {
    throw new ApiError(400, "Please upload a CSV or JSON file.", "fileName");
  }

  validateRows(rows);

  const result = await query(
    `INSERT INTO Datasets (project_id, file_name, file_path, row_count)
     VALUES (?, ?, ?, ?)`,
    [projectId, fileName.trim(), fileName.trim(), rows.length],
  );

  for (const row of rows) {
    await query(
      `INSERT INTO Portfolio_Rows
       (dataset_id, ticker_or_asset, historical_return, volatility)
       VALUES (?, ?, ?, ?)`,
      [
        result.insertId,
        String(row.ticker_or_asset).trim(),
        Number(row.historical_return),
        Number(row.volatility),
      ],
    );
  }

  res.status(201).json({
    message: "Data confirmed attached to project.",
    datasetId: result.insertId,
    rowCount: rows.length,
  });
}
