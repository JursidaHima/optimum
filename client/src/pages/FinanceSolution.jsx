import { Link } from "react-router-dom";
import "../styles/finance-solution.css";

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
            <div className="hero__badge">
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
              className="finance__hero-img"
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

      <section className="section section--band finance__band">
        <div className="container finance__split">
          <div>
            <h2 className="section-title finance__title">What the model looks like</h2>
            <p className="finance__text">
              Optimum formulates your inputs as a linear program: one decision variable per asset, an objective that maximizes expected return, and constraints for your total budget and each asset's allocation limits.
            </p>
          </div>
          <div>
            <pre className="finance__code">
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