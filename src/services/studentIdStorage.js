import { getSupabaseClient } from "./supabaseClient.js";
import { imageExtensions } from "./ocrService.js";
import { idImageError } from "./studentIdOcr.js";

export const STUDENT_ID_BUCKET = "student-id";

function studentNameFolder(name) {
  const readable = Array.from(
    String(name || "")
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N} .'-]+/gu, " ")
      .replace(/\.{2,}/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[ .]+|[ .]+$/g, ""),
  )
    .slice(0, 80)
    .join("")
    .replace(/[ .]+$/g, "");
  return readable && readable !== "." && readable !== ".."
    ? readable
    : "Student";
}

async function requireStudentIdUser(expectedUserId, client) {
  const { data, error } = await client.auth.getUser();
  if (error)
    throw new Error(`Could not verify your Supabase session: ${error.message}`);
  if (!data?.user)
    throw new Error(
      "Sign in with Supabase before saving your Student ID image.",
    );
  if (data.user.id !== expectedUserId)
    throw new Error(
      "Your account changed. Sign in again before saving your Student ID image.",
    );
  return data.user;
}

export async function uploadStudentIdImage(
  file,
  fullName,
  expectedUserId,
  client = getSupabaseClient(),
) {
  const issue = idImageError(file);
  if (issue) throw new Error(issue);
  const extension = imageExtensions[file.type];
  if (!extension) throw new Error("Choose a JPEG, PNG, or WebP student ID.");
  const user = await requireStudentIdUser(expectedUserId, client);
  const path = `${user.id}/${studentNameFolder(fullName)}/student-id.${extension}`;
  const { error } = await client.storage
    .from(STUDENT_ID_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
  if (error)
    throw new Error(
      `Student ID image upload failed: ${error.message}. Check the private student-id bucket policies and your connection.`,
    );
  return path;
}

export async function removeStudentIdImage(
  path,
  expectedUserId,
  client = getSupabaseClient(),
) {
  const user = await requireStudentIdUser(expectedUserId, client);
  if (!path?.startsWith(`${user.id}/`))
    throw new Error(
      "Refusing to remove a Student ID image owned by another account.",
    );
  const { error } = await client.storage.from(STUDENT_ID_BUCKET).remove([path]);
  if (error)
    throw new Error(
      `Could not clean up the uploaded Student ID image: ${error.message}`,
    );
}
