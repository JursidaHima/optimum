
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { projectsApi } from "../services/projectsApi";
import { datasetsApi } from "../services/datasetsApi";
import { modelsApi } from "../services/modelsApi";

import "../styles/data-upload.css";

/* Constraint types */

const CONSTRAINT_TYPES = [
  "Minimum portfolio return",
  "Maximum portfolio return",
  "Maximum portfolio risk score",
  "Minimum portfolio risk score"
];

/* Required dataset columns */

const REQUIRED_COLUMNS = [
  "ticker_or_asset",
  "historical_return",
  "volatility"
];

/* Convert volatility to risk score */

function toRisk(volatility) {
  const value = Number(volatility);

  if (!Number.isFinite(value) || value < 0) {
    return 1;
  }

  return Math.min(
    10,
    Math.max(1, Math.round(value / 3))
  );
}

/* Parse CSV */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if (
      (char === "\n" || char === "\r") &&
      !quoted
    ) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }

      row.push(cell.trim());
      cell = "";

      if (row.some((value) => value !== "")) {
        rows.push(row);
      }

      row = [];
    } else {
      cell += char;
    }
  }

  if (quoted) {
    throw new Error("CSV contains an unclosed quoted field.");
  }

  if (cell !== "" || row.length) {
    row.push(cell.trim());

    if (row.some((value) => value !== "")) {
      rows.push(row);
    }
  }

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) =>
    header.trim().toLowerCase()
  );

  return rows.slice(1).map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [
        header,
        values[index] ?? ""
      ])
    )
  );
}

/* Parse JSON */

function parseJson(text) {
  const value = JSON.parse(text);

  if (!Array.isArray(value)) {
    throw new Error(
      "JSON data must contain an array of asset records."
    );
  }

  return value;
}

/* Normalize uploaded rows */

function normalizeRows(rows) {
  return rows.map((row) => ({
    ticker_or_asset:
      row.ticker_or_asset ??
      row.ticker ??
      row.asset_name ??
      row.asset ??
      "",

    historical_return:
      row.historical_return ??
      row.expected_return ??
      row.return ??
      "",

    volatility:
      row.volatility ??
      row.risk_score ??
      row.risk ??
      ""
  }));
}

/* Validate uploaded rows */

function validateRows(rows) {
  const warnings = [];

  if (!rows.length) {
    return ["The file does not contain any data rows."];
  }

  const first = rows[0];

  const missing = REQUIRED_COLUMNS.filter(
    (column) => !(column in first)
  );

  if (missing.length) {
    warnings.push(
      `Missing required columns: ${missing.join(", ")}.`
    );

    return warnings;
  }

  const names = new Set();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    const name = String(
      row.ticker_or_asset ?? ""
    ).trim();

    if (!name) {
      warnings.push(
        `Row ${rowNumber}: asset name is missing.`
      );
    } else {
      const normalizedName = name.toLowerCase();

      if (names.has(normalizedName)) {
        warnings.push(
          `Row ${rowNumber}: duplicate asset "${name}".`
        );
      }

      names.add(normalizedName);
    }

    const returnValue = String(
      row.historical_return ?? ""
    ).trim();

    if (
      returnValue === "" ||
      !Number.isFinite(Number(returnValue))
    ) {
      warnings.push(
        `Row ${rowNumber}: historical_return must be numeric.`
      );
    }

    const volatilityValue = String(
      row.volatility ?? ""
    ).trim();

    if (
      volatilityValue === "" ||
      !Number.isFinite(Number(volatilityValue))
    ) {
      warnings.push(
        `Row ${rowNumber}: volatility must be numeric.`
      );
    } else if (Number(volatilityValue) < 0) {
      warnings.push(
        `Row ${rowNumber}: volatility cannot be negative.`
      );
    }
  });

  return warnings;
}

/* Validate model */

function validateModel(form, assets, constraints) {
  if (!form.name.trim()) {
    return "Please enter a model name.";
  }

  if (
    !["Maximize Return", "Minimize Risk"].includes(
      form.objective
    )
  ) {
    return "Please select a valid optimization objective.";
  }

  if (
    String(form.budget).trim() === "" ||
    !Number.isFinite(Number(form.budget)) ||
    Number(form.budget) <= 0
  ) {
    return "Please enter a valid total budget greater than zero.";
  }

  if (!assets.length) {
    return "Add at least one asset.";
  }

  let sumMin = 0;
  let sumMax = 0;

  const names = new Set();

  for (const asset of assets) {
    const name = String(asset.assetName ?? "").trim();

    if (!name) {
      return "Every asset must have a name.";
    }

    const normalizedName = name.toLowerCase();

    if (names.has(normalizedName)) {
      return `Duplicate asset "${name}" is not allowed.`;
    }

    names.add(normalizedName);

    const expectedReturn = Number(
      asset.expectedReturn
    );

    if (
      String(asset.expectedReturn).trim() === "" ||
      !Number.isFinite(expectedReturn)
    ) {
      return `Expected return for "${name}" must be numeric.`;
    }

    const risk = Number(asset.riskScore);

    if (
      String(asset.riskScore).trim() === "" ||
      !Number.isInteger(risk) ||
      risk < 1 ||
      risk > 10
    ) {
      return `Risk score for "${name}" must be a whole number from 1 to 10.`;
    }

    if (
      String(asset.minAllocation).trim() === "" ||
      String(asset.maxAllocation).trim() === ""
    ) {
      return `Allocation limits for "${name}" are required.`;
    }

    const min = Number(asset.minAllocation);
    const max = Number(asset.maxAllocation);

    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min < 0 ||
      min > 100 ||
      max < 0 ||
      max > 100
    ) {
      return `Allocations for "${name}" must be between 0% and 100%.`;
    }

    if (min > max) {
      return `Minimum allocation cannot exceed maximum allocation for "${name}".`;
    }

    sumMin += min;
    sumMax += max;
  }

  const tolerance = 0.000001;

  if (sumMin > 100 + tolerance) {
    return `Minimum allocations total ${sumMin}%, exceeding 100%.`;
  }

  if (sumMax < 100 - tolerance) {
    return `Maximum allocations total ${sumMax}%, below 100%.`;
  }

  for (let i = 0; i < constraints.length; i++) {
    const constraint = constraints[i];

    if (
      !CONSTRAINT_TYPES.includes(
        constraint.constraintType
      )
    ) {
      return `Constraint ${i + 1} has an invalid type.`;
    }

    if (
      !["<=", ">=", "="].includes(
        constraint.operator
      )
    ) {
      return `Constraint ${i + 1} has an invalid operator.`;
    }

    if (
      String(constraint.targetValue).trim() === "" ||
      !Number.isFinite(Number(constraint.targetValue))
    ) {
      return `Constraint ${i + 1} must have a numeric target.`;
    }
  }

  return "";
}

/* Data upload */

export default function DataUpload() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");

  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [warnings, setWarnings] = useState([]);

  const [datasets, setDatasets] = useState([]);

  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fileInputRef = useRef(null);

  /* Model creation state */

  const [maker, setMaker] = useState(null);

  const [makerForm, setMakerForm] = useState({
    name: "",
    objective: "Maximize Return",
    budget: "100000"
  });

  const [makerAssets, setMakerAssets] = useState([]);
  const [makerCons, setMakerCons] = useState([]);

  /* Default maximum allocation is 100% */

  const [bulk, setBulk] = useState({
    min: "0",
    max: "100"
  });

  const [making, setMaking] = useState(false);

  /* Load projects */

  useEffect(() => {
    projectsApi
      .list()
      .then((data) => {
        setProjects(data.projects || []);
      })
      .catch((err) => {
        setError(
          err.message || "Unable to load projects."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  /* Load attached datasets */

  useEffect(() => {
    if (!projectId) {
      setDatasets([]);
      return;
    }

    let active = true;

    datasetsApi
      .list(projectId)
      .then((data) => {
        if (active) {
          setDatasets(data.datasets || []);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err.message || "Unable to load datasets."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  /* Selected project */

  const selectedProject = useMemo(
    () =>
      projects.find(
        (project) =>
          String(project.project_id) ===
          String(projectId)
      ),
    [projects, projectId]
  );

  /* Allocation totals */

  const sumMin = makerAssets.reduce(
    (sum, asset) =>
      sum + (Number(asset.minAllocation) || 0),
    0
  );

  const sumMax = makerAssets.reduce(
    (sum, asset) =>
      sum + (Number(asset.maxAllocation) || 0),
    0
  );

  /* Open model creation */

  async function openMaker(dataset) {
    if (!projectId) {
      setError("Please select a project.");
      return;
    }

    setError("");
    setMessage("");

    try {
      const data = await datasetsApi.rows(
        projectId,
        dataset.dataset_id
      );

      const list = data.rows || [];

      if (!list.length) {
        setError("This dataset has no rows.");
        return;
      }

      const rowWarnings = validateRows(list);

      if (rowWarnings.length) {
        setError(
          `Dataset contains invalid records: ${rowWarnings[0]}`
        );
        return;
      }

      /* Every asset starts with a 100% maximum */

      const assets = list.map((row) => ({
        assetName: String(row.ticker_or_asset).trim(),
        expectedReturn: Number(row.historical_return),
        volatility: Number(row.volatility),
        riskScore: toRisk(row.volatility),
        minAllocation: "0",
        maxAllocation: "100"
      }));

      setMaker(dataset);

      setMakerForm({
        name: `${
          dataset.file_name.replace(
            /\.(csv|json)$/i,
            ""
          )
        } model`,
        objective: "Maximize Return",
        budget: "100000"
      });

      setBulk({
        min: "0",
        max: "100"
      });

      setMakerAssets(assets);

      /* Start without optional constraints */

      setMakerCons([]);
    } catch (err) {
      setError(
        err.message || "Unable to load dataset rows."
      );
    }
  }

  /* Update model asset */

  function updateMakerAsset(index, field, value) {
    setMakerAssets((previous) =>
      previous.map((asset, i) =>
        i === index
          ? { ...asset, [field]: value }
          : asset
      )
    );
  }

  /* Apply bulk allocations */

  function applyBulk() {
    const min = Number(bulk.min);
    const max = Number(bulk.max);

    if (
      bulk.min.trim() === "" ||
      bulk.max.trim() === "" ||
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min < 0 ||
      max > 100 ||
      min > max
    ) {
      setError(
        "Bulk allocations must be between 0% and 100%, with minimum no greater than maximum."
      );
      return;
    }

    setError("");

    setMakerAssets((previous) =>
      previous.map((asset) => ({
        ...asset,
        minAllocation: bulk.min,
        maxAllocation: bulk.max
      }))
    );
  }

  /* Add constraint */

  function addMakerCon() {
    setMakerCons((previous) => [
      ...previous,
      {
        constraintType: CONSTRAINT_TYPES[0],
        operator: ">=",
        targetValue: ""
      }
    ]);
  }

  /* Update constraint */

  function updateMakerCon(index, field, value) {
    setMakerCons((previous) =>
      previous.map((constraint, i) =>
        i === index
          ? { ...constraint, [field]: value }
          : constraint
      )
    );
  }

  /* Remove constraint */

  function removeMakerCon(index) {
    setMakerCons((previous) =>
      previous.filter((_, i) => i !== index)
    );
  }

  /* Create model */

  async function createModel(event) {
    event.preventDefault();

    if (making) {
      return;
    }

    setError("");
    setMessage("");

    if (!projectId || !maker) {
      setError("Please select a dataset.");
      return;
    }

    const validationError = validateModel(
      makerForm,
      makerAssets,
      makerCons
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    setMaking(true);

    try {
      const payload = {
        modelName: makerForm.name.trim(),
        objectiveType: makerForm.objective,
        totalBudget: Number(makerForm.budget),

        assets: makerAssets.map((asset) => ({
          assetName: asset.assetName.trim(),
          expectedReturn: Number(
            asset.expectedReturn
          ),
          riskScore: Number(asset.riskScore),
          minAllocation: Number(
            asset.minAllocation
          ),
          maxAllocation: Number(
            asset.maxAllocation
          )
        })),

        /* Preserve current solver target scaling */

        constraints: makerCons.map((constraint) => ({
          constraintType: constraint.constraintType,
          operator: constraint.operator,
          targetValue: Number(
            (
              Number(constraint.targetValue) * 100
            ).toFixed(2)
          )
        }))
      };

      await modelsApi.save(projectId, payload);

      setMessage(
        `Model "${makerForm.name.trim()}" created from ${maker.file_name}. Open it in Model Builder or Run Optimization.`
      );

      setMaker(null);
      setMakerAssets([]);
      setMakerCons([]);
    } catch (err) {
      setError(
        err.message || "Unable to create the model."
      );
    } finally {
      setMaking(false);
    }
  }

  /* Change project */

  function handleProjectChange(event) {
    setProjectId(event.target.value);

    setMaker(null);
    setMakerAssets([]);
    setMakerCons([]);

    setDatasets([]);
    setFile(null);
    setRows([]);
    setWarnings([]);

    setError("");
    setMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  /* Read uploaded file */

  async function handleFile(event) {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    setFile(selected);
    setRows([]);
    setWarnings([]);

    setError("");
    setMessage("");
    setParsing(true);

    try {
      const extension = selected.name
        .split(".")
        .pop()
        ?.toLowerCase();

      if (!["csv", "json"].includes(extension)) {
        throw new Error(
          "Please upload a CSV or JSON file."
        );
      }

      const text = await selected.text();

      const parsed =
        extension === "csv"
          ? parseCsv(text)
          : parseJson(text);

      const normalized = normalizeRows(parsed);

      setRows(normalized);
      setWarnings(validateRows(normalized));
    } catch (err) {
      setError(
        err.message || "Unable to read this file."
      );
    } finally {
      setParsing(false);
    }
  }

  /* Confirm dataset upload */

  async function confirmUpload() {
    setError("");
    setMessage("");

    if (!projectId) {
      setError("Please select a project.");
      return;
    }

    if (!file || !rows.length) {
      setError(
        "Choose a valid CSV or JSON file first."
      );
      return;
    }

    if (warnings.length) {
      setError(
        "Fix the validation warnings before confirming the dataset."
      );
      return;
    }

    setSaving(true);

    try {
      const uploadedName = file.name;

      const result = await datasetsApi.create(
        projectId,
        {
          fileName: uploadedName,
          rows
        }
      );

      setMessage(
        result.message ||
          "Dataset successfully attached to project."
      );

      setFile(null);
      setRows([]);
      setWarnings([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      const data = await datasetsApi.list(
        projectId
      );

      setDatasets(data.datasets || []);

      /* Open model creation for uploaded dataset */

      if (result.datasetId) {
        await openMaker({
          dataset_id: result.datasetId,
          file_name: uploadedName
        });
      }
    } catch (err) {
      setError(
        err.message || "Unable to save dataset."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="data-upload">

      {/* Header */}

      <header className="header">
        <div>
          <h1>Upload Portfolio Data</h1>

          <p>
            Upload a CSV or JSON asset dataset,
            preview the rows, and attach the
            confirmed data to a project.
          </p>
        </div>

        <Link
          className="btn ghost"
          to="/dashboard/model-builder"
        >
          Open Model Builder
        </Link>
      </header>

      {/* Messages */}

      {message && (
        <div
          className="alert success"
          role="status"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          className="alert error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Project selection */}

      <section className="section">
        <div className="section-head">
          <div>
            <h2>1. Select Project</h2>

            <p>
              Choose the project that should
              own this dataset.
            </p>
          </div>
        </div>

        <select
          value={projectId}
          onChange={handleProjectChange}
          disabled={loading}
        >
          <option value="">
            {loading
              ? "Loading projects..."
              : "Select a project"}
          </option>

          {projects.map((project) => (
            <option
              key={project.project_id}
              value={project.project_id}
            >
              {project.project_name}
            </option>
          ))}
        </select>

        {selectedProject && (
          <p className="hint">
            Dataset destination:{" "}
            <strong>
              {selectedProject.project_name}
            </strong>
          </p>
        )}
      </section>

      {/* File upload */}

      <section className="section">
        <div className="section-head">
          <div>
            <h2>2. Upload Dataset</h2>

            <p>
              Supported formats: CSV and JSON.
              Required fields are asset,
              historical return, and volatility.
            </p>
          </div>
        </div>

        <div className="dropzone">
          <input
            ref={fileInputRef}
            id="portfolio-file"
            type="file"
            accept=".csv,.json,application/json,text/csv"
            onChange={handleFile}
          />

          <label
            htmlFor="portfolio-file"
            className="btn primary"
          >
            Choose CSV / JSON
          </label>

          {file && <span>{file.name}</span>}
        </div>

        {parsing && (
          <p className="status">
            Reading and validating file…
          </p>
        )}
      </section>

      {/* Dataset preview */}

      {rows.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2>3. Preview</h2>

              <p>
                {rows.length} data row
                {rows.length === 1 ? "" : "s"} detected.
              </p>
            </div>

            <button
              className="btn primary"
              type="button"
              onClick={confirmUpload}
              disabled={
                saving ||
                parsing ||
                warnings.length > 0 ||
                !projectId
              }
            >
              {saving
                ? "Saving…"
                : "Confirm & Attach"}
            </button>
          </div>

          {/* Validation warnings */}

          {warnings.length > 0 && (
            <div
              className="warnings"
              role="alert"
            >
              <strong>
                Validation warnings
              </strong>

              <ul>
                {warnings
                  .slice(0, 10)
                  .map((warning, index) => (
                    <li key={index}>
                      {warning}
                    </li>
                  ))}
              </ul>

              {warnings.length > 10 && (
                <p>
                  Only the first 10 warnings
                  are shown.
                </p>
              )}
            </div>
          )}

          {/* Preview table */}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Historical Return (%)</th>
                  <th>Volatility (%)</th>
                </tr>
              </thead>

              <tbody>
                {rows
                  .slice(0, 25)
                  .map((row, index) => (
                    <tr
                      key={`${row.ticker_or_asset}-${index}`}
                    >
                      <td>
                        {row.ticker_or_asset}
                      </td>

                      <td>
                        {row.historical_return}
                      </td>

                      <td>
                        {row.volatility}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {rows.length > 25 && (
            <p className="hint">
              Showing the first 25 rows
              in the preview.
            </p>
          )}
        </section>
      )}

      {/* Create model from dataset */}

      {maker && (
        <section className="section maker">
          <div className="section-head">
            <div>
              <h2>
                Create a model from{" "}
                {maker.file_name}
              </h2>

              <p>
                Expected returns come from your
                dataset. Volatility is converted
                to a whole-number risk score
                from 1 to 10. Set allocation
                limits as percentages.
              </p>
            </div>
          </div>

          <form
            onSubmit={createModel}
            noValidate
          >

            {/* Model information */}

            <div className="grid">
              <label>
                Model name

                <input
                  type="text"
                  required
                  value={makerForm.name}
                  onChange={(event) =>
                    setMakerForm({
                      ...makerForm,
                      name: event.target.value
                    })
                  }
                />
              </label>

              <label>
                Objective

                <select
                  value={makerForm.objective}
                  onChange={(event) =>
                    setMakerForm({
                      ...makerForm,
                      objective: event.target.value
                    })
                  }
                >
                  <option value="Maximize Return">
                    Maximize Return
                  </option>

                  <option value="Minimize Risk">
                    Minimize Risk
                  </option>
                </select>
              </label>

              <label>
                Total budget

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={makerForm.budget}
                  onChange={(event) =>
                    setMakerForm({
                      ...makerForm,
                      budget: event.target.value
                    })
                  }
                />
              </label>
            </div>

            {/* Assets */}

            <h3>Assets</h3>

            {/* Bulk allocation controls */}

            <div className="bulk">
              <span>
                Set all assets:
              </span>

              <label>
                Min %

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={bulk.min}
                  onChange={(event) =>
                    setBulk({
                      ...bulk,
                      min: event.target.value
                    })
                  }
                />
              </label>

              <label>
                Max %

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={bulk.max}
                  onChange={(event) =>
                    setBulk({
                      ...bulk,
                      max: event.target.value
                    })
                  }
                />
              </label>

              <button
                type="button"
                className="make"
                onClick={applyBulk}
              >
                Apply to all
              </button>
            </div>

            {/* Asset table */}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Expected return (%)</th>
                    <th>Risk score (1–10)</th>
                    <th>Min allocation (%)</th>
                    <th>Max allocation (%)</th>
                  </tr>
                </thead>

                <tbody>
                  {makerAssets.map(
                    (asset, index) => (
                      <tr
                        key={`${asset.assetName}-${index}`}
                      >
                        <td>
                          {asset.assetName}
                        </td>

                        <td>
                          {asset.expectedReturn}
                        </td>

                        <td>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            value={asset.riskScore}
                            onChange={(event) =>
                              updateMakerAsset(
                                index,
                                "riskScore",
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={
                              asset.minAllocation
                            }
                            onChange={(event) =>
                              updateMakerAsset(
                                index,
                                "minAllocation",
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={
                              asset.maxAllocation
                            }
                            onChange={(event) =>
                              updateMakerAsset(
                                index,
                                "maxAllocation",
                                event.target.value
                              )
                            }
                          />
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Allocation summary */}

            <p
              className={
                sumMin > 100 || sumMax < 100
                  ? "sum bad"
                  : "sum"
              }
            >
              Minimums total {sumMin.toFixed(2)}%
              {" · "}
              Maximums total {sumMax.toFixed(2)}%.
              {" "}
              Minimums must total 100% or less;
              maximums must total 100% or more.
            </p>

            {/* Constraints */}

            <h3>Constraints</h3>

            {makerCons.length === 0 && (
              <p className="hint">
                No optional constraints added.
                The model will use the asset
                allocation limits and the
                selected optimization objective.
              </p>
            )}

            {makerCons.map(
              (constraint, index) => (
                <div
                  className="con"
                  key={index}
                >
                  <select
                    value={
                      constraint.constraintType
                    }
                    onChange={(event) =>
                      updateMakerCon(
                        index,
                        "constraintType",
                        event.target.value
                      )
                    }
                  >
                    {CONSTRAINT_TYPES.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      )
                    )}
                  </select>

                  <select
                    value={constraint.operator}
                    onChange={(event) =>
                      updateMakerCon(
                        index,
                        "operator",
                        event.target.value
                      )
                    }
                  >
                    <option value="<=">
                      {"<="}
                    </option>

                    <option value=">=">
                      {">="}
                    </option>

                    <option value="=">
                      {"="}
                    </option>
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Target"
                    value={
                      constraint.targetValue
                    }
                    onChange={(event) =>
                      updateMakerCon(
                        index,
                        "targetValue",
                        event.target.value
                      )
                    }
                  />

                  <button
                    type="button"
                    className="make"
                    onClick={() =>
                      removeMakerCon(index)
                    }
                  >
                    Remove
                  </button>
                </div>
              )
            )}

            <button
              type="button"
              className="make"
              onClick={addMakerCon}
            >
              + Add constraint
            </button>

            <p className="hint">
              Enter readable targets:
              5 means 5% portfolio return,
              and 4.5 means a portfolio risk
              score of 4.5. Targets are
              converted to the current
              solver's scaled representation
              when saved.
            </p>

            {/* Model actions */}

            <div className="buttons">
              <button
                type="submit"
                className="btn primary"
                disabled={making}
              >
                {making
                  ? "Creating…"
                  : "Create model"}
              </button>

              <button
                type="button"
                className="btn ghost dark"
                onClick={() => {
                  setMaker(null);
                  setMakerAssets([]);
                  setMakerCons([]);
                  setError("");
                }}
                disabled={making}
              >
                Not now
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Attached datasets */}

      {projectId && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2>Attached Datasets</h2>

              <p>
                Previously confirmed datasets
                for this project.
              </p>
            </div>
          </div>

          {datasets.length === 0 ? (
            <p className="empty">
              No datasets uploaded yet.
            </p>
          ) : (
            <ul className="dataset-list">
              {datasets.map((dataset) => (
                <li key={dataset.dataset_id}>
                  <div>
                    <strong>
                      {dataset.file_name}
                    </strong>

                    <span>
                      {dataset.row_count} rows
                    </span>
                  </div>

                  <time>
                    {new Date(
                      dataset.uploaded_at
                    ).toLocaleString()}
                  </time>

                  <button
                    type="button"
                    className="make"
                    onClick={() =>
                      openMaker(dataset)
                    }
                    disabled={making}
                  >
                    Create model
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

    </main>
  );
}
