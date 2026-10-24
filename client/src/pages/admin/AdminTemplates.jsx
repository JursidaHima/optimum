
import { useEffect, useState } from "react";
import FormField from "../../components/FormField.jsx";
import { adminApi } from "../../services/adminApi";
import { formatDateTime } from "../../utils/format";

/* Sample configuration */

const SAMPLE_CONFIG = JSON.stringify(
  {
    modelName: "Maximum Expected Return",
    objectiveType: "Maximize Return",
    totalBudget: 10000,
    assets: [
      {
        assetName: "US Equity Fund",
        expectedReturn: 9,
        riskScore: 8,
        minAllocation: 0,
        maxAllocation: 50
      },
      {
        assetName: "International Equity Fund",
        expectedReturn: 7.5,
        riskScore: 7,
        minAllocation: 0,
        maxAllocation: 50
      },
      {
        assetName: "Bond Fund",
        expectedReturn: 4,
        riskScore: 2,
        minAllocation: 0,
        maxAllocation: 50
      }
    ],
    constraints: []
  },
  null,
  2
);

/* Empty form */

const EMPTY = {
  templateName: "",
  description: "",
  defaultConfigJson: SAMPLE_CONFIG
};

/* Format configuration */

function formatConfig(value) {
  if (value === null || value === undefined) {
    return "";
  }

  try {
    const parsed =
      typeof value === "string"
        ? JSON.parse(value)
        : value;

    return JSON.stringify(parsed, null, 2);
  } catch {
    return String(value);
  }
}

/* Validate configuration */

function validateConfig(form) {
  if (!form.templateName.trim()) {
    return "Template name is required.";
  }

  if (!form.description.trim()) {
    return "Description is required.";
  }

  let config;

  try {
    config = JSON.parse(form.defaultConfigJson);
  } catch {
    return "Default configuration must contain valid JSON.";
  }

  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
    return "Configuration must be a JSON object.";
  }

  /* Model name */

  if (
    typeof config.modelName !== "string" ||
    !config.modelName.trim()
  ) {
    return "Model name is required.";
  }

  /* Objective type */

  if (
    !["Maximize Return", "Minimize Risk"].includes(
      config.objectiveType
    )
  ) {
    return "Objective type must be Maximize Return or Minimize Risk.";
  }

  /* Total budget */

  if (
    !Number.isFinite(config.totalBudget) ||
    config.totalBudget <= 0
  ) {
    return "Total budget must be greater than zero.";
  }

  /* Assets */

  if (
    !Array.isArray(config.assets) ||
    config.assets.length === 0
  ) {
    return "Add at least one asset.";
  }

  let totalMinimum = 0;
  let totalMaximum = 0;

  const assetNames = new Set();

  for (let i = 0; i < config.assets.length; i++) {
    const asset = config.assets[i];

    if (
      !asset ||
      typeof asset !== "object" ||
      Array.isArray(asset)
    ) {
      return `Asset ${i + 1} must be a valid object.`;
    }

    /* Asset name */

    if (
      typeof asset.assetName !== "string" ||
      !asset.assetName.trim()
    ) {
      return `Asset ${i + 1} must have a name.`;
    }

    const normalizedName = asset.assetName.trim().toLowerCase();

    if (assetNames.has(normalizedName)) {
      return `Asset "${asset.assetName}" appears more than once.`;
    }

    assetNames.add(normalizedName);

    /* Expected return */

    if (!Number.isFinite(asset.expectedReturn)) {
      return `Asset ${i + 1} must have a numeric expected return.`;
    }

    /* Risk score */

    if (
      !Number.isInteger(asset.riskScore) ||
      asset.riskScore < 1 ||
      asset.riskScore > 10
    ) {
      return `Asset ${i + 1} risk score must be an integer from 1 to 10.`;
    }

    /* Allocation values */

    if (
      !Number.isFinite(asset.minAllocation) ||
      !Number.isFinite(asset.maxAllocation)
    ) {
      return `Asset ${i + 1} must have numeric allocation limits.`;
    }

    /* Allocation range */

    if (
      asset.minAllocation < 0 ||
      asset.minAllocation > 100 ||
      asset.maxAllocation < 0 ||
      asset.maxAllocation > 100
    ) {
      return `Asset ${i + 1} allocation limits must be between 0% and 100%.`;
    }

    /* Minimum versus maximum */

    if (asset.minAllocation > asset.maxAllocation) {
      return `Asset ${i + 1} minimum allocation cannot exceed maximum allocation.`;
    }

    totalMinimum += asset.minAllocation;
    totalMaximum += asset.maxAllocation;
  }

  /* Portfolio feasibility */

  const tolerance = 0.000001;

  if (totalMinimum > 100 + tolerance) {
    return "Total minimum allocations cannot exceed 100%.";
  }

  if (totalMaximum < 100 - tolerance) {
    return "Total maximum allocations must reach at least 100%.";
  }

  /* Constraints */

  if (
    config.constraints !== undefined &&
    !Array.isArray(config.constraints)
  ) {
    return "Constraints must be an array.";
  }

  for (let i = 0; i < (config.constraints || []).length; i++) {
    const constraint = config.constraints[i];

    if (
      !constraint ||
      typeof constraint !== "object" ||
      Array.isArray(constraint)
    ) {
      return `Constraint ${i + 1} must be a valid object.`;
    }

    if (
      typeof constraint.constraintType !== "string" ||
      !constraint.constraintType.trim()
    ) {
      return `Constraint ${i + 1} must have a type.`;
    }

    if (!["<=", ">=", "="].includes(constraint.operator)) {
      return `Constraint ${i + 1} has an invalid operator.`;
    }

    if (!Number.isFinite(constraint.targetValue)) {
      return `Constraint ${i + 1} must have a numeric target value.`;
    }
  }

  return "";
}

/* Admin templates */

export default function AdminTemplates() {
  const [templates, setTemplates] = useState(null);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({ ...EMPTY });

  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  /* Load templates */

  async function load() {
    try {
      setError("");

      const data = await adminApi.listTemplates();

      setTemplates(
        Array.isArray(data.templates) ? data.templates : []
      );
    } catch (err) {
      setError(err.message || "Unable to load templates.");
      setTemplates([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* New template */

  function openNew() {
    setEditing("new");
    setForm({ ...EMPTY });
    setFormError("");
    setNotice("");
    setError("");
  }

  /* Edit template */

  function openEdit(template) {
    setEditing(template);

    setForm({
      templateName: template.template_name || "",
      description: template.description || "",
      defaultConfigJson: formatConfig(
        template.default_config_json
      )
    });

    setFormError("");
    setNotice("");
    setError("");
  }

  /* Update form field */

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value
    }));
  }

  /* Format JSON */

  function onFormatJson() {
    try {
      const config = JSON.parse(form.defaultConfigJson);

      updateField(
        "defaultConfigJson",
        JSON.stringify(config, null, 2)
      );

      setFormError("");
    } catch {
      setFormError("Cannot format invalid JSON.");
    }
  }

  /* Save template */

  async function onSubmit(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setFormError("");
    setNotice("");
    setError("");

    const validationError = validateConfig(form);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setBusy(true);

    try {
      const config = JSON.parse(form.defaultConfigJson);

      const payload = {
        templateName: form.templateName.trim(),
        description: form.description.trim(),
        defaultConfigJson: JSON.stringify(config)
      };

      const response =
        editing === "new"
          ? await adminApi.createTemplate(payload)
          : await adminApi.updateTemplate(
              editing.template_id,
              payload
            );

      setEditing(null);
      setForm({ ...EMPTY });

      await load();

      setNotice(
        response?.message || "Template saved successfully."
      );
    } catch (err) {
      setFormError(
        err.message || "Unable to save template."
      );
    } finally {
      setBusy(false);
    }
  }

  /* Delete template */

  async function onDelete(template) {
    if (busy) {
      return;
    }

    const confirmed = window.confirm(
      `Delete template "${template.template_name}"?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setNotice("");
    setBusy(true);

    try {
      const response = await adminApi.deleteTemplate(
        template.template_id
      );

      await load();

      setNotice(
        response?.message || "Template deleted successfully."
      );
    } catch (err) {
      setError(
        err.message || "Unable to delete template."
      );
    } finally {
      setBusy(false);
    }
  }

  /* Cancel editing */

  function onCancel() {
    setEditing(null);
    setForm({ ...EMPTY });
    setFormError("");
  }

  /* Count template assets */

  function getAssetCount(template) {
    try {
      const config =
        typeof template.default_config_json === "string"
          ? JSON.parse(template.default_config_json)
          : template.default_config_json;

      return Array.isArray(config?.assets)
        ? config.assets.length
        : "?";
    } catch {
      return "?";
    }
  }

  return (
    <section className="admin">

      {/* Header */}

      <header className="header row">
        <div>
          <h1>Templates</h1>

          <p>
            Starter finance models that administrators
            maintain for the platform.
          </p>
        </div>

        <button
          type="button"
          className="btn primary"
          onClick={openNew}
          disabled={busy}
        >
          + New template
        </button>
      </header>

      {/* Success message */}

      {notice && (
        <p
          className="alert success"
          role="status"
        >
          {notice}
        </p>
      )}

      {/* Error message */}

      {error && (
        <p
          className="alert error"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Template form */}

      {editing && (
        <form
          className="card"
          onSubmit={onSubmit}
          noValidate
        >
          <h2>
            {editing === "new"
              ? "New template"
              : "Edit template"}
          </h2>

          <p className="muted">
            Configure a reusable finance model using
            the same inputs as the Model Builder.
          </p>

          {/* Form error */}

          {formError && (
            <p
              className="alert error"
              role="alert"
            >
              {formError}
            </p>
          )}

          {/* Template name */}

          <FormField label="Template name">
            {(props) => (
              <input
                {...props}
                type="text"
                required
                maxLength={150}
                value={form.templateName}
                onChange={(event) =>
                  updateField(
                    "templateName",
                    event.target.value
                  )
                }
              />
            )}
          </FormField>

          {/* Description */}

          <FormField label="Description">
            {(props) => (
              <textarea
                {...props}
                rows={3}
                required
                value={form.description}
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value
                  )
                }
              />
            )}
          </FormField>

          {/* JSON configuration */}

          <FormField
            label="Default configuration (JSON)"
            hint="Expected returns use percentages (9 = 9%). Risk scores are integers from 1 to 10. Minimum and maximum allocations are percentages from 0 to 100. Total minimum allocations must not exceed 100%, and total maximum allocations must reach at least 100%."
          >
            {(props) => (
              <textarea
                {...props}
                className="code"
                rows={18}
                spellCheck={false}
                required
                value={form.defaultConfigJson}
                onChange={(event) =>
                  updateField(
                    "defaultConfigJson",
                    event.target.value
                  )
                }
              />
            )}
          </FormField>

          {/* Form actions */}

          <div className="actions">
            <button
              type="submit"
              className="btn primary"
              disabled={busy}
            >
              {busy
                ? "Saving..."
                : editing === "new"
                  ? "Save template"
                  : "Update template"}
            </button>

            <button
              type="button"
              className="btn ghost dark"
              onClick={onFormatJson}
              disabled={busy}
            >
              Format JSON
            </button>

            <button
              type="button"
              className="btn ghost dark"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Template list */}

      {templates === null ? (
        <p>Loading…</p>
      ) : templates.length === 0 ? (
        <div className="card">
          <p className="muted">
            No templates yet. Create the first one.
          </p>
        </div>
      ) : (
        <ul className="grid">
          {templates.map((template) => (
            <li
              key={template.template_id}
              className="card"
            >
              <h3>{template.template_name}</h3>

              <p>{template.description}</p>

              <p className="muted">
                {getAssetCount(template)} assets · created{" "}
                {formatDateTime(template.created_at)}
              </p>

              <div className="actions">
                <button
                  type="button"
                  className="btn primary small"
                  onClick={() => openEdit(template)}
                  disabled={busy}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="btn ghost small dark"
                  onClick={() => onDelete(template)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

    </section>
  );
}
