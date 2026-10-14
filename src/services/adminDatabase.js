import { getSupabaseClient } from "./supabaseClient.js";
import { mapAdminDatabase } from "./adminRecords.js";
export { mapAdminDatabase } from "./adminRecords.js";
export async function loadAdminDatabase(client = getSupabaseClient()) {
  const { data, error } = await client.rpc("admin_dashboard_snapshot");
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "Admin database update is missing. Apply the Admin workflow migration."
        : error.message,
    );
  if (!data) throw new Error("The database did not return the Admin records.");
  for (const table of [
    "users",
    "user_roles",
    "tutor_profiles",
    "services",
    "service_topics",
    "availability_slots",
    "bookings",
    "payments",
    "payment_allocations",
    "audit_logs",
  ]) {
    if (!Array.isArray(data[table]))
      throw new Error(
        `The Admin snapshot is missing ${table}. Refresh or check the database migration.`,
      );
  }
  return mapAdminDatabase(data);
}
export async function saveAdminRecord(
  kind,
  record,
  client = getSupabaseClient(),
) {
  const id =
    kind === "users"
      ? record.userId
      : kind === "refunds"
        ? record.refundId
        : kind === "settings"
          ? "settings"
          : record.id;
  if (id == null)
    throw new Error(
      "The database record ID is missing. Refresh the records and try again.",
    );
  const review = record.history?.at(-1);
  const { error } = await client.rpc("admin_save_record", {
    p_kind: kind,
    p_id: String(id),
    p_value:
      kind === "settings"
        ? record
        : {
            status: record.status,
            expected_status: review?.from,
            referral: record.referral,
            decision: record.refundDecision?.decision,
            review,
          },
  });
  if (error) throw new Error(error.message);
  return true;
}

export async function markPaymentTransferred(
  paymentId,
  reference,
  confirmed,
  client = getSupabaseClient(),
) {
  const { error } = await client.rpc("admin_mark_payment_transferred", {
    p_payment_id: paymentId,
    p_reference: reference,
    p_confirmed: confirmed,
  });
  if (error) throw new Error(error.message);
  return true;
}
