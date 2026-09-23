import { useState } from "react";
import { Link } from "react-router-dom";

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
    <div className="container" style={{ padding: "3rem 1.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "3rem", alignItems: "start" }}>
        
        {/* Sidebar Navigation */}
        <aside style={{ background: "#f1f5f9", padding: "1.5rem", borderRadius: "16px" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              onClick={() => setActiveSection("getting-started")}
              style={{
                textAlign: "left",
                background: activeSection === "getting-started" ? "#e2e8f0" : "transparent",
                border: "none",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                fontWeight: activeSection === "getting-started" ? "600" : "400",
                color: "#1e293b",
                cursor: "pointer"
              }}
            >
              Getting Started
            </button>
            <button
              onClick={() => setActiveSection("user-guide")}
              style={{
                textAlign: "left",
                background: activeSection === "user-guide" ? "#e2e8f0" : "transparent",
                border: "none",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                fontWeight: activeSection === "user-guide" ? "600" : "400",
                color: "#1e293b",
                cursor: "pointer"
              }}
            >
              User Guide
            </button>
            <button
              onClick={() => setActiveSection("reference")}
              style={{
                textAlign: "left",
                background: activeSection === "reference" ? "#e2e8f0" : "transparent",
                border: "none",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                fontWeight: activeSection === "reference" ? "600" : "400",
                color: "#1e293b",
                cursor: "pointer"
              }}
            >
              Reference
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "800", color: "#0f172a", marginBottom: "2rem" }}>
            {currentDoc.title}
          </h1>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "2.5rem", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
            <p style={{ fontSize: "1.05rem", color: "#475569", marginBottom: "1.5rem" }}>
              {currentDoc.intro}
            </p>

            <ol style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", color: "#0f172a", fontWeight: "500" }}>
              {currentDoc.steps.map((step, index) => (
                <li key={index} style={{ fontSize: "1.05rem" }}>
                  {step.link ? (
                    <Link to={step.link} style={{ color: "#0f766e", textDecoration: "underline" }}>
                      {step.text}
                    </Link>
                  ) : (
                    <span style={{ color: "#1e293b" }}>{step.text}</span>
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