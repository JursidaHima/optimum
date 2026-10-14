import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/documentation.css";

const DOCS_CONTENT = {
  "getting-started": {
    title: "Getting Started",
    intro: "Follow these five steps to complete your first optimization.",
    steps: [
      { text: "Create an account", link: "/register" },
      { text: "Create a Project", link: null },
      { text: "Add your data", link: null },
      { text: "Run Optimization", link: null },
      { text: "View Result", link: null }
    ]
  },
  "user-guide": {
    title: "User Guide",
    intro: "Learn how to configure constraints, input target capital, and fine-tune your asset allocations.",
    steps: [
      { text: "Managing assets and parameters", link: null },
      { text: "Understanding model bounds", link: null },
      { text: "Interpreting optimization status", link: null }
    ]
  },
  reference: {
    title: "Reference",
    intro: "Technical specifications of the linear programming solver and API endpoints.",
    steps: [
      { text: "Objective function equations", link: null },
      { text: "JSON & CSV file formats", link: null },
      { text: "API integration specs", link: null }
    ]
  }
};

export default function Documentation() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const currentDoc = DOCS_CONTENT[activeSection];

  return (
    <div className="container docs">
      <div className="docs__layout">
        {/* Sidebar Navigation */}
        <aside className="docs__sidebar">
          <nav className="docs__nav">
            {Object.entries(DOCS_CONTENT).map(([key, doc]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSection(key)}
                className={`docs__nav-btn${activeSection === key ? " docs__nav-btn--active" : ""}`}
                aria-current={activeSection === key ? "page" : undefined}
              >
                {doc.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main>
          <h1 className="docs__title">{currentDoc.title}</h1>

          <div className="docs__card">
            <p className="docs__intro">{currentDoc.intro}</p>

            <ol className="docs__steps">
              {currentDoc.steps.map((step, index) => (
                <li key={index}>
                  {step.link ? (
                    <Link to={step.link} className="docs__link">{step.text}</Link>
                  ) : (
                    <span>{step.text}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </main>
      </div>
    </div>
  );
}