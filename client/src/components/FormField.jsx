import { useId } from "react";

// Reusable form field wrapper with automatic label and accessibility wiring
export default function FormField({ label, error, hint, children, required = true }) {
  const id = useId();
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`field${error ? " field--error" : ""}`}>
      <label htmlFor={id} className="field__label">
        {label} {required && <span className="field__req">*</span>}
      </label>
      
      {/* Renders the input or select element passed as a function */}
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      
      {hint && !error && <p id={`${id}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${id}-err`} className="field__error" role="alert">{error}</p>}
    </div>
  );
}