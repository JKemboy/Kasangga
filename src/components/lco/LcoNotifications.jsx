import StaffNotifications from "../shared/StaffNotifications.jsx";

export default function LcoNotifications({ rows = [], error, onRead, onOpen }) {
  return (
    <StaffNotifications
      rows={rows}
      error={error}
      onRead={onRead}
      onOpen={onOpen}
      subtitle="Stay updated with applications, payments, reports and system activity."
    />
  );
}
