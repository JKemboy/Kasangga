import { getSupabaseClient } from "./supabaseClient.js";

export function validateCompletionProof(file) {
  if (
    !file ||
    !["image/jpeg", "image/png", "application/pdf"].includes(file.type) ||
    file.size < 1 ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("Choose a JPG, PNG or PDF proof up to 10 MB.");
}
async function call(name, bookingId, client = getSupabaseClient()) {
  const { error } = await client.rpc(name, { p_booking_id: Number(bookingId) });
  if (error) throw new Error(error.message);
  globalThis.window?.dispatchEvent(new Event("campustutor:sessions-changed"));
}
export async function uploadCompletionProof(
  bookingId,
  file,
  client = getSupabaseClient(),
) {
  validateCompletionProof(file);
  const { data: auth, error } = await client.auth.getUser();
  if (error || !auth.user)
    throw new Error("Sign in to upload completion proof.");
  const ext = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/pdf": "pdf",
  }[file.type];
  const path = `${auth.user.id}/${Number(bookingId)}/${crypto.randomUUID()}.${ext}`;
  const bucket = client.storage.from("session-completion-proofs");
  const uploaded = await bucket.upload(path, file, { contentType: file.type });
  if (uploaded.error) throw new Error(uploaded.error.message);
  const result = await client.rpc("submit_session_completion_proof", {
    p_booking_id: Number(bookingId),
    p_path: path,
    p_name: file.name.slice(0, 255),
  });
  if (result.error) {
    await bucket.remove([path]);
    throw new Error(result.error.message);
  }
  globalThis.window?.dispatchEvent(new Event("campustutor:sessions-changed"));
}
export const confirmLearnerCompletion = (id, client) =>
  call("confirm_learner_session_completion", id, client);
export const remindLearnerCompletion = (id, client) =>
  call("remind_learner_session_completion", id, client);
export async function completionProofUrl(path, client = getSupabaseClient()) {
  const { data, error } = await client.storage
    .from("session-completion-proofs")
    .createSignedUrl(path, 300);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
export async function attachCompletionProofs(rows, client) {
  if (!rows.length) return rows;
  const { data, error } = await client
    .from("session_completion_proofs")
    .select(
      "booking_id,storage_path,file_name,uploaded_at,learner_confirmed_at,last_reminded_at",
    )
    .in(
      "booking_id",
      rows.map((row) => row.booking_id),
    );
  if (error)
    throw new Error(
      `Unable to load session completion proofs: ${error.message}`,
    );
  const proofs = new Map(
    (data || []).map((proof) => [String(proof.booking_id), proof]),
  );
  return rows.map((row) => ({
    ...row,
    completionProof: proofs.get(String(row.booking_id)) || null,
  }));
}
