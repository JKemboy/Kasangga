export default function SessionDetailRows({ rows }) {
  return (
    <dl className="session-detail-grid">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? "Not available"}</dd>
        </div>
      ))}
    </dl>
  );
}
