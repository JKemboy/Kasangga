import { notifications } from "./data.js";

const destinationLabels = {
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

// New notifications supply a target directly. Only known legacy seed records
// inherit demo record IDs; a new event with the same title must keep its own target.
export function notificationDestination(notification) {
  if (!notification) return null;
  if (Object.hasOwn(notification, "target"))
    return destination(notification.target);
  if (Object.hasOwn(notification, "args")) return destination(notification);
  const legacy = notifications.find(
    (seed) => seed.id === notification.id && seed.title === notification.title,
  );
  return destination(legacy?.target || notification);
}
