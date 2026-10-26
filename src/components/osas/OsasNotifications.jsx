import StaffNotifications from "../shared/StaffNotifications.jsx";

export default function OsasNotifications({
  rows = [],
  loading,
  error,
  onRead,
  onOpen,
}) {
  return (
    <StaffNotifications
      rows={rows}
      loading={loading}
      error={error}
      onRead={onRead}
      onOpen={(row) => {
        if (row.entityType && row.entityId) onOpen(row);
      }}
      subtitle="View referral, case, evidence, clearance and policy updates."
    />
  );
}
