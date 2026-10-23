import { getSupabaseClient } from "./supabaseClient.js";

export const GCASH_QR_BUCKET = "gcash-qr";
export const GCASH_QR_MAX_BYTES = 5 * 1024 * 1024;
const extensions = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function validateGcashQr(file) {
  if (!file || !extensions[file.type])
    throw new Error("Choose a PNG, JPG, JPEG or WEBP image.");
  if (!file.size || file.size > GCASH_QR_MAX_BYTES)
    throw new Error("Choose an image up to 5 MB.");
}

export async function loadAdminGcashQr(client = getSupabaseClient()) {
  const { data, error } = await client
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", "gcash_qr_path")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const path = data?.setting_value || null;
  if (!path) return { path: null, url: "" };
  const signed = await client.storage
    .from(GCASH_QR_BUCKET)
    .createSignedUrl(path, 3600);
  if (signed.error) throw new Error(signed.error.message);
  return { path, url: signed.data.signedUrl };
}

export async function saveAdminGcashQr(
  file,
  expectedPath,
  client = getSupabaseClient(),
) {
  validateGcashQr(file);
  const path = `qr/${crypto.randomUUID()}.${extensions[file.type]}`;
  const bucket = client.storage.from(GCASH_QR_BUCKET);
  const upload = await bucket.upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);
  const saved = await client.rpc("save_admin_gcash_qr", {
    p_path: path,
    p_expected_path: expectedPath,
  });
  if (saved.error) {
    // A network failure may occur after commit. The database protects the current image.
    await bucket.remove([path]);
    throw new Error(saved.error.message);
  }
  let warning = "";
  if (saved.data && saved.data !== path) {
    const removed = await bucket.remove([saved.data]);
    if (removed.error)
      warning =
        "QR code saved. The previous image could not be removed from Storage.";
  }
  return { path, warning };
}
