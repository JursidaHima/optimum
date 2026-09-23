const STEPS = [
  {
    num: "1",
    title: "Create Project",
    text: "Start a Finance project and give it a name."
  },
  {
    num: "2",
    title: "Add data",
    text: "Enter assets, budget and limits — or upload a file."
  },
  {
    num: "3",
    title: "Run Optimization",
    text: "HiGHS solves the model and reports its status."
  },
  {
    num: "4",
    title: "View Results",
    text: "Review allocation, expected return and charts."
  }
];

const BENEFITS = [
  {
    title: "Fast & Accurate",
    text: "Exact linear-programming results, not estimates."
  },
  {
    title: "Flexible",
    text: "Your assets, your budget, your allocation limits."
  },
  {
    title: "Secure",
    text: "Private accounts and stored run history."
  },
  {
    title: "User Friendly",
    text: "A guided workflow from goal to answer."
  }
];

export default function HowItWorks() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero__copy" style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
            <div className="hero__badge" style={{ fontWeight: 600, color: "#0f766e", marginBottom: "0.75rem", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              How it works
            </div>
            
            <h1>Get the best results in 4 simple steps</h1>
            
            <p className="lead" style={{ margin: "0 auto 1.5rem" }}>
              From your goals to optimized results — it's easy.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <ul className="card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", listStyle: "none", padding: 0, margin: 0 }}>
            {STEPS.map((step) => (
              <li key={step.num} className="info-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.9rem" }}>
                  {step.num}
                </div>
                <div>
                  <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>{step.title}</h3>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-soft)" }}>{step.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" style={{ backgroundColor: "#f8fafc", padding: "4rem 0" }}>
        <div className="container">
          <h2 style={{ textAlign: "center", marginBottom: "2.5rem", color: "#111827" }}>Why choose Optimum?</h2>
          <ul className="card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", listStyle: "none", padding: 0, margin: 0 }}>
            {BENEFITS.map((benefit) => (
              <li key={benefit.title} className="info-card">
                <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>{benefit.title}</h3>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-soft)" }}>{benefit.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}