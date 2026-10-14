import "../styles/status.css";

// Live progress for a run: Pending -> Running -> Completed (or Failed)
export default function RunStatusSteps({ status }) {
  const steps = ["Pending", "Running", status === "Failed" ? "Failed" : "Completed"];

  // Determine the active index based on the current status
  const getActiveIndex = () => {
    if (status === "Failed" || status === "Completed") return 2;
    return Math.max(0, steps.indexOf(status));
  };

  const currentIndex = getActiveIndex();

  // Determine individual step styling state
  const getStepState = (index) => {
    if (index < currentIndex) return "done";
    if (index === currentIndex) {
      if (status === "Failed") return "failed";
      if (status === "Completed") return "done";
      return "active";
    }
    return "todo";
  };

  return (
    <ol className="status-steps" aria-label={`Run status: ${status}`}>
      {steps.map((step, index) => {
        const state = getStepState(index);
        const isCurrent = index === currentIndex;

        return (
          <li
            key={step}
            className={`status-steps__item status-steps__item--${state}`}
            aria-current={isCurrent ? "step" : undefined}
          >
            <span className="status-steps__dot" aria-hidden="true">
              {state === "done" ? "✓" : state === "failed" ? "✕" : index + 1}
            </span>
            <span className="status-steps__label">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}