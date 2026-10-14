import { useEffect, useState } from "react";
import FormField from "../../components/FormField.jsx";
import { adminApi } from "../../services/adminApi";
import { formatDateTime } from "../../utils/format";

const SAMPLE_CONFIG = JSON.stringify(
  {
    objectiveType: "Maximize Return",
    totalBudget: 10000,
    assets: [
      { assetName: "Stocks", expectedReturn: 8, riskScore: 6, minAllocation: 10, maxAllocation: 60 },
      { assetName: "Bonds", expectedReturn: 4, riskScore: 2, minAllocation: 10, maxAllocation: 70 },
    ],
    constraints: [{ constraintType: "Total allocation", operator: "=", targetValue: 100 }],
  },
  null,
  2,
);

const EMPTY = { templateName: "", description: "", defaultConfigJson: SAMPLE_CONFIG };

export default function AdminTemplates() {
  const [templates, setTemplates] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | template
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => adminApi.listTemplates().then((d) => setTemplates(d.templates)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing("new");
    setForm(EMPTY);
    setFormError("");
  }

  function openEdit(t) {
    setEditing(t);
    setForm({ templateName: t.template_name, description: t.description, defaultConfigJson: t.default_config_json });
    setFormError("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const res = editing === "new"
        ? await adminApi.createTemplate(form)
        : await adminApi.updateTemplate(editing.template_id, form);
      setNotice(res.message);
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(t) {
    if (!window.confirm(`Delete template "${t.template_name}"?`)) return;
    try {
      const res = await adminApi.deleteTemplate(t.template_id);
      setNotice(res.message);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="admin">
      <header className="admin__header admin__header--row">
        <div>
          <h1>Templates</h1>
          <p>Starter finance models that administrators maintain for the platform.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openNew}>+ New template</button>
      </header>

      {notice && <p className="alert alert--success" role="status">{notice}</p>}
      {error && <p className="alert alert--error" role="alert">{error}</p>}

      {editing && (
        <form className="admin__card" onSubmit={onSubmit} noValidate>
          <h2>{editing === "new" ? "New template" : "Edit template"}</h2>
          {formError && <p className="alert alert--error" role="alert">{formError}</p>}
          <FormField label="Template name">
            {(p) => <input {...p} type="text" value={form.templateName} onChange={(e) => setForm({ ...form, templateName: e.target.value })} />}
          </FormField>
          <FormField label="Description">
            {(p) => <textarea {...p} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
          </FormField>
          <FormField
            label="Default configuration (JSON)"
            hint="Needs objectiveType, totalBudget, assets (assetName, expectedReturn, riskScore, minAllocation, maxAllocation) and optional constraints."
          >
            {(p) => (
              <textarea
                {...p}
                className="admin__code"
                rows={14}
                spellCheck={false}
                value={form.defaultConfigJson}
                onChange={(e) => setForm({ ...form, defaultConfigJson: e.target.value })}
              />
            )}
          </FormField>
          <div className="admin__actions">
            <button type="submit" className="btn btn--primary" disabled={busy}>Save template</button>
            <button type="button" className="btn btn--ghost btn--dark" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {!templates ? (
        <p>Loading…</p>
      ) : templates.length === 0 ? (
        <div className="admin__card"><p className="admin__muted">No templates yet. Create the first one.</p></div>
      ) : (
        <ul className="admin__grid">
          {templates.map((t) => {
            let assetCount = "?";
            try { assetCount = JSON.parse(t.default_config_json).assets.length; } catch { /* keep "?" */ }
            return (
              <li key={t.template_id} className="admin__card">
                <h3>{t.template_name}</h3>
                <p>{t.description}</p>
                <p className="admin__muted">{assetCount} assets · created {formatDateTime(t.created_at)}</p>
                <div className="admin__actions">
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => openEdit(t)}>Edit</button>
                  <button type="button" className="btn btn--ghost btn--sm btn--dark" onClick={() => onDelete(t)}>Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}