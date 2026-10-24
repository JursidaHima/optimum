
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
    <main className="finance">

      {/* HERO SECTION */}

      <section className="hero financehero">
        <div className="container grid">

          <div className="copy">

            <div className="badge">
              Solutions · Finance
            </div>

            <h1>Finance solution</h1>

            <p className="lead">
              Optimize your investment portfolio with mathematical precision.
            </p>

            <div className="actions">
              <Link
                to="/register"
                className="btn primary large"
              >
                Get Started
              </Link>
            </div>

          </div>

          <div className="media">
            <img
              src="/herofinance.png"
              alt="Finance Optimization"
              className="hero-img"
            />
          </div>

        </div>
      </section>

      {/* FINANCE FEATURE CARDS */}

      <section className="section financecards">
        <div className="container">

          <ul className="card-grid 3">

            {CARDS.map((card) => (
              <li key={card.title} className="info-card">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </li>
            ))}

          </ul>

        </div>
      </section>

      {/* OPTIMIZATION MODEL SECTION */}

      <section className="section band">

        <div className="container split">

          <div>

            <h2 className="section-title title">
              What the model looks like
            </h2>

            <p className="text">
              Optimum formulates your inputs as a linear program:
              one decision variable per asset, an objective that
              maximizes expected return, and constraints for your
              total budget and each asset's allocation limits.
            </p>

          </div>

          <div>

            <pre className="code">
              <code>{`maximize  Σ rᵢ · xᵢ
subject to Σ xᵢ ≤ Budget
           minᵢ ≤ xᵢ ≤ maxᵢ`}</code>
            </pre>

          </div>

        </div>

      </section>

    </main>
  );
}
