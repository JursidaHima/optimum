// MySQL DATETIME strings arrive as "YYYY-MM-DD HH:MM:SS"; make them parseable.
function toDate(value) {
  if (!value) return null;
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value) {
  const date = toDate(value);
  return date ? date.toLocaleString() : "—";
}

export function formatMoney(value) {
  const n = Number(value);
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(n)
  )
    return "—";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Value is already a percentage (e.g. 7.5 means 7.5%).
export function formatPercent(value, digits = 2) {
  const n = Number(value);
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(n)
  )
    return "—";
  return `${n.toFixed(digits)}%`;
}

export function formatNumber(value, digits = 2) {
  const n = Number(value);
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(n)
  )
    return "—";
  return n.toFixed(digits);
}

export function formatDuration(ms) {
  const n = Number(ms);
  if (ms === null || ms === undefined || ms === "" || !Number.isFinite(n))
    return "—";
  return n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${Math.round(n)} ms`;
}

export const RUN_STATUSES = ["Pending", "Running", "Completed", "Failed"];
export const isFinished = (status) =>
  status === "Completed" || status === "Failed";
