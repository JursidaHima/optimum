import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FormField from "../components/FormField.jsx";
import { projectsApi } from "../services/projectsApi";

export default function Projects() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | project object
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => projectsApi.list().then((d) => setProjects(d.projects)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  function openNew() { setEditing("new"); setName(""); setDescription(""); }
  function openEdit(proj) { setEditing(proj); setName(proj.project_name); setDescription(proj.description || ""); }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { projectName: name, description };
      const res = editing === "new" ? await projectsApi.create(body) : await projectsApi.update(editing.project_id, body);
      setNotice(res.message);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(proj) {
    if (!window.confirm(`Delete "${proj.project_name}"?`)) return;
    const res = await projectsApi.remove(proj.project_id);
    setNotice(res.message);
    load();
  }

  return (
    <section>
      <div className="page-head">
        <div><h1>Your Projects</h1></div>
        <button type="button" className="btn btn--primary" onClick={openNew}>+ New Project</button>
      </div>

      {notice && <p className="alert alert--success" role="status">{notice}</p>}
      {error && <p className="alert alert--error" role="alert">{error}</p>}

      {editing && (
        <div className="panel">
          <h2>{editing === "new" ? "New Project" : "Edit Project"}</h2>
          <form onSubmit={onSubmit} noValidate>
            <FormField label="Project name">
              {(p) => <input {...p} type="text" value={name} onChange={(e) => setName(e.target.value)} required />}
            </FormField>
            <FormField label="Description" required={false}>
              {(p) => <input {...p} type="text" value={description} onChange={(e) => setDescription(e.target.value)} />}
            </FormField>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn btn--primary" disabled={busy}>Save</button>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {!projects ? (
        <p>Loading\u2026</p>
      ) : projects.length === 0 ? (
        <div className="empty-state panel"><p>No projects yet.</p></div>
      ) : (
        <ul className="entity-grid">
          {projects.map((p) => (
            <li key={p.project_id} className="entity-card">
              <h3>{p.project_name}</h3>
              <p>{p.description || "No description."} \u00b7 {p.model_count} model{p.model_count === 1 ? "" : "s"}</p>
              <div className="entity-card__actions">
                <Link to={`/dashboard/projects/${p.project_id}/model`} className="btn btn--primary btn--sm">Open</Link>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(p)}>Edit</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(p)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}