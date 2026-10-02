import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { projectsApi } from "../services/projectsApi";
import { datasetsApi } from "../services/datasetsApi";
import "../styles/data-upload.css";

const REQUIRED_COLUMNS = ["ticker_or_asset", "historical_return", "volatility"];

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
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      cell = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }

  if (cell !== "" || row.length) {
    row.push(cell.trim());
    if (row.some((value) => value !== "")) rows.push(row);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

function parseJson(text) {
  const value = JSON.parse(text);
  if (!Array.isArray(value)) {
    throw new Error("JSON data must contain an array of asset records.");
  }
  return value;
}

function validateRows(rows) {
  const warnings = [];
  if (!rows.length) return ["The file does not contain any data rows."];

  const first = rows[0];
  const missing = REQUIRED_COLUMNS.filter((column) => !(column in first));
  if (missing.length) {
    warnings.push(`Missing required columns: ${missing.join(", ")}.`);
    return warnings;
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!String(row.ticker_or_asset || "").trim()) {
      warnings.push(`Row ${rowNumber}: asset name is missing.`);
    }
    if (row.historical_return === "" || Number.isNaN(Number(row.historical_return))) {
      warnings.push(`Row ${rowNumber}: historical_return must be numeric.`);
    }
    if (row.volatility === "" || Number.isNaN(Number(row.volatility))) {
      warnings.push(`Row ${rowNumber}: volatility must be numeric.`);
    }
  });

  return warnings;
}

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

  useEffect(() => {
    projectsApi.list()
      .then((data) => setProjects(data.projects || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    datasetsApi.list(projectId)
      .then((data) => setDatasets(data.datasets || []))
      .catch((err) => setError(err.message));
  }, [projectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.project_id) === String(projectId)),
    [projects, projectId]
  );

  function handleProjectChange(event) {
    setProjectId(event.target.value);
    setDatasets([]);
    setFile(null);
    setRows([]);
    setWarnings([]);
    setError("");
    setMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setRows([]);
    setWarnings([]);
    setError("");
    setMessage("");
    setParsing(true);

    try {
      const extension = selected.name.split(".").pop()?.toLowerCase();
      if (!["csv", "json"].includes(extension)) {
        throw new Error("Please upload a CSV or JSON file.");
      }

      const text = await selected.text();
      const parsed = extension === "csv" ? parseCsv(text) : parseJson(text);
      const normalized = parsed.map((row) => ({
        ticker_or_asset: row.ticker_or_asset ?? row.ticker ?? row.asset_name ?? row.asset ?? "",
        historical_return: row.historical_return ?? row.expected_return ?? row.return ?? "",
        volatility: row.volatility ?? row.risk_score ?? row.risk ?? "",
      }));

      setRows(normalized);
      setWarnings(validateRows(normalized));
    } catch (err) {
      setError(err.message || "Unable to read this file.");
    } finally {
      setParsing(false);
    }
  }

  async function confirmUpload() {
    setError("");
    setMessage("");
    if (!projectId) return setError("Please select a project.");
    if (!file || !rows.length) return setError("Choose a valid CSV or JSON file first.");
    if (warnings.length) return setError("Fix the validation warnings before confirming the dataset.");

    try {
      setSaving(true);
      const result = await datasetsApi.create(projectId, {
        fileName: file.name,
        rows,
      });
      setMessage(result.message || "Data confirmed attached to project.");
      setFile(null);
      setRows([]);
      setWarnings([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      const data = await datasetsApi.list(projectId);
      setDatasets(data.datasets || []);
    } catch (err) {
      setError(err.message || "Unable to save the dataset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="data-upload">
      <header className="data-upload__header">
        <div>
          <p className="data-upload__eyebrow">Feature 5 · Finance MVP</p>
          <h1>Upload Portfolio Data</h1>
          <p>Upload a CSV or JSON asset dataset, preview the rows, and attach the confirmed data to a project.</p>
        </div>
        <Link className="btn btn--ghost" to="/dashboard/model-builder">Open Model Builder</Link>
      </header>

      {message && <div className="alert alert--success" role="status">{message}</div>}
      {error && <div className="alert alert--error" role="alert">{error}</div>}

      <section className="data-upload__section">
        <div className="data-upload__section-head">
          <div>
            <h2>1. Select Project</h2>
            <p>Choose the project that should own this dataset.</p>
          </div>
        </div>
        <select value={projectId} onChange={handleProjectChange} disabled={loading}>
          <option value="">{loading ? "Loading projects..." : "Select a project"}</option>
          {projects.map((project) => (
            <option key={project.project_id} value={project.project_id}>{project.project_name}</option>
          ))}
        </select>
        {selectedProject && <p className="data-upload__hint">Dataset destination: <strong>{selectedProject.project_name}</strong></p>}
      </section>

      <section className="data-upload__section">
        <div className="data-upload__section-head">
          <div>
            <h2>2. Upload Dataset</h2>
            <p>Supported formats: CSV and JSON. Required fields are asset, historical return, and volatility.</p>
          </div>
        </div>
        <div className="data-upload__dropzone">
          <input ref={fileInputRef} id="portfolio-file" type="file" accept=".csv,.json,application/json,text/csv" onChange={handleFile} />
          <label htmlFor="portfolio-file" className="btn btn--primary">Choose CSV / JSON</label>
          {file && <span>{file.name}</span>}
        </div>
        {parsing && <p className="data-upload__status">Reading and validating file…</p>}
      </section>

      {rows.length > 0 && (
        <section className="data-upload__section">
          <div className="data-upload__section-head">
            <div>
              <h2>3. Preview</h2>
              <p>{rows.length} data row{rows.length === 1 ? "" : "s"} detected.</p>
            </div>
            <button className="btn btn--primary" type="button" onClick={confirmUpload} disabled={saving || warnings.length > 0}>
              {saving ? "Saving…" : "Confirm & Attach"}
            </button>
          </div>

          {warnings.length > 0 && (
            <div className="data-upload__warnings" role="alert">
              <strong>Validation warnings</strong>
              <ul>{warnings.slice(0, 10).map((warning) => <li key={warning}>{warning}</li>)}</ul>
              {warnings.length > 10 && <p>Only the first 10 warnings are shown.</p>}
            </div>
          )}

          <div className="data-upload__table-wrap">
            <table className="data-upload__table">
              <thead><tr><th>Asset</th><th>Historical Return</th><th>Volatility</th></tr></thead>
              <tbody>
                {rows.slice(0, 25).map((row, index) => (
                  <tr key={`${row.ticker_or_asset}-${index}`}>
                    <td>{row.ticker_or_asset}</td>
                    <td>{row.historical_return}</td>
                    <td>{row.volatility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 25 && <p className="data-upload__hint">Showing the first 25 rows in the preview.</p>}
        </section>
      )}

      {projectId && (
        <section className="data-upload__section">
          <div className="data-upload__section-head">
            <div><h2>Attached Datasets</h2><p>Previously confirmed datasets for this project.</p></div>
          </div>
          {datasets.length === 0 ? <p className="data-upload__empty">No datasets uploaded yet.</p> : (
            <ul className="data-upload__dataset-list">
              {datasets.map((dataset) => (
                <li key={dataset.dataset_id}>
                  <div><strong>{dataset.file_name}</strong><span>{dataset.row_count} rows</span></div>
                  <time>{new Date(dataset.uploaded_at).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
