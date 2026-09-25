export function filterNotifications(items, filter = "All Notifications") {
  return items.filter(
    (item) =>
      filter === "All Notifications" ||
      (filter === "Unread" ? item.unread : item.category === filter),
  );
}
export function markNotificationsRead(items, id) {
  return items.map((item) =>
    id === undefined || item.id === id ? { ...item, unread: false } : item,
  );
}
