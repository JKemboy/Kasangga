import { parseScheduleLines } from "./scheduleReview.js";
export async function extractSchedule(file, onProgress = () => {}, signal) {
  let worker, loading, pdf;
  const check = () => {
    if (signal?.aborted)
      throw new DOMException("Processing cancelled", "AbortError");
  };
  const abort = () => {
    worker?.terminate();
    loading?.destroy();
  };
  signal?.addEventListener("abort", abort, { once: true });
  async function recognize(image, page, total) {
    check();
    if (!worker) {
      const { createWorker } = await import("tesseract.js");
      check();
      worker = await createWorker("eng", 1, {
        logger: (m) =>
          onProgress({
            label: `Page ${page}/${total}: ${m.status}`,
            progress: (page - 1 + (m.progress || 0)) / total,
          }),
      });
      check();
    }
    const { data } = await worker.recognize(
      image,
      {},
      { text: true, blocks: true },
    );
    check();
    const lines = data.blocks?.flatMap((b) =>
      b.paragraphs.flatMap((p) =>
        p.lines.map((l) => ({ text: l.text, confidence: l.confidence })),
      ),
    );
    return lines?.length
      ? lines
      : data.text
          .split("\n")
          .map((text) => ({ text, confidence: data.confidence }));
  }
  try {
    let lines = [];
    if (file.type === "application/pdf") {
      const pdfjs = await import("pdfjs-dist");
      const { default: workerUrl } =
        await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      check();
      loading = pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
      });
      pdf = await loading.promise;
      check();
      if (pdf.numPages > 20)
        throw new Error("Please upload a schedule with 20 pages or fewer.");
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        check();
        onProgress({
          label: `Reading PDF page ${pageNumber}/${pdf.numPages}`,
          progress: (pageNumber - 1) / pdf.numPages,
        });
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const groups = [];
        for (const item of content.items) {
          if (!item.str?.trim()) continue;
          const y = item.transform[5];
          let group = groups.find((g) => Math.abs(g.y - y) < 3);
          if (!group) {
            group = { y, items: [] };
            groups.push(group);
          }
          group.items.push(item);
        }
        let pageLines = groups
          .sort((a, b) => b.y - a.y)
          .map((g) => ({
            text: g.items
              .sort((a, b) => a.transform[4] - b.transform[4])
              .map((i) => i.str)
              .join(" "),
            confidence: 100,
          }));
        if (!parseScheduleLines(pageLines).rows.length) {
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(2, 2400 / Math.max(base.width, base.height));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({
            canvasContext: canvas.getContext("2d"),
            viewport,
          }).promise;
          pageLines = await recognize(canvas, pageNumber, pdf.numPages);
          canvas.width = canvas.height = 0;
        }
        lines.push(...pageLines);
        page.cleanup();
      }
    } else lines = await recognize(file, 1, 1);
    check();
    onProgress({
      label: "Detecting courses, days, times and overlaps",
      progress: 1,
    });
    return {
      ...parseScheduleLines(lines),
      text: lines.map((l) => l.text).join("\n"),
    };
  } finally {
    signal?.removeEventListener("abort", abort);
    await worker?.terminate();
    await pdf?.destroy();
  }
}
