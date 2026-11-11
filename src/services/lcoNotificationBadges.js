import { lcoNotificationDestination } from "./staffNotificationTargets.js";

export function lcoUnreadNavigationCounts(notifications, records = {}) {
  const counts = { Notifications: 0 };
  for (const notification of notifications) {
    if (notification.read) continue;
    counts.Notifications++;
    const destination = lcoNotificationDestination(notification, records);
    if (destination)
      counts[destination.view] = (counts[destination.view] || 0) + 1;
  }
  return counts;
}

export function lcoRecordNotificationIds(
  notifications,
  records,
  entityType,
  entityId,
) {
  if (entityId == null) return [];
  return notifications
    .filter((notification) => {
      if (notification.read) return false;
      const target = lcoNotificationDestination(notification, records)?.target;
      return (
        target?.entityType === entityType &&
        String(target.entityId) === String(entityId)
      );
    })
    .map((notification) => notification.id);
}
