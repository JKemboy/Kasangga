const destinationLabels = {
  application: "View application status",
  reports: "View My Reports",
  dashboard: "Open dashboard",
  services: "View service",
  availability: "View schedule",
  sessions: "View session",
  messages: "Open conversation",
  earnings: "View payment",
  notifications: "Open notifications",
  profile: "View profile",
  help: "Open Help & Safety",
  "find-tutor": "Find a tutor",
};

function destination(target) {
  if (!target || !Object.hasOwn(destinationLabels, target.view)) return null;
  return {
    view: target.view,
    args:
      target.args &&
      typeof target.args === "object" &&
      !Array.isArray(target.args)
        ? { ...target.args }
        : {},
    label: target.label || destinationLabels[target.view],
  };
}

export function notificationDestination(notification, { roles = [] } = {}) {
  if (!notification) return null;
  if (
    roles.includes("oswe") &&
    notification.notificationType === "osas_queue_update"
  ) {
    const section =
      notification.entityType === "clearance_reviews"
        ? "Student Clearance Review"
        : "Case Review";
    return {
      href: `/oswe-dashboard?section=${encodeURIComponent(section)}&notification=${encodeURIComponent(notification.notificationId || notification.id)}`,
      label: `Open ${section}`,
    };
  }
  const lcoSections = {
    booking_created: "Bookings Monitoring",
    payment_received: "Payments & Transactions",
    incident_submitted: "Incident Reports",
  };
  if (roles.includes("lco") && lcoSections[notification.notificationType]) {
    const section = lcoSections[notification.notificationType];
    return {
      href: `/lco-dashboard?section=${encodeURIComponent(section)}&notification=${encodeURIComponent(notification.notificationId || notification.id)}`,
      label: `Open ${section}`,
    };
  }
  if (notification.notificationType === "tutor_application_approved")
    return {
      view: "dashboard",
      args: {},
      href: "/tutor-dashboard",
      label: "Open Tutor Dashboard",
    };
  // Evidence requests need the upload form in the notification dialog.
  if (notification.notificationType === "case_evidence_requested") return null;
  if (notification.view === "notifications" && !notification.target)
    return null;
  if (Object.hasOwn(notification, "target"))
    return destination(notification.target);
  if (Object.hasOwn(notification, "args")) return destination(notification);
  return destination(notification);
}
