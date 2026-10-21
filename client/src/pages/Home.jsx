
import { Link } from "react-router-dom";
import "../styles/home.css";

const CARDS = [
  {
    title: "Finance Optimization",
    text: "Create financial optimization models by defining your investment budget, available assets, expected returns, and allocation limits. Apply constraints to control how your funds are distributed, then use the HiGHS optimization solver to find an allocation that meets your requirements.",
    points: [
      "Define budgets and investment assets",
      "Set minimum and maximum allocations",
      "Maximize expected portfolio return"
    ]
  },
  {
    title: "Clear Results",
    text: "Understand your optimization results through organized financial summaries and visual charts. Review how your budget is allocated across assets, examine the expected portfolio return, and use the results to evaluate different investment decisions.",
    points: [
      "View optimized asset allocations",
      "Explore financial results and charts",
      "Review portfolio performance metrics"
    ]
  },
  {
    title: "Built for Transparency",
    text: "Understand how your financial optimization models are created and solved. Optimum Finance allows you to review model inputs, monitor optimization status, and access previous runs, helping you understand the mathematical process behind each result.",
    points: [
      "Review model inputs and constraints",
      "Track optimization run status",
      "Access saved projects and run history"
    ]
  }
];

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="layout">
          <div className="copy">
            <div className="badge">
              Open mathematical optimization
            </div>

            <h1>Optimize your future</h1>

            <p className="lead">
              Optimum helps you build optimized solutions
              using mathematical optimization.
            </p>
{/* 
            <p className="description">
              Explore financial optimization by creating
              investment models, defining constraints,
              and analyzing optimized portfolio allocations
              through a clear and structured platform.
            </p> */}

            <div className="actions">
              <Link to="/register" className="button">
                Get started
              </Link>
            </div>
          </div>

          <div className="media">
            <img
              src="/herohome.png"
              alt="Financial optimization illustration"
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="layout">
          {/* <div className="heading">
            <h2>Explore Optimum Finance</h2>
            <p>
              Everything you need to build, solve, and
              understand financial optimization models.
            </p>
          </div> */}

          <div className="grid">
            {CARDS.map((card, index) => (
              <article className="card" key={card.title}>
                {/* <div className="number">
                  {String(index + 1).padStart(2, "0")}
                </div> */}

                <h3>{card.title}</h3>

                <p>{card.text}</p>

                <ul className="details">
                  {card.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
