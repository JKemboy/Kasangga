import { getSupabaseClient } from "./supabaseClient.js";
import { imageExtensions, scheduleImageError } from "./ocrService.js";

export const SCHEDULE_BUCKET = "schedule-uploads";
export async function requireScheduleUser(client = getSupabaseClient()) {
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user)
    throw new Error(
      "Sign in with Supabase before uploading a schedule. The demo login does not create a Supabase session.",
    );
  return data.user;
}
export async function uploadScheduleImage(
  file,
  expectedUserId,
  client = getSupabaseClient(),
) {
  const invalid = scheduleImageError(file);
  if (invalid) throw new Error(invalid);
  const user = await requireScheduleUser(client);
  if (user.id !== expectedUserId)
    throw new Error(
      "Your account changed. Select the image again before uploading.",
    );
  const id = crypto.randomUUID();
  const path = `${user.id}/${id}.${imageExtensions[file.type]}`;
  const { error } = await client.storage
    .from(SCHEDULE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error)
    throw new Error(
      `Schedule upload failed: ${error.message}. Check the private bucket policies and your connection.`,
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
  if (!record.storagePath?.startsWith(`${user.id}/`))
    throw new Error("This schedule belongs to another account.");
  const { data, error } = await client.storage
    .from(SCHEDULE_BUCKET)
    .download(record.storagePath);
  if (error)
    throw new Error(`Could not load the private schedule: ${error.message}`);
  return new File([data], record.name, { type: data.type });
}
