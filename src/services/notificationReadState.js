import { getSupabaseClient } from "./supabaseClient.js";
import { readMessages } from "./bookingMessages.js";

export async function loadActivityReadIds(
  userId,
  client = getSupabaseClient(),
) {
  const ids = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("notifications")
      .select("message")
      .eq("user_id", userId)
      .eq("notification_type", "activity_read_receipt")
      .order("notification_id")
      .range(offset, offset + 999);
    if (error) throw error;
    for (const row of data || []) ids.add(row.message);
    if ((data || []).length < 1000) return ids;
  }
}

export async function persistNotificationRead(
  userId,
  selected,
  client = getSupabaseClient(),
  markMessages = readMessages,
) {
  const stored = selected.filter((n) => n.notificationId != null);
  if (stored.length) {
    const { data, error } = await client
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .in(
        "notification_id",
        stored.map((n) => n.notificationId),
      )
      .select("notification_id");
    if (error) throw error;
    if (
      new Set((data || []).map((n) => String(n.notification_id))).size !==
      new Set(stored.map((n) => String(n.notificationId))).size
    )
      throw new Error("Could not save notification read state.");
  }
  const activities = selected.filter((n) => n.notificationId == null);
  if (activities.length) {
    const { error } = await client.rpc("mark_activity_notifications_read", {
      p_event_ids: activities.map((n) => n.id),
    });
    if (error) throw error;
  }
  await Promise.all(
    selected
      .filter((n) => n.kind === "message")
      .map((n) => markMessages(n.bookingId)),
  );
}
