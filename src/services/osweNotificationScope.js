const osweEntities = new Set([
  "cases",
  "incident_reports",
  "incident_evidence",
  "clearance_reviews",
  "clearance_holds",
]);

export function isOsweNotification(notification) {
  return osweEntities.has(notification.entityType);
}
