export const MAX_SCHEDULE_FILE_SIZE = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/png", "image/jpeg", "application/pdf"]);

export function scheduleFileError(file) {
  if (!file) return "Choose a PNG, JPEG, or PDF file.";
  if (!allowedTypes.has(file.type)) return "Use a PNG, JPEG, or PDF file.";
  if (!Number.isFinite(file.size) || file.size <= 0)
    return "This file is empty. Choose a file with your class schedule.";
  if (file.size > MAX_SCHEDULE_FILE_SIZE)
    return "The file is too large. Choose a file of 10 MB or less.";
  return "";
}

export function scheduleFileSize(size) {
  if (!Number.isFinite(size) || size < 0) return "Size unavailable";
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.ceil(size / 1024))} KB`;
}
