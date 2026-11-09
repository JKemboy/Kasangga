const destinationLabels = {
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

export function notificationDestination(notification) {
  if (!notification) return null;
  // Evidence requests need the upload form in the notification dialog.
  if (notification.notificationType === "case_evidence_requested") return null;
  if (Object.hasOwn(notification, "target"))
    return destination(notification.target);
  if (Object.hasOwn(notification, "args")) return destination(notification);
  return destination(notification);
}
