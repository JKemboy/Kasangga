// LCO database gateway: reads the LCO snapshot and persists authorized changes through LCO RPCs.
import { getSupabaseClient } from "./supabaseClient.js";
import { mapLcoDatabase } from "./lcoRecords.js";
export { mapLcoDatabase } from "./lcoRecords.js";
export async function loadLcoDatabase(client = getSupabaseClient()) {
  // The snapshot RPC returns system_settings with the rest of the LCO data;
  // mapLcoDatabase parses recognized setting keys into the UI config.
  const { data, error } = await client.rpc("admin_dashboard_snapshot");
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "LCO database update is missing. Apply the LCO workflow migration."
        : error.message,
    );
  if (!data) throw new Error("The database did not return the LCO records.");
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
        `The LCO snapshot is missing ${table}. Refresh or check the database migration.`,
      );
  }
  return mapLcoDatabase(data);
}
export async function saveLcoRecord(
  kind,
  record,
  client = getSupabaseClient(),
) {
  // LCO settings are saved by the database RPC into public.system_settings.
  // Do not mirror these preferences into localStorage or browser storage.
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

export async function markRefundTransferred(
  refundId,
  reference,
  confirmed,
  client = getSupabaseClient(),
) {
  const { error } = await client.rpc("admin_mark_refund_transferred", {
    p_refund_id: refundId,
    p_reference: reference,
    p_confirmed: confirmed,
  });
  if (error) throw new Error(error.message);
  return true;
}

export async function loadRefundGcashAccount(
  refundId,
  client = getSupabaseClient(),
) {
  const { data, error } = await client.rpc("admin_refund_gcash_account", {
    p_refund_id: refundId,
  });
  if (error)
    throw new Error("Could not load learner GCash account: " + error.message);
  return { name: data?.name || "", number: data?.number || "" };
}

export async function loadTutorPayoutAccount(
  userId,
  client = getSupabaseClient(),
) {
  if (!userId) throw new Error("This payment has no linked tutor account.");
  const { data, error } = await client.rpc("admin_tutor_gcash_account", {
    p_user_id: userId,
  });
  if (error)
    throw new Error("Could not load tutor GCash account: " + error.message);
  return { name: data?.name || "", number: data?.number || "" };
}
