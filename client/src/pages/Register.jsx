import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/auth.css";

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register({ name, surname, email, password });
      await login(email, password); // auto-login right after signup
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrapper">
      <div className="card card--wide">
        <h1>Create an Account</h1>
        <h2>Join Optimum and start optimizing today.</h2>

        {error && <p className="error-box" role="alert">{error}</p>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="row">
            <FormField label="Name">
              {(props) => (
                <input
                  {...props}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              )}
            </FormField>

            <FormField label="Surname">
              {(props) => (
                <input
                  {...props}
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  required
                />
              )}
            </FormField>
          </div>

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

          <FormField
            label="Password"
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

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="bottom-text">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}