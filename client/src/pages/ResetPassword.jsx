import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import FormField from "../components/FormField.jsx";
import { authApi } from "../services/authApi";
import "../styles/auth.css";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword(token, password);
      setMessage(res.message);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrapper">
      <div className="card">
        <h1>Choose a new password</h1>
        <h2>Pick a strong password you haven't used before.</h2>

        {!token && (
          <p className="error-box" role="alert">
            This reset link is missing its token. Request a new one.
          </p>
        )}
        {error && <p className="error-box" role="alert">{error}</p>}
        {message && <p className="success-box" role="status">{message}</p>}

        <form onSubmit={handleSubmit}>
          <FormField
            label="New password"
            hint="At least 8 characters, with an uppercase letter, a lowercase letter, and a number."
          >
            {(props) => (
              <input
                {...props}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}
          </FormField>

          <FormField label="Confirm password">
            {(props) => (
              <input
                {...props}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            )}
          </FormField>

          <button type="submit" className="submit-btn" disabled={loading || !token}>
            {loading ? "Saving..." : "Reset password"}
          </button>
        </form>

        <p className="bottom-text">
          <Link to="/forgot-password">Request a new link</Link>
        </p>
      </div>
    </div>
  );
}