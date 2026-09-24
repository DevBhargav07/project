// A small presentational component — renders a human-readable date
// from an ISO timestamp string (e.g. "2026-09-20T10:15:00Z").
// Usage: <FormatDate timestamp={someIsoString} />
export function FormatDate({ timestamp }) {
  if (!timestamp) return <span>—</span>;

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return <span>—</span>;

  const formatted = new Intl.DateTimeFormat(navigator.language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

  return <span>{formatted}</span>;
}