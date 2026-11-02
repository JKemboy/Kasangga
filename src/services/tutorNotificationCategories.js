export const tutorNotificationCategories = [
  "Bookings & Sessions",
  "Payments",
  "Reviews",
  "Services",
  "Safety and Reports",
];
export function tutorNotificationCategory(notification) {
  const text = [
    notification.notificationType,
    notification.entityType,
    notification.category,
    notification.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replaceAll("_", " ");
  if (/incident|report|safety|conduct|osas|oswe|case|evidence/.test(text))
    return "Safety and Reports";
  if (/payment|payout|refund|transfer|earning/.test(text)) return "Payments";
  if (/rating|review/.test(text)) return "Reviews";
  if (/service/.test(text)) return "Services";
  if (/booking|session|reschedul|schedule|reminder|cancel/.test(text))
    return "Bookings & Sessions";
  return notification.category || "System";
}
