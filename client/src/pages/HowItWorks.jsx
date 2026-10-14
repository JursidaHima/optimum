import "../styles/how-it-works.css";
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
          <div className="hero__copy how__hero-copy">
            <div className="hero__badge">
              How it works
            </div>
            
            <h1>Get the best results in 4 simple steps</h1>
            
            <p className="lead how__lead">
              From your goals to optimized results — it's easy.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <ul className="card-grid how__grid">
            {STEPS.map((step) => (
              <li key={step.num} className="info-card how__step">
                <div className="how__num">
                  {step.num}
                </div>
                <div>
                  <h3 className="how__card-title">{step.title}</h3>
                  <p className="how__card-text">{step.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section how__benefits">
        <div className="container">
          <h2 className="how__benefits-title">Why choose Optimum?</h2>
          <ul className="card-grid how__grid">
            {BENEFITS.map((benefit) => (
              <li key={benefit.title} className="info-card">
                <h3 className="how__card-title">{benefit.title}</h3>
                <p className="how__card-text">{benefit.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}