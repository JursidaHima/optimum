
import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/documentation.css";

const CONTENT = {
  "getting-started": {
    title: "Getting Started",
    intro:
      "Follow these five steps to create your first financial optimization project. Learn how to set up your account, prepare investment data, run the optimization model, and review your results.",
    steps: [
      {
        title: "Create an Account",
        text:
          "Register for an Optimum Finance account to access the platform. After registration, sign in to your workspace, where you can create and manage financial optimization projects.",
        link: "/register"
      },
      {
        title: "Create a Project",
        text:
          "Start a new Finance project and give it a descriptive name. Projects help organize your investment scenarios and keep your financial optimization models in one place."
      },
      {
        title: "Add Your Data",
        text:
          "Enter your total investment budget, available assets, and expected returns. Define minimum and maximum allocation limits for each asset, or import portfolio information using a supported CSV or JSON file."
      },
      {
        title: "Run Optimization",
        text:
          "Review your financial inputs and submit the model to the HiGHS optimization solver. The solver evaluates the objective function and constraints to find an optimal allocation when a feasible solution exists."
      },
      {
        title: "View Results",
        text:
          "Explore the optimized asset allocations, expected portfolio return, and solver status. Review financial summaries and charts to understand how your budget is distributed across the selected assets."
      }
    ]
  },

  "user-guide": {
    title: "User Guide",
    intro:
      "Learn how to configure and manage your financial optimization models. Understand how investment assets, budgets, expected returns, and allocation constraints influence the optimization process.",
    steps: [
      {
        title: "Managing Assets and Parameters",
        text:
          "Assets represent the investment options available in your portfolio. Each asset can have an expected return and allocation limits. These values are used to construct the mathematical model and determine how capital should be distributed.",
        details: [
          "Add investment assets to your project.",
          "Enter expected returns for each asset.",
          "Define the available investment budget.",
          "Review and update financial parameters."
        ]
      },
      {
        title: "Understanding Model Bounds",
        text:
          "Model bounds control the minimum and maximum amount that can be invested in each asset. These restrictions allow you to customize the optimization problem while ensuring that the recommended allocation follows your defined limits.",
        details: [
          "Set minimum investment allocations.",
          "Define maximum investment limits.",
          "Keep allocation bounds consistent with the budget.",
          "Review constraints before running the solver."
        ]
      },
      {
        title: "Interpreting Optimization Status",
        text:
          "After submitting your model, the optimization solver returns a status describing the outcome. Understanding this information helps you determine whether a valid solution was found or whether the model requires changes.",
        details: [
          "Optimal: a best solution was found.",
          "Infeasible: the constraints cannot all be satisfied.",
          "Unbounded: the objective has no finite bound.",
          "Other statuses may indicate limits or solver issues."
        ]
      }
    ]
  },

  reference: {
    title: "Reference",
    intro:
      "Explore the mathematical concepts and technical structure behind Optimum Finance. Learn how linear programming models are formulated, how portfolio data can be organized, and how optimization results are processed.",
    steps: [
      {
        title: "Objective Function Equations",
        text:
          "Optimum Finance uses linear programming to model investment allocation. Each decision variable represents the amount assigned to an asset. The objective function maximizes the expected portfolio return while respecting the total budget and individual allocation limits.",
        details: [
          "Decision variables represent asset allocations.",
          "Expected returns determine objective coefficients.",
          "Budget constraints limit total investment.",
          "Asset bounds restrict individual allocations."
        ]
      },
      {
        title: "JSON and CSV File Formats",
        text:
          "Structured portfolio files help organize financial information for importing into optimization projects. CSV files store tabular asset data, while JSON files can represent structured asset records and model parameters.",
        details: [
          "Use consistent asset names and identifiers.",
          "Provide numerical expected return values.",
          "Include allocation limits where required.",
          "Follow the application's supported import schema."
        ]
      },
      {
        title: "API Integration Specifications",
        text:
          "The optimization workflow involves receiving financial inputs, validating model parameters, constructing the linear programming problem, and executing the solver. The resulting allocation and solver status can then be presented in the application interface.",
        details: [
          "Submit financial model inputs for processing.",
          "Validate budgets, returns, and constraints.",
          "Execute the mathematical optimization model.",
          "Retrieve allocation results and solver status."
        ]
      }
    ]
  }
};

export default function Documentation() {
  const [active, setActive] = useState("getting-started");
  const current = CONTENT[active];
  const isGettingStarted = active === "getting-started";

  return (
    <main className="docs">
      <div className="layout">

        <aside className="sidebar">
          <h2>Documentation</h2>

          <nav className="nav" aria-label="Documentation sections">
            {Object.entries(CONTENT).map(([key, doc]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActive(key)}
                className={`navbutton ${active === key ? "active" : ""}`}
                aria-current={active === key ? "page" : undefined}
              >
                {doc.title}
              </button>
            ))}
          </nav>
        </aside>

        <section className="content">
          <div className="heading">
            <div className="badge">
              Optimum Finance Documentation
            </div>

            <h1>{current.title}</h1>

            <p>{current.intro}</p>
          </div>

          {isGettingStarted ? (
            <div className="guide">
              <ol className="steps">
                {current.steps.map((step) => (
                  <li key={step.title}>
                    {step.link ? (
                      <Link to={step.link} className="link">
                        {step.title}
                      </Link>
                    ) : (
                      <strong>{step.title}</strong>
                    )}

                    <p>{step.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="grid">
              {current.steps.map((step) => (
                <article className="card" key={step.title}>
                  <h3>{step.title}</h3>

                  <p>{step.text}</p>

                  <ul className="details">
                    {step.details.map((detail) => (
                      <li key={detail}>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
