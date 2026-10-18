import { evidenceExtension } from "./incidentEvidence.js";
import { getSupabaseClient } from "./supabaseClient.js";
export async function submitIncidentReport(
  values,
  client = getSupabaseClient(),
) {
  const booking = Number(values.sessionId || values.bookingId);
  const caseId = Number(values.caseId);
  const followUp = Number.isSafeInteger(caseId) && caseId > 0;
  if (!followUp && (!Number.isSafeInteger(booking) || booking < 1))
    throw new Error("Choose the related booking before reporting an issue.");
  const files = values.evidence || [];
  if (!files.length)
    throw new Error("Attach at least one evidence file.");
  if (files.length > 5) throw new Error("Attach up to five evidence files.");
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user)
    throw new Error("Sign in before submitting a report.");
  const key = values.submissionKey || crypto.randomUUID(),
    uploaded = [];
  for (const file of files) {
    let blob = file instanceof Blob ? file : null;
    if (!blob && file.data?.startsWith("data:"))
      blob = await (await fetch(file.data)).blob();
    const extension = evidenceExtension(blob);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      await blob.arrayBuffer(),
    );
    const hash = Array.from(new Uint8Array(digest), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    const path = `${auth.user.id}/${key}/${uploaded.length}-${hash}.${extension}`;
    const { error } = await client.storage
      .from("incident-evidence")
      .upload(path, blob, { contentType: blob.type });
    if (error && String(error.statusCode || error.status) !== "409")
      throw new Error(`Evidence upload failed: ${error.message}`);
    uploaded.push({
      path,
      name: file.name || `Evidence.${extension}`,
      type: blob.type,
    });
  }
  const { data, error } = await client.rpc(
    followUp ? "attach_incident_evidence" : "submit_incident_report",
    followUp
      ? { p_case_id: caseId, p_files: uploaded }
      : {
          p_booking_id: booking,
          p_type: values.incidentType,
          p_description: values.reason,
          p_submission_key: key,
          p_files: uploaded,
        },
  );
  if (error) {
    // RLS allows cleanup of staged objects but protects already-linked evidence.
    if (uploaded.length)
      await client.storage
        .from("incident-evidence")
        .remove(uploaded.map((file) => file.path));
    throw new Error(error.message);
  }
  globalThis.window?.dispatchEvent(new Event("campustutor:sessions-changed"));
  return { id: String(followUp ? caseId : data) };
}
export async function incidentEvidenceUrl(path, client = getSupabaseClient()) {
  const { data, error } = await client.storage
    .from("incident-evidence")
    .createSignedUrl(path, 300);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
