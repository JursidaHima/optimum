import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/auth.css";

const REMEMBER_KEY = "optimum_remember_email";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // "Remember me": prefill the email saved on a previous login
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* storage unavailable: ignore */
    }
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const session = await login(email, password);

      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, email);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* storage unavailable: ignore */
      }

      // Redirect based on user role
      if (session.user.role === "Admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrapper">
      <div className="card">
        <h1>Welcome Back</h1>
        <h2>Log in to your account.</h2>

        {error && <p className="error-box" role="alert">{error}</p>}

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

          <FormField label="Password">
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

          <label className="remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="bottom-text">
          <Link to="/forgot-password">Forgot your password?</Link>
          <br />
          <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}