import { getSupabaseClient } from "./supabaseClient.js";
import { canonicalIncidentType, incidentCategory } from "./incidentTypes.js";
export async function listMyReports(client = getSupabaseClient()) {
  const { data, error } = await client.rpc("my_reports_snapshot");
  if (error) throw new Error("Could not load your reports: " + error.message);
  const normalize = (row) => ({
    ...row,
    incident_type: canonicalIncidentType(row.incident_type),
    incident_category: incidentCategory(row.incident_type),
  });
  return {
    ...data,
    created: (data?.created || []).map(normalize),
    received: (data?.received || []).map(normalize),
  };
}

// Generic report alerts do not expose statements, evidence or reporter identity.
export async function listMyReportAlerts(client = getSupabaseClient()) {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth?.user)
    throw new Error("Sign in to view your reports.");
  const uid = auth.user.id;
  const { data, error } = await client
    .from("incident_reports")
    .select("report_id,booking_id,submitted_at")
    .eq("reported_against", uid)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error("Could not load your reports: " + error.message);
  return { received: data || [] };
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
