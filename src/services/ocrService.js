export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const imageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export function scheduleImageError(file) {
  if (!file) return "Choose a schedule image first.";
  if (!imageExtensions[file.type]) return "Choose a JPEG, PNG, or WebP image.";
  if (!Number.isFinite(file.size) || file.size <= 0)
    return "The image is empty.";
  if (file.size > MAX_IMAGE_SIZE) return "Choose an image of 10 MB or less.";
  return "";
}

// Runs in a browser worker. No image is sent to an OCR server.
export async function extractImageText(
  file,
  { onProgress = () => {}, signal } = {},
) {
  const error = scheduleImageError(file);
  if (error) throw new Error(error);
  signal?.throwIfAborted();
  const { createWorker } = await import("tesseract.js");
  let worker;
  let rejectAbort;
  const aborted = new Promise((_, reject) => {
    rejectAbort = reject;
  });
  const abort = () =>
    rejectAbort(new DOMException("OCR cancelled", "AbortError"));
  signal?.addEventListener("abort", abort, { once: true });
  const job = (async () => {
    worker = await createWorker("eng", 1, {
      logger: (event) => {
        if (!signal?.aborted)
          onProgress({ label: event.status, progress: event.progress || 0 });
      },
    });
    if (signal?.aborted) {
      await worker.terminate();
      signal.throwIfAborted();
    }
    const result = await worker.recognize(file);
    return result.data.text.trim();
  })();
  try {
    if (signal?.aborted) abort();
    return await Promise.race([job, aborted]);
  } finally {
    signal?.removeEventListener("abort", abort);
    if (worker) await worker.terminate();
  }
}

// Backwards-compatible entry point for the existing schedule workflow.
export const extractScheduleText = extractImageText;
