import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import { formatDateTime } from "../../utils/format";

export default function AdminAuditLog() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.listAuditLogs(200).then((d) => setLogs(d.logs)).catch((e) => setError(e.message));
  }, []);

  return (
    <section className="admin">
      <header className="header">
        <h1>Audit Log</h1>
        <p>Who did what and when: logins, admin actions and run results .</p>
      </header>

      {error && <p className="alert error" role="alert">{error}</p>}

      <div className="card">
        {!logs ? (
          <p>Loading…</p>
        ) : logs.length === 0 ? (
          <p className="muted">Nothing recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>When</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.log_id}>
                    <td>{formatDateTime(log.timestamp)}</td>
                    <td>{log.email || "—"}</td>
                    <td><code>{log.action_type}</code></td>
                    <td>{log.details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}