import StaffNotifications from "../shared/StaffNotifications.jsx";

export default function LcoNotifications({ rows = [], error, onRead, go }) {
  function open(row) {
    const view = {
      tutor_applications: "Tutor Verification",
      payments: "Payments & Transactions",
      refunds: "Payments & Transactions",
      bookings: "Bookings Monitoring",
      services: "Service Management",
      incident_reports: "Incident Reports",
      support_conversations: "Messages",
    }[row.entityType];
    if (view) go(view, row);
  }
  return (
    <StaffNotifications
      rows={rows}
      error={error}
      onRead={onRead}
      onOpen={open}
      subtitle="Stay updated with applications, payments, reports and system activity."
    />
  );
}
