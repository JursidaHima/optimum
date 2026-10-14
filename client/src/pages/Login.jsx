import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const session = await login(email, password);
      navigate(session.user.role === "Admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container auth-page">
      <h1>Log in</h1>
      {error && <p className="alert alert--error" role="alert">{error}</p>}
      <form onSubmit={onSubmit} noValidate>
        <FormField label="Email">
          {(p) => <input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        </FormField>
        <FormField label="Password">
          {(p) => <input {...p} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </FormField>
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? "Logging in\u2026" : "Log in"}
        </button>
      </form>
      <p className="auth-page__alt">No account? <Link to="/register">Sign up</Link></p>
    </section>
  );
}