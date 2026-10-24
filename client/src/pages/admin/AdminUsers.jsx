import { useCallback, useEffect, useState } from "react";
import FormField from "../../components/FormField.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { adminApi } from "../../services/adminApi";
import { formatDateTime } from "../../utils/format";

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editing, setEditing] = useState(null); // User currently being edited
  const [form, setForm] = useState({ name: "", surname: "", email: "" });
  const [formError, setFormError] = useState({ field: "", message: "" });
  const [busy, setBusy] = useState(false);

  const [detail, setDetail] = useState(null); // { user, activity, runs }

  // Load users matching filter criteria
  const load = useCallback(() => {
    adminApi
      .listUsers({ search, status })
      .then((d) => {
        setUsers(d.users);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [search, status]);

  // Debounced effect for search and status filters
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  function openEdit(user) {
    setEditing(user);
    setForm({ name: user.name, surname: user.surname, email: user.email });
    setFormError({ field: "", message: "" });
    setDetail(null);
  }

  async function openDetail(user) {
    setEditing(null);
    try {
      setDetail(await adminApi.getUser(user.user_id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function onSave(e) {
    e.preventDefault();
    setBusy(true);
    setFormError({ field: "", message: "" });

    try {
      const res = await adminApi.updateUser(editing.user_id, form);
      setNotice(res.message);
      setEditing(null);
      load();
    } catch (err) {
      setFormError({ field: "", message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(user) {
    const isSuspending = user.status === "Active";
    if (
      isSuspending &&
      !window.confirm(`Suspend ${user.email}? They will be signed out and unable to log in.`)
    ) {
      return;
    }

    try {
      const res = isSuspending
        ? await adminApi.suspendUser(user.user_id)
        : await adminApi.reactivateUser(user.user_id);
      
      setNotice(res.message);
      setError("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="admin">
      <header className="header">
        <h1>Users</h1>
        <p>View and edit Optimizers, review their activity, and manage account status.</p>
      </header>

      {notice && <p className="alert success" role="status">{notice}</p>}
      {error && <p className="alert error" role="alert">{error}</p>}

      {/* Filter Controls */}
      <div className="card filters">
        <label className="filter">
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email"
          />
        </label>
        <label className="filter">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
        </label>
      </div>

      {/* Edit User Form Modal/Card */}
      {editing && (
        <form className="card" onSubmit={onSave} noValidate>
          <h2>Edit {editing.email}</h2>
          {formError.message && <p className="alert error" role="alert">{formError.message}</p>}
          <div className="form-grid">
            <FormField label="Name">
              {(p) => <input {...p} type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            </FormField>
            <FormField label="Surname">
              {(p) => <input {...p} type="text" value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} />}
            </FormField>
            <FormField label="Email">
              {(p) => <input {...p} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
            </FormField>
          </div>
          <div className="actions">
            <button type="submit" className="btn primary" disabled={busy}>Save changes</button>
            <button type="button" className="btn ghost dark" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {/* User Detail & Activity Panel */}
      {detail && (
        <div className="card">
          <div className="card-head">
            <h2>Activity — {detail.user.name} {detail.user.surname}</h2>
            <button type="button" className="btn ghost small dark" onClick={() => setDetail(null)}>Close</button>
          </div>

          <h3>Recent runs</h3>
          {detail.runs.length === 0 ? (
            <p className="muted">No runs yet.</p>
          ) : (
            <ul className="list">
              {detail.runs.map((r) => (
                <li key={r.run_id}>
                  Run #{r.run_id} · {r.project_name} / {r.model_name} · <StatusBadge status={r.status} /> · {formatDateTime(r.created_at)}
                </li>
              ))}
            </ul>
          )}

          <h3>Recent actions</h3>
          {detail.activity.length === 0 ? (
            <p className="muted">No actions recorded.</p>
          ) : (
            <ul className="list">
              {detail.activity.map((a) => (
                <li key={a.log_id}>
                  {formatDateTime(a.timestamp)} · <code>{a.action_type}</code> {a.details ? `· ${a.details}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Users Data Table */}
      <div className="card">
        {!users ? (
          <p>Loading…</p>
        ) : users.length === 0 ? (
          <p className="muted">No users match these filters.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Projects</th>
                  <th>Runs</th>
                  <th>Last login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isOptimizer = u.role_name === "Optimizer";
                  return (
                    <tr key={u.user_id}>
                      <td>{u.name} {u.surname}</td>
                      <td>{u.email}</td>
                      <td>{u.role_name}</td>
                      <td>
                        <span className={`pill ${u.status.toLowerCase()}`}>{u.status}</span>
                      </td>
                      <td>{u.project_count}</td>
                      <td>{u.run_count}</td>
                      <td>{formatDateTime(u.last_login)}</td>
                      <td className="row-actions">
                        {/* <button type="button" className="text-btn" onClick={() => openDetail(u)}>Activity</button> */}
                        {isOptimizer && (
                          <>
                            <button type="button" className="text-btn" onClick={() => openEdit(u)}>Edit</button>
                            <button type="button" className="text-btn danger" onClick={() => toggleStatus(u)}>
                              {u.status === "Active" ? "Suspend" : "Reactivate"}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}