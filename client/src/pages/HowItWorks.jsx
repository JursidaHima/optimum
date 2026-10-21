
import "../styles/how-it-works.css";

const STEPS = [
  {
    num: "1",
    title: "Create Project",
    text: "Start by creating a new Finance project in your workspace. Give your project a meaningful name so you can easily identify and manage your investment optimization models.",
    points: [
      "Create and name your Finance project",
      "Organize your optimization work",
      "Prepare your investment model"
    ]
  },
  {
    num: "2",
    title: "Add Data",
    text: "Provide the financial information needed for optimization. Define your available investment budget, add assets, and specify the minimum and maximum amounts that can be allocated to each asset.",
    points: [
      "Enter assets and expected returns",
      "Set budget and allocation limits",
      "Import portfolio data using CSV or JSON"
    ]
  },
  {
    num: "3",
    title: "Run Optimization",
    text: "Submit your financial model to the HiGHS optimization solver. The system evaluates your objective and constraints to calculate an optimal allocation based on the information you provided.",
    points: [
      "Solve your linear programming model",
      "Apply your investment constraints",
      "Review the optimization status"
    ]
  },
  {
    num: "4",
    title: "View Results",
    text: "Explore your optimized portfolio through organized summaries and visual charts. Understand how your budget is distributed and evaluate the expected return of the recommended allocation.",
    points: [
      "Review optimized asset allocations",
      "Explore portfolio charts and metrics",
      "Access previous optimization runs"
    ]
  }
];

const BENEFITS = [
  {
    title: "Fast & Accurate",
    text: "Use mathematical optimization to find efficient investment allocations without manually testing every possible combination. The HiGHS solver processes your model and reports the solution status.",
    points: [
      "Mathematical optimization with HiGHS",
      "Efficient solution of linear models",
      "Clear solver status and results"
    ]
  },
  {
    title: "Flexible",
    text: "Build financial optimization models around your own investment goals. Adjust budgets, expected returns, assets, and allocation restrictions to explore different portfolio configurations.",
    points: [
      "Customize investment budgets",
      "Define asset allocation constraints",
      "Explore different model inputs"
    ]
  },
  {
    title: "Secure",
    text: "Work with your financial optimization projects through a personal account. Keep your projects organized and access saved optimization runs when you need to review previous decisions.",
    points: [
      "Personal account access",
      "Organized financial projects",
      "Saved optimization run history"
    ]
  },
  {
    title: "User Friendly",
    text: "Follow a structured workflow that makes mathematical optimization easier to understand. From entering financial data to reviewing portfolio results, each stage is organized for clarity.",
    points: [
      "Simple step-by-step workflow",
      "Clear financial summaries",
      "Easy-to-understand result charts"
    ]
  }
];

export default function HowItWorks() {
  return (
    <main className="how">
      <section className="hero">
        <div className="layout">
          <div className="copy">
            <div className="badge">How it works</div>

            <h1>Get the best results in 4 simple steps</h1>

            <p className="lead">
              From your goals to optimized results — it's easy.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="layout">
          <ul className="grid">
            {STEPS.map((step) => (
              <li className="card step" key={step.num}>
                <div className="number">{step.num}</div>

                <h3>{step.title}</h3>

                <p>{step.text}</p>

                <ul className="details">
                  {step.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section benefits">
        <div className="layout">
          <h2>Why choose Optimum?</h2>

          <ul className="grid">
            {BENEFITS.map((benefit) => (
              <li className="card" key={benefit.title}>
                <h3>{benefit.title}</h3>

                <p>{benefit.text}</p>

                <ul className="details">
                  {benefit.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
