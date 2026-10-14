import { getSupabaseClient } from "./supabaseClient.js";
import { scheduleExtensions, scheduleFileError } from "./ocrService.js";

export const SCHEDULE_BUCKET = "schedule-uploads";
export function ownsSchedulePath(path, userId) {
  if (!userId || typeof path !== "string") return false;
  const parts = path.split("/");
  return (
    parts.length === 2 &&
    !!parts[1] &&
    !parts.some((p) => p === "." || p === "..") &&
    (parts[0] === userId || parts[0].endsWith(`--${userId}`))
  );
}
export async function requireScheduleUser(client = getSupabaseClient()) {
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user)
    throw new Error("Sign in with Supabase before uploading a schedule.");
  return data.user;
}
export async function uploadScheduleImage(
  file,
  expectedUserId,
  client = getSupabaseClient(),
) {
  const invalid = scheduleFileError(file);
  if (invalid) throw new Error(invalid);
  const user = await requireScheduleUser(client);
  if (user.id !== expectedUserId)
    throw new Error(
      "Your account changed. Select the file again before uploading.",
    );
  const id = crypto.randomUUID();
  const { data: folder, error: folderError } = await client.rpc(
    "schedule_upload_folder",
  );
  if (folderError)
    throw new Error(
      `Could not prepare your schedule folder: ${folderError.message}. Apply supabase/manual/schedule_uploads_storage.sql in Supabase SQL Editor.`,
    );
  if (
    typeof folder !== "string" ||
    !ownsSchedulePath(`${folder}/file`, user.id)
  )
    throw new Error("The database returned an invalid schedule folder.");
  const name =
    file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "schedule";
  const path = `${folder}/${id}-${name}.${scheduleExtensions[file.type]}`;
  const { error } = await client.storage
    .from(SCHEDULE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error)
    throw new Error(
      `Schedule upload failed: ${error.message}. Apply supabase/manual/schedule_uploads_storage.sql and keep the bucket private.`,
    );
  return {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    storagePath: path,
    userId: user.id,
    uploadedAt: new Date().toISOString(),
  };
}
export async function downloadScheduleImage(
  record,
  client = getSupabaseClient(),
) {
  const user = await requireScheduleUser(client);
  if (!ownsSchedulePath(record.storagePath, user.id))
    throw new Error("This schedule belongs to another account.");
  const { data, error } = await client.storage
    .from(SCHEDULE_BUCKET)
    .download(record.storagePath);
  if (error)
    throw new Error(`Could not load the private schedule: ${error.message}`);
  return new File([data], record.name, { type: data.type });
}
