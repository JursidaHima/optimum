import { Link } from "react-router-dom";

const CARDS = [
  {
    title: "Portfolio Optimization",
    text: "Choose how to split a fixed budget across assets to maximize expected return, within limits you define."
  },
  {
    title: "Detailed Results",
    text: "See the recommended allocation, expected return and constraint status as KPI cards and an allocation chart."
  },
  {
    title: "Asset Management",
    text: "Enter assets by hand or upload a CSV / JSON portfolio, and set minimum and maximum allocation per asset."
  }
];

export default function FinanceSolution() {
  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <div className="hero__badge" style={{ fontWeight: 600, color: "#0f766e", marginBottom: "0.75rem", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Solutions · Finance
            </div>
            
            <h1>Finance solution</h1>
            
            <p className="lead">
              Optimize your investment portfolio with mathematical precision.
            </p>
            
            <div className="hero__actions">
              <Link to="/register" className="btn btn--primary btn--lg">Get Started</Link>
            </div>
          </div>

          <div className="hero__media">
            <img 
              src="/herofinance.png" 
              alt="Finance Optimization" 
              style={{ width: "100%", height: "auto", display: "block", borderRadius: "16px" }} 
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

      <section className="section section--band" style={{ backgroundColor: "#f3f4f6", padding: "4rem 0" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center" }}>
          <div>
            <h2 className="section-title" style={{ marginBottom: "1rem" }}>What the model looks like</h2>
            <p style={{ color: "#64748B", margin: 0 }}>
              Optimum formulates your inputs as a linear program: one decision variable per asset, an objective that maximizes expected return, and constraints for your total budget and each asset's allocation limits.
            </p>
          </div>
          <div>
            <pre style={{ background: "#0f172a", color: "#38bdf8", padding: "1.5rem", borderRadius: "12px", fontSize: "0.9rem", overflowX: "auto", margin: 0 }}>
<code>{`maximize  Σ rᵢ · xᵢ
subject to Σ xᵢ ≤ Budget
           minᵢ ≤ xᵢ ≤ maxᵢ`}</code>
            </pre>
          </div>
        </div>
      </section>
    </>
  );
}