import { useEffect, useState } from "react";
import "../styles/model-builder.css";

import { projectsApi } from "../services/projectsApi";
import { modelsApi } from "../services/modelsApi";

export default function ModelBuilder() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");

  const [modelName, setModelName] = useState("");
  const [objectiveType, setObjectiveType] = useState("Maximize Return");
  const [totalBudget, setTotalBudget] = useState("");

  const [assets, setAssets] = useState([
    {
      assetName: "",
      expectedReturn: "",
      riskScore: "",
      minAllocation: 0,
      maxAllocation: 100,
    },
  ]);

  const [constraints, setConstraints] = useState([]);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingModel, setLoadingModel] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
   * Load the user's projects when the page opens.
   */
  useEffect(() => {
    async function loadProjects() {
      try {
        setLoadingProjects(true);
        setError("");

        const data = await projectsApi.list();

        setProjects(data.projects || []);
      } catch (err) {
        setError(
          err.message || "Unable to load your projects."
        );
      } finally {
        setLoadingProjects(false);
      }
    }

    loadProjects();
  }, []);

  /*
   * Load the selected project's model.
   */
  useEffect(() => {
    if (!projectId) {
      return;
    }

    async function loadModel() {
      try {
        setLoadingModel(true);
        setError("");
        setMessage("");

        const data = await modelsApi.get(projectId);

        if (!data.model) {
          setModelName("");
          setObjectiveType("Maximize Return");
          setTotalBudget("");

          setAssets([
            {
              assetName: "",
              expectedReturn: "",
              riskScore: "",
              minAllocation: 0,
              maxAllocation: 100,
            },
          ]);

          setConstraints([]);

          return;
        }

        setModelName(data.model.model_name || "");

        setObjectiveType(
          data.model.objective_type || "Maximize Return"
        );

        setTotalBudget(
          data.model.total_budget ?? ""
        );

        setAssets(
          data.assets?.length
            ? data.assets.map((asset) => ({
                assetName: asset.asset_name || "",
                expectedReturn:
                  asset.expected_return ?? "",
                riskScore: asset.risk_score ?? "",
                minAllocation:
                  asset.min_allocation ?? 0,
                maxAllocation:
                  asset.max_allocation ?? 100,
              }))
            : [
                {
                  assetName: "",
                  expectedReturn: "",
                  riskScore: "",
                  minAllocation: 0,
                  maxAllocation: 100,
                },
              ]
        );

        setConstraints(
          data.constraints?.map((constraint) => ({
            constraintType:
              constraint.constraint_type || "",
            operator:
              constraint.operator || "<=",
            targetValue:
              constraint.target_value ?? "",
          })) || []
        );
      } catch (err) {
        setError(
          err.message || "Unable to load the model."
        );
      } finally {
        setLoadingModel(false);
      }
    }

    loadModel();
  }, [projectId]);

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
   */
  async function handleSubmit(event) {
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

    try {
      setSaving(true);

      await modelsApi.save(projectId, {
        modelName: modelName.trim(),
        objectiveType,
        totalBudget: Number(totalBudget),

        assets: assets.map((asset) => ({
          assetName: asset.assetName.trim(),
          expectedReturn:
            Number(asset.expectedReturn),
          riskScore:
            Number(asset.riskScore),
          minAllocation:
            Number(asset.minAllocation),
          maxAllocation:
            Number(asset.maxAllocation),
        })),

        constraints: constraints.map(
          (constraint) => ({
            constraintType:
              constraint.constraintType.trim(),
            operator:
              constraint.operator,
            targetValue:
              Number(constraint.targetValue),
          })
        ),
      });

      setMessage(
        "Model saved successfully."
      );
    } catch (err) {
      setError(
        err.message || "Unable to save the model."
      );
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
            <label htmlFor="project">
              Project
            </label>

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
              <label htmlFor="modelName">
                Model Name
              </label>

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
              <label htmlFor="objectiveType">
                Objective
              </label>

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
              <label htmlFor="totalBudget">
                Total Budget
              </label>

              <input
                id="totalBudget"
                type="number"
                min="0"
                step="0.01"
                placeholder="100000"
                value={totalBudget}
                onChange={(event) =>
                  setTotalBudget(
                    event.target.value
                  )
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
                  <h3>
                    Asset {index + 1}
                  </h3>

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
                    <label>
                      Asset Name
                    </label>

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
                    <label>
                      Expected Return (%)
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      placeholder="8"
                      value={
                        asset.expectedReturn
                      }
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
                    <label>
                      Risk Score
                    </label>

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
                    <label>
                      Minimum Allocation (%)
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        asset.minAllocation
                      }
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
                    <label>
                      Maximum Allocation (%)
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        asset.maxAllocation
                      }
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
              {constraints.map(
                (constraint, index) => (
                  <div
                    className="model-builder__constraint"
                    key={index}
                  >
                    <div className="form-group">
                      <label>
                        Constraint
                      </label>

                      <input
                        type="text"
                  
                        value={
                          constraint.constraintType
                        }
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
                      <label>
                        Operator
                      </label>

                      <select
                        value={
                          constraint.operator
                        }
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
                      <label>
                        Target Value
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        value={
                          constraint.targetValue
                        }
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
                      onClick={() =>
                        removeConstraint(index)
                      }
                    >
                      Remove
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* SAVE */}
        <div className="model-builder__actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={saving || loadingModel}
          >
            {saving
              ? "Saving Model..."
              : "Save Model"}
          </button>
        </div>
      </form>
    </main>
  );
}