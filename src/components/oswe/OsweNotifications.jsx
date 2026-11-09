import StaffNotifications from "../shared/StaffNotifications.jsx";

export default function OsweNotifications({
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
      onOpen={onOpen}
      subtitle="View referral, case, evidence, clearance and policy updates."
    />
  );
}
