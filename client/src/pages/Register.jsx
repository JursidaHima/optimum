import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    
    try {
      await register({ name, surname, email, password });
      await login(email, password); // auto-login right after signup
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container" style={{ maxWidth: 420, paddingTop: "3rem" }}>
      <h1>Create your account</h1>
      
      {error && <p className="alert alert--error" role="alert">{error}</p>}
      
      <form onSubmit={onSubmit} noValidate>
        <FormField label="Name">
          {(p) => <input {...p} type="text" value={name} onChange={(e) => setName(e.target.value)} required />}
        </FormField>
        
        <FormField label="Surname">
          {(p) => <input {...p} type="text" value={surname} onChange={(e) => setSurname(e.target.value)} required />}
        </FormField>
        
        <FormField label="Email">
          {(p) => <input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        </FormField>
        
        <FormField label="Password" hint="At least 8 characters, with an uppercase letter, a lowercase letter, and a number.">
          {(p) => <input {...p} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </FormField>
        
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? "Creating account\u2026" : "Sign up"}
        </button>
      </form>
      
      <p style={{ marginTop: "1rem" }}>Already have an account? <Link to="/login">Log in</Link></p>
    </section>
  );
}