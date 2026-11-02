export default function CountBadge({ count = 0, label }) {
  const total = Math.max(0, Number(count) || 0);
  if (!Number.isFinite(total) || total < 1) return null;
  return (
    <span
      className="portal-count-badge"
      aria-label={`${total} ${label}`}
      title={`${total} ${label}`}
    >
      {total > 99 ? "99+" : total}
    </span>
  );
}
