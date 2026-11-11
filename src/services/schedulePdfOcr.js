export const MAX_SCHEDULE_PDF_PAGES = 10;

async function loadDocument(file) {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
}

// Render each PDF page to an image before Tesseract, including scanned PDFs.
// Pages are sequential to limit browser memory. Never silently omit later pages.
export async function extractPdfScheduleText(
  file,
  { recognize, signal, onProgress = () => {}, onConfidence = () => {} },
  {
    load = loadDocument,
    createCanvas = () => document.createElement("canvas"),
  } = {},
) {
  signal?.throwIfAborted();
  const task = await load(file);
  let rendering;
  let destruction;
  const destroy = () => (destruction ||= Promise.resolve(task.destroy()));
  const abort = () => {
    rendering?.cancel();
    void destroy().catch(() => {});
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    signal?.throwIfAborted();
    const pdf = await task.promise;
    if (pdf.numPages > MAX_SCHEDULE_PDF_PAGES)
      throw new Error(
        `Choose a schedule PDF with ${MAX_SCHEDULE_PDF_PAGES} pages or fewer. No pages were processed.`,
      );
    const texts = [],
      confidences = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      signal?.throwIfAborted();
      onProgress({
        label: `Preparing PDF page ${number} of ${pdf.numPages}`,
        progress: (number - 1) / pdf.numPages,
      });
      const page = await pdf.getPage(number);
      const canvas = createCanvas();
      try {
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(3, 2400 / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context)
          throw new Error("Your browser could not prepare this PDF for OCR.");
        signal?.throwIfAborted();
        rendering = page.render({
          canvas,
          canvasContext: context,
          viewport,
          background: "rgb(255,255,255)",
        });
        await rendering.promise;
        rendering = null;
        const blob = await new Promise((resolve, reject) =>
          canvas.toBlob(
            (value) =>
              value
                ? resolve(value)
                : reject(new Error("Could not read the PDF page image.")),
            "image/png",
          ),
        );
        signal?.throwIfAborted();
        texts.push(
          await recognize(
            new File([blob], `schedule-page-${number}.png`, {
              type: "image/png",
            }),
            {
              signal,
              onConfidence: (value) => {
                if (Number.isFinite(value)) confidences.push(value);
              },
              onProgress: (event) =>
                onProgress({
                  label: `PDF page ${number} of ${pdf.numPages}: ${event.label || "Reading text"}`,
                  progress:
                    (number -
                      1 +
                      Math.max(0, Math.min(1, event.progress || 0))) /
                    pdf.numPages,
                }),
            },
          ),
        );
        onProgress({
          label: `Read PDF page ${number} of ${pdf.numPages}`,
          progress: number / pdf.numPages,
        });
      } finally {
        rendering = null;
        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    signal?.throwIfAborted();
    if (confidences.length)
      onConfidence(confidences.reduce((a, b) => a + b, 0) / confidences.length);
    return texts.join("\n\n");
  } catch (error) {
    signal?.throwIfAborted();
    if (error.name === "PasswordException")
      throw new Error(
        "This PDF is password-protected. Upload an unlocked PDF or schedule image.",
      );
    if (error.name === "InvalidPDFException")
      throw new Error(
        "This PDF could not be opened. Upload a valid PDF or schedule image.",
      );
    throw error;
  } finally {
    signal?.removeEventListener("abort", abort);
    await destroy();
  }
}
