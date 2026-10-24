import { useId } from "react";

// Reusable form field wrapper with automatic label and accessibility wiring
export default function FormField({ label, error, hint, children, required = true }) {
  const id = useId();
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`field${error ? " invalid" : ""}`}>
      <label htmlFor={id} className="label">
        {label} {required && <span className="req">*</span>}
      </label>
      
      {/* Renders the input or select element passed as a function */}
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      
      {hint && !error && <p id={`${id}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${id}-err`} className="error" role="alert">{error}</p>}
    </div>
  );
}