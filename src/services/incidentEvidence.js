export const evidenceAccept =
  "image/png,image/jpeg,application/pdf,video/mp4,video/webm,video/quicktime";
export const evidenceHelp =
  "Up to 5 files. PNG, JPG or PDF: 10 MB each. MP4, WebM or MOV video: 50 MB each.";
const extensions = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
export function evidenceExtension(file) {
  if (
    !extensions[file?.type] ||
    !file.size ||
    file.size > (file.type.startsWith("video/") ? 50 : 10) * 1024 * 1024
  )
    throw new Error(evidenceHelp);
  return extensions[file.type];
}
export function validateEvidence(files) {
  if (files.length > 5) throw new Error("Attach up to five evidence files.");
  files.forEach(evidenceExtension);
}
