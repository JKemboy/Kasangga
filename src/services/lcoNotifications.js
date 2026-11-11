// LCO inbox service: reads and updates the signed-in LCO's notifications in the Supabase notifications table.
import { getSupabaseClient } from "./supabaseClient.js";

export async function loadLcoNotifications(userId) {
  if (!userId) return [];
  // Notifications come from the signed-in LCO's database rows;
  // the settings screen only filters this server-backed list for display.
  const { data, error } = await getSupabaseClient()
    .from("notifications")
    .select(
      "notification_id,title,message,notification_type,related_entity_type,related_entity_id,is_read,created_at",
    )
    .eq("user_id", userId)
    .neq("notification_type", "activity_read_receipt")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error)
    throw new Error(`Could not load LCO notifications: ${error.message}`);
  return (data || []).map((row) => ({
    id: String(row.notification_id),
    notificationId: row.notification_id,
    notificationType: row.notification_type,
    title: row.title,
    text: row.message,
    time: row.created_at,
    read: row.is_read,
    entityType: row.related_entity_type,
    entityId: row.related_entity_id,
  }));
}

export function filterLcoNotifications(rows, config) {
  return rows.filter((notification) => {
    const type =
      `${notification.notificationType || ""} ${notification.entityType || ""} ${notification.title || ""}`.toLowerCase();
    if (type.includes("tutor") || type.includes("application"))
      return config.tutorAlerts !== false;
    if (type.includes("payment") || type.includes("refund"))
      return config.paymentAlerts !== false;
    if (type.includes("incident") || type.includes("report"))
      return config.incidentAlerts !== false;
    if (type.includes("maintenance") || type.includes("system"))
      return config.maintenanceAlerts !== false;
    return true;
  });
}

export async function markLcoNotificationsRead(userId, ids) {
  if (!userId || !ids.length) return;
  const { data, error } = await getSupabaseClient()
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .in("notification_id", ids)
    .select("notification_id");
  if (error)
    throw new Error(`Could not mark notifications read: ${error.message}`);
  const updated = new Set(
    (data || []).map((row) => String(row.notification_id)),
  );
  if (ids.some((id) => !updated.has(String(id))))
    throw new Error(
      "Could not save every notification read state. Please retry.",
    );
}
