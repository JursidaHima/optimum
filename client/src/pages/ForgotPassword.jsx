import { useState } from "react";
import { Link } from "react-router-dom";
import FormField from "../components/FormField.jsx";
import { authApi } from "../services/authApi";
import "../styles/auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrapper">
      <div className="card">
        <h1>Forgot your password?</h1>
        <h2>Enter your email and we'll send you a reset link.</h2>

        {error && <p className="error-box" role="alert">{error}</p>}
        {message && <p className="success-box" role="status">{message}</p>}

        <form onSubmit={handleSubmit}>
          <FormField label="Email">
            {(props) => (
              <input
                {...props}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
          </FormField>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="bottom-text">
          <Link to="/login">Back to log in</Link>
        </p>
      </div>
    </div>
  );
}