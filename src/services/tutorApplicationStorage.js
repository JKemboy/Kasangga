import { getSupabaseClient } from "./supabaseClient.js";

export const TUTOR_APPLICATION_BUCKET = "apply-as-tutor";
export const TUTOR_APPLICATION_MAX_FILE_SIZE = 10 * 1024 * 1024;

const extensions = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const documentIds = new Set(["studentId", "enrollment", "grades", "awards"]);

function safeFolderName(value) {
  const name = Array.from(
    String(value || "")
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
  return name && name !== "." && name !== ".." ? name : "Applicant";
}

function safeFileName(value, extension) {
  const stem = String(value || "document")
    .normalize("NFKC")
    .replace(/\.[^.]*$/, "")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 100);
  return `${stem || "document"}.${extension}`;
}

async function requireTutorApplicationUser(expectedUserId, client) {
  const { data, error } = await client.auth.getUser();
  if (error)
    throw new Error(`Could not verify your Supabase session: ${error.message}`);
  if (!data?.user)
    throw new Error(
      "Sign in with Supabase before uploading tutor application documents.",
    );
  if (data.user.id !== expectedUserId)
    throw new Error(
      "Your account changed. Sign in again before managing these documents.",
    );
  return data.user;
}

export async function uploadTutorApplicationDocument(
  file,
  documentId,
  fullName,
  expectedUserId,
  client = getSupabaseClient(),
) {
  if (!documentIds.has(documentId))
    throw new Error("Unknown tutor application document type.");
  if (!file || !extensions[file.type])
    throw new Error("Choose a PDF, JPG, or PNG document.");
  if (!Number.isFinite(file.size) || file.size <= 0)
    throw new Error("The selected document is empty.");
  if (file.size > TUTOR_APPLICATION_MAX_FILE_SIZE)
    throw new Error("Choose a document of 10 MB or less.");
  if (!String(fullName || "").trim())
    throw new Error("Add your full name to your profile before uploading.");

  const user = await requireTutorApplicationUser(expectedUserId, client);
  const extension = extensions[file.type];
  const fileName = `${crypto.randomUUID()}-${safeFileName(file.name, extension)}`;
  const path = `${user.id}/${safeFolderName(fullName)}/${documentId}-${fileName}`;
  const { error } = await client.storage
    .from(TUTOR_APPLICATION_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error)
    throw new Error(
      `Tutor application document upload failed: ${error.message}. Check the private apply-as-tutor bucket policies and your connection.`,
    );
  return path;
}

export async function downloadTutorApplicationDocument(
  path,
  expectedUserId,
  client = getSupabaseClient(),
) {
  const user = await requireTutorApplicationUser(expectedUserId, client);
  if (!path?.startsWith(`${user.id}/`)) {
    const { data: roles, error: roleError } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "lco")
      .eq("is_active", true);
    if (roleError)
      throw new Error(`Could not verify document access: ${roleError.message}`);
    if (!roles?.length)
      throw new Error(
        "This tutor application document belongs to another account.",
      );
  }
  const { data, error } = await client.storage
    .from(TUTOR_APPLICATION_BUCKET)
    .download(path);
  if (error)
    throw new Error(
      `Could not load your application document: ${error.message}`,
    );
  if (!data)
    throw new Error("The uploaded application document was not found.");
  return data;
}

export async function removeTutorApplicationDocument(
  path,
  expectedUserId,
  client = getSupabaseClient(),
) {
  const user = await requireTutorApplicationUser(expectedUserId, client);
  if (!path?.startsWith(`${user.id}/`))
    throw new Error("Refusing to remove a document owned by another account.");
  const { error } = await client.storage
    .from(TUTOR_APPLICATION_BUCKET)
    .remove([path]);
  if (error)
    throw new Error(
      `Could not remove the application document: ${error.message}`,
    );
}
