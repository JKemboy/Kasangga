import { getSupabaseClient } from "./supabaseClient.js";
export async function listMyReports(client = getSupabaseClient()) {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth?.user)
    throw new Error("Sign in to view your reports.");
  const uid = auth.user.id;
  const { data, error } = await client
    .from("incident_reports")
    .select(
      "report_id,booking_id,reported_by,reported_against,incident_type,description,priority,report_status,osas_referral_status,submitted_at,resolved_at",
    )
    .or("reported_by.eq." + uid + ",reported_against.eq." + uid)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error("Could not load your reports: " + error.message);
  const rows = (data || []).filter(
    (row) => row.reported_by === uid || row.reported_against === uid,
  );
  return {
    created: rows.filter((row) => row.reported_by === uid),
    received: rows.filter((row) => row.reported_against === uid),
  };
}
