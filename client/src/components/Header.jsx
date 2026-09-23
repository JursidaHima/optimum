import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Header() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="site-header">
      <Link to="/" className="logo">
        <img 
          src="/logofin.jpeg" 
          alt="Optimum" 
          style={{ height: "32px", width: "auto", display: "block" }} 
        />
      </Link>

      <nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/solutions/finance">Solutions</NavLink>
        <NavLink to="/how-it-works">How It Works</NavLink>
        <NavLink to="/documentation">Documentation</NavLink>
        
        {isAuthenticated ? (
          <Link to="/dashboard" className="btn--sm">Dashboard</Link>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register" className="btn--sm">Get Started</Link>
          </>
        )}
      </nav>
    </header>
  );
}