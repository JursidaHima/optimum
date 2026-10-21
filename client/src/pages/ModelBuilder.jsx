import { useEffect, useState } from "react";
import "../styles/model-builder.css";

import { projectsApi } from "../services/projectsApi";
import { modelsApi } from "../services/modelsApi";

const EMPTY_ASSET = {
  assetName: "",
  expectedReturn: "",
  riskScore: "",
  minAllocation: 0,
  maxAllocation: 100,
};

export default function ModelBuilder() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");

  // All models of the selected project, and the one being edited ("" = new model)
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState("");

  const [modelName, setModelName] = useState("");
  const [objectiveType, setObjectiveType] = useState("Maximize Return");
  const [totalBudget, setTotalBudget] = useState("");
  const [assets, setAssets] = useState([{ ...EMPTY_ASSET }]);
  const [constraints, setConstraints] = useState([]);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingModel, setLoadingModel] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function resetForm() {
    setModelName("");
    setObjectiveType("Maximize Return");
    setTotalBudget("");
    setAssets([{ ...EMPTY_ASSET }]);
    setConstraints([]);
  }

  // Load the user's projects when the page opens.
  useEffect(() => {
    async function loadProjects() {
      try {
        setLoadingProjects(true);
        setError("");
        const data = await projectsApi.list();
        setProjects(data.projects || []);
      } catch (err) {
        setError(err.message || "Unable to load your projects.");
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  // When the project changes: load its models and open the newest one.
  useEffect(() => {
    setMessage("");
    setError("");

    if (!projectId) {
      setModels([]);
      setModelId("");
      resetForm();
      return undefined;
    }

    let cancelled = false;
    async function loadModels() {
      try {
        setLoadingModel(true);
        const data = await modelsApi.list(projectId);
        if (cancelled) return;
        const list = data.models || [];
        setModels(list);
        setModelId(list.length ? String(list[0].model_id) : "");
        if (!list.length) resetForm();
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load the models.");
      } finally {
        if (!cancelled) setLoadingModel(false);
      }
    }
    loadModels();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // When a model is picked: load its assets and constraints into the form.
  useEffect(() => {
    if (!projectId || !modelId) return undefined;

    let cancelled = false;
    async function loadModel() {
      try {
        setLoadingModel(true);
        const data = await modelsApi.get(projectId, modelId);
        if (cancelled || !data.model) return;

        setModelName(data.model.model_name || "");
        setObjectiveType(data.model.objective_type || "Maximize Return");
        setTotalBudget(data.model.total_budget ?? "");

        setAssets(
          data.assets?.length
            ? data.assets.map((asset) => ({
                assetName: asset.asset_name || "",
                expectedReturn: asset.expected_return ?? "",
                riskScore: asset.risk_score ?? "",
                minAllocation: asset.min_allocation ?? 0,
                maxAllocation: asset.max_allocation ?? 100,
              }))
            : [{ ...EMPTY_ASSET }]
        );

        setConstraints(
          data.constraints?.map((constraint) => ({
            constraintType: constraint.constraint_type || "",
            operator: constraint.operator || "<=",
            targetValue: constraint.target_value ?? "",
          })) || []
        );
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load the model.");
      } finally {
        if (!cancelled) setLoadingModel(false);
      }
    }
    loadModel();
    return () => {
      cancelled = true;
    };
  }, [projectId, modelId]);

  function pickModel(value) {
    setError("");
    setMessage("");
    setModelId(value);
    if (!value) resetForm(); // "+ New model"
  }

  /*
   * Asset functions
   */
  function addAsset() {
    setAssets([
      ...assets,
      {
        assetName: "",
        expectedReturn: "",
        riskScore: "",
        minAllocation: 0,
        maxAllocation: 100,
      },
    ]);
  }

  function removeAsset(index) {
    if (assets.length === 1) {
      return;
    }

    setAssets(
      assets.filter((_, assetIndex) => assetIndex !== index)
    );
  }

  function updateAsset(index, field, value) {
    setAssets(
      assets.map((asset, assetIndex) =>
        assetIndex === index
          ? {
              ...asset,
              [field]: value,
            }
          : asset
      )
    );
  }

  /*
   * Constraint functions
   */
  function addConstraint() {
    setConstraints([
      ...constraints,
      {
        constraintType: "",
        operator: "<=",
        targetValue: "",
      },
    ]);
  }

  function removeConstraint(index) {
    setConstraints(
      constraints.filter(
        (_, constraintIndex) =>
          constraintIndex !== index
      )
    );
  }

  function updateConstraint(index, field, value) {
    setConstraints(
      constraints.map(
        (constraint, constraintIndex) =>
          constraintIndex === index
            ? {
                ...constraint,
                [field]: value,
              }
            : constraint
      )
    );
  }

  /*
   * Save Model
   * asNew = false -> update the selected model (or create it if none selected)
   * asNew = true  -> keep the selected model and save a NEW one
   */
  async function handleSubmit(event, asNew = false) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!projectId) {
      setError("Please select a project.");
      return;
    }

    if (!modelName.trim()) {
      setError("Please enter a model name.");
      return;
    }

    if (!totalBudget || Number(totalBudget) <= 0) {
      setError("Please enter a valid total budget.");
      return;
    }

    if (assets.length === 0) {
      setError("Please add at least one asset.");
      return;
    }

    for (const asset of assets) {
      if (!asset.assetName.trim()) {
        setError("Every asset must have a name.");
        return;
      }
    }

    const body = {
      modelName: modelName.trim(),
      objectiveType,
      totalBudget: Number(totalBudget),
      assets: assets.map((asset) => ({
        assetName: asset.assetName.trim(),
        expectedReturn: Number(asset.expectedReturn),
        riskScore: Number(asset.riskScore),
        minAllocation: Number(asset.minAllocation),
        maxAllocation: Number(asset.maxAllocation),
      })),
      constraints: constraints.map((constraint) => ({
        constraintType: constraint.constraintType.trim(),
        operator: constraint.operator,
        targetValue: Number(constraint.targetValue),
      })),
    };
    if (modelId && !asNew) body.modelId = Number(modelId);

    try {
      setSaving(true);
      const res = await modelsApi.save(projectId, body);

      const data = await modelsApi.list(projectId);
      setModels(data.models || []);
      setModelId(String(res.modelId));

      setMessage(asNew ? "Saved as a new model." : "Model saved successfully.");
    } catch (err) {
      setError(err.message || "Unable to save the model.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * Delete the selected model (its runs are deleted with it)
   */
  async function handleDelete() {
    const current = models.find((m) => String(m.model_id) === String(modelId));
    if (!current) return;
    if (!window.confirm(`Delete "${current.model_name}"? Its run history will be deleted too.`)) return;

    try {
      setSaving(true);
      setError("");
      await modelsApi.remove(projectId, modelId);

      const data = await modelsApi.list(projectId);
      const list = data.models || [];
      setModels(list);
      setModelId(list.length ? String(list[0].model_id) : "");
      if (!list.length) resetForm();
      setMessage("Model deleted.");
    } catch (err) {
      setError(err.message || "Unable to delete the model.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="model-builder">
      <div className="model-builder__header">
        <div>
          <h1>Model Builder</h1>
          <p>
            Build and configure your Finance
            optimization model.
          </p>
        </div>
      </div>

      {error && (
        <div className="model-builder__message model-builder__message--error">
          {error}
        </div>
      )}

      {message && (
        <div className="model-builder__message model-builder__message--success">
          {message}
        </div>
      )}

      <form
        className="model-builder__form"
        onSubmit={handleSubmit}
      >
        {/* PROJECT */}
        <section className="model-builder__section">
          <div className="model-builder__section-header">
            <div>
              <h2>Project</h2>
              <p>
                Select the project where this model
                will be saved.
              </p>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="project">Project</label>
            <select
              id="project"
              value={projectId}
              onChange={(event) =>
                setProjectId(event.target.value)
              }
              disabled={loadingProjects}
            >
              <option value="">
                {loadingProjects
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
          </div>
          {projectId && (
            <div className="form-group">
              <label htmlFor="model">Model</label>
              <select
                id="model"
                value={modelId}
                onChange={(event) => pickModel(event.target.value)}
                disabled={loadingModel}
              >
                <option value="">+ New model</option>
                {models.map((model) => (
                  <option key={model.model_id} value={model.model_id}>
                    {model.model_name} · {model.objective_type} · {model.asset_count} asset
                    {Number(model.asset_count) === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* MODEL INFORMATION */}
        <section className="model-builder__section">
          <div className="model-builder__section-header">
            <div>
              <h2>Model Information</h2>
              <p>
                Define the basic parameters for
                your optimization model.
              </p>
            </div>
          </div>

          <div className="model-builder__grid">
            <div className="form-group">
              <label htmlFor="modelName">Model Name</label>
              <input
                id="modelName"
                type="text"
                value={modelName}
                onChange={(event) =>
                  setModelName(event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="objectiveType">Objective</label>
              <select
                id="objectiveType"
                value={objectiveType}
                onChange={(event) =>
                  setObjectiveType(
                    event.target.value
                  )
                }
              >
                <option value="Select Objective">
                  Select Objective
                </option>
                <option value="Maximize Return">
                  Maximize Return
                </option>
                <option value="Minimize Risk">
                  Minimize Risk
                </option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="totalBudget">Total Budget</label>
              <input
                id="totalBudget"
                type="number"
                min="0"
                step="0.01"
                placeholder="100000"
                value={totalBudget}
                onChange={(event) =>
                  setTotalBudget(event.target.value)
                }
              />
            </div>
          </div>
        </section>

        {/* ASSETS */}
        <section className="model-builder__section">
          <div className="model-builder__section-header">
            <div>
              <h2>Assets</h2>
              <p>
                Add the assets that can be used
                by the optimization model.
              </p>
            </div>

            <button
              type="button"
              className="btn btn--secondary"
              onClick={addAsset}
            >
              + Add Asset
            </button>
          </div>

          <div className="model-builder__assets">
            {assets.map((asset, index) => (
              <div
                className="model-builder__asset"
                key={index}
              >
                <div className="model-builder__asset-header">
                  <h3>Asset {index + 1}</h3>

                  {assets.length > 1 && (
                    <button
                      type="button"
                      className="model-builder__remove"
                      onClick={() =>
                        removeAsset(index)
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="model-builder__grid">
                  <div className="form-group">
                    <label>Asset Name</label>
                    <input
                      type="text"
                      value={asset.assetName}
                      onChange={(event) =>
                        updateAsset(
                          index,
                          "assetName",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Expected Return (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="8"
                      value={asset.expectedReturn}
                      onChange={(event) =>
                        updateAsset(
                          index,
                          "expectedReturn",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Risk Score</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="5"
                      value={asset.riskScore}
                      onChange={(event) =>
                        updateAsset(
                          index,
                          "riskScore",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Minimum Allocation (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={asset.minAllocation}
                      onChange={(event) =>
                        updateAsset(
                          index,
                          "minAllocation",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Maximum Allocation (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={asset.maxAllocation}
                      onChange={(event) =>
                        updateAsset(
                          index,
                          "maxAllocation",
                          event.target.value
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CONSTRAINTS */}
        <section className="model-builder__section">
          <div className="model-builder__section-header">
            <div>
              <h2>Constraints</h2>
              <p>
                Define additional rules for the
                optimization model.
              </p>
            </div>

            <button
              type="button"
              className="btn btn--secondary"
              onClick={addConstraint}
            >
              + Add Constraint
            </button>
          </div>

          {constraints.length === 0 ? (
            <div className="model-builder__empty">
              No constraints added yet.
            </div>
          ) : (
            <div className="model-builder__constraints">
              {constraints.map((constraint, index) => (
                <div
                  className="model-builder__constraint"
                  key={index}
                >
                  <div className="form-group">
                    <label>Constraint</label>
                    <input
                      type="text"
                      value={constraint.constraintType}
                      onChange={(event) =>
                        updateConstraint(
                          index,
                          "constraintType",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Operator</label>
                    <select
                      value={constraint.operator}
                      onChange={(event) =>
                        updateConstraint(
                          index,
                          "operator",
                          event.target.value
                        )
                      }
                    >
                      <option value="<=">
                        Less than or equal to
                      </option>
                      <option value=">=">
                        Greater than or equal to
                      </option>
                      <option value="=">
                        Equal to
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Target Value</label>
                    <input
                      type="number"
                      step="0.01"
                      value={constraint.targetValue}
                      onChange={(event) =>
                        updateConstraint(
                          index,
                          "targetValue",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="model-builder__remove"
                    onClick={() => removeConstraint(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SAVE & ACTIONS */}
        <div className="model-builder__actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : modelId ? "Update Model" : "Save Model"}
          </button>

          {modelId && (
            <button type="button" disabled={saving} onClick={(event) => handleSubmit(event, true)}>
              Save as new model
            </button>
          )}

          {modelId && (
            <button type="button" className="danger" disabled={saving} onClick={handleDelete}>
              Delete Model
            </button>
          )}
        </div>
      </form>
    </main>
  );
}