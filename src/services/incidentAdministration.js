import { getSupabaseClient } from "./supabaseClient.js";
export async function listAcademicSemesters(client = getSupabaseClient()) {
  const { data, error } = await client
    .from("academic_semesters")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
export async function saveAcademicSemester(
  values,
  client = getSupabaseClient(),
) {
  const { data, error } = await client.rpc("save_academic_semester", {
    p_id: values.id || null,
    p_year: values.year.trim().replace(/[–—]/g, "-"),
    p_semester: values.semester,
    p_start: values.start,
    p_end: values.end,
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function repeatedIncidentCandidates(client = getSupabaseClient()) {
  const { data, error } = await client.rpc("lco_repeated_incident_candidates");
  if (error) throw new Error(error.message);
  return data || [];
}
export async function referRepeatedIncidents(
  student,
  semester,
  notes,
  client = getSupabaseClient(),
) {
  const { data, error } = await client.rpc("lco_refer_repeated_incidents", {
    p_student: student,
    p_semester: semester,
    p_notes: notes,
  });
  if (error) throw new Error(error.message);
  globalThis.window?.dispatchEvent(new Event("campustutor:sessions-changed"));
  return data;
}
