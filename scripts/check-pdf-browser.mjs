// Real PDF parsing/rendering with missing browser methods in BOTH execution contexts.
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";

const toolsRoot = process.argv[2];
assert.ok(toolsRoot, "Provide the browser tools directory");
const { chromium } = await import(
  pathToFileURL(join(toolsRoot, "node_modules/playwright/index.mjs"))
);
const server = await createServer({
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});

function makePdf() {
  const stream =
    "BT /F1 16 Tf 30 160 Td (CS101 Programming Monday 08:00-09:00) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

try {
  const page = await browser.newPage();
  const optimizedPdfRequests = [];
  page.on("request", (request) => {
    if (/\/\.vite\/deps\/pdfjs/i.test(request.url()))
      optimizedPdfRequests.push(request.url());
  });
  await page.addInitScript(() => {
    delete Map.prototype.getOrInsertComputed;
    delete WeakMap.prototype.getOrInsertComputed;
  });
  let workerLoads = 0;
  await page.route(/pdf\.worker.*\.mjs/, async (route) => {
    if (new URL(route.request().url()).searchParams.has("url"))
      return route.continue();
    const response = await route.fetch();
    const source = await response.text();
    workerLoads++;
    await route.fulfill({
      response,
      body:
        "delete Map.prototype.getOrInsertComputed; delete WeakMap.prototype.getOrInsertComputed;\n" +
        source,
    });
  });
  await page.goto(`${base}/login`);
  const result = await page.evaluate(
    async ({ pdf }) => {
      const file = new File([pdf], "schedule.pdf", { type: "application/pdf" });
      const { extractPdfScheduleText } =
        await import("/src/services/schedulePdfOcr.js");
      let renderedPages = 0;
      const schedule = await extractPdfScheduleText(file, {
        recognize: async (image) => {
          if (image.type !== "image/png" || image.size < 100)
            throw new Error("PDF page was not rendered to a valid OCR image");
          renderedPages++;
          return "CS101 Programming Monday 08:00-09:00";
        },
      });
      const { readTutorCredential } =
        await import("/src/services/tutorCredentialVerification.js");
      const credential = await readTutorCredential(file);
      return {
        schedule,
        renderedPages,
        credentialText: credential.text,
        pagesRead: credential.pagesRead,
      };
    },
    { pdf: makePdf() },
  );
  assert.equal(result.renderedPages, 1);
  assert.ok(result.schedule.includes("CS101"));
  assert.ok(result.credentialText.includes("CS101"));
  assert.equal(result.pagesRead, 1);
  assert.ok(workerLoads > 0, "A real PDF worker must be exercised");
  assert.deepEqual(
    optimizedPdfRequests,
    [],
    "On-demand PDF loading must not use stale optimized dependency URLs",
  );
  console.log(
    "PASS: schedule PDF renders for OCR and credential PDF text is extracted with getOrInsertComputed absent in browser and worker.",
  );
} finally {
  await browser.close();
  await server.close();
}
