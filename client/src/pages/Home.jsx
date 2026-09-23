import { Link } from "react-router-dom";

const CARDS = [
  {
    title: "Finance Optimization",
    text: "Define a budget, assets and allocation limits, then solve a mathematical optimization model."
  },
  {
    title: "Clear Results",
    text: "View the recommended allocation and expected return through readable results and charts."
  },
  {
    title: "Built for Transparency",
    text: "See model inputs, optimization status and saved project history instead of a black-box recommendation."
  }
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <div className="hero__badge" style={{ fontWeight: 600, color: "#0f766e", marginBottom: "0.75rem", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Open mathematical optimization
            </div>
            
            <h1>Optimize your future</h1>
            
            <p className="lead">
              Optimum helps you build optimized solutions using mathematical optimization.
            </p>
            
            <div className="hero__actions">
              <Link to="/register" className="btn btn--primary btn--lg">Get started</Link>
            </div>
          </div>

          <div className="hero__media">
            <img 
              src="/herohome.png" 
              alt="Optimization" 
              style={{ width: "100%", height: "auto", display: "block", borderRadius: "16px", boxShadow: "var(--shadow)" }} 
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <ul className="card-grid card-grid--3">
            {CARDS.map((card) => (
              <li key={card.title} className="info-card">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}