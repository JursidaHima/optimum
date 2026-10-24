import "../styles/status.css";

// One pill for the four run statuses: Pending, Running, Completed, Failed.
export default function StatusBadge({ status }) {
  const value = status || "Pending";
  return <span className={`status-badge ${value.toLowerCase()}`}>{value}</span>;
}