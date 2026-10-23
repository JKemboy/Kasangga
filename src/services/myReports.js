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

// Report alerts are derived from Supabase records; no browser persistence.
export function receivedReportNotifications(reports, stored = []) {
  const existing = new Set(
    stored
      .filter((n) => n.entityType === "incident_reports")
      .map((n) => String(n.entityId)),
  );
  return reports
    .filter((report) => !existing.has(String(report.report_id)))
    .map((report) => ({
      id: `report-received-${report.report_id}`,
      kind: "report",
      category: "Safety and Reports",
      notificationType: "incident_received",
      entityType: "incident_reports",
      entityId: String(report.report_id),
      title: "Report received",
      text: `A report was submitted about booking #${report.booking_id || "N/A"}. View My Reports for details and review status.`,
      time: report.submitted_at,
      view: "reports",
      args: { tab: "received", reportId: String(report.report_id) },
    }));
}
