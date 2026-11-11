import { extractImageText } from "./ocrService.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 8;
const STUDENT_ID_PATTERN = /\b\d{3,4}\s*-\s*\d{4,8}\b/g;
const GRADE_PATTERN = /\b(?:[1-5]\.(?:00|25|50|75)|PASSED|INC|DRP|W)\b/gi;
const ROTATION_AWARE_OCR_OPTIONS = { rotateAuto: true };

function normalizeIdentity(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizedStudentId(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[–—]/g, "-")
    .toUpperCase();
}

function extractStudentIds(source) {
  return [
    ...new Set(
      [...source.matchAll(STUDENT_ID_PATTERN)]
        .map((match) => normalizedStudentId(match[0]))
        .filter((id) => !/^(?:19|20)\d{2}-(?:19|20)\d{2}$/.test(id)),
    ),
  ];
}

function check(label, status, detail) {
  return { label, status, detail };
}

function labeledValue(source, label) {
  const stopLabels =
    "(?:student\\s+id|id\\s+number|surname|last\\s+name|first\\s+name|program|degree|academic\\s+year|school\\s+year|semester|year\\s+level|subject|course(?:\\s+code)?|description|grade|units?)";
  const match = source.match(
    new RegExp(
      `\\b${label}\\b\\s*[:#-]?\\s*(.{2,80}?)(?=\\s+${stopLabels}\\b|[\\r\\n;]|$)`,
      "i",
    ),
  );
  return match?.[1]?.trim().replace(/\s+/g, " ") || "";
}

export function extractTutorCredentialFields(
  documentType,
  text,
  applicant = {},
) {
  const source = String(text || "")
    .normalize("NFKC")
    .replace(/[–—]/g, "-");
  const studentIds = extractStudentIds(source);
  const expectedId = normalizedStudentId(applicant.studentId);
  const expectedName = normalizeIdentity(applicant.name);
  const normalizedText = normalizeIdentity(source);
  const extractedName =
    expectedName && normalizedText.includes(expectedName)
      ? applicant.name
      : labeledValue(source, "(?:student\\s+)?name");
  const nameMatched =
    !!expectedName && normalizeIdentity(extractedName) === expectedName;
  const rows = [
    {
      field: "Name",
      extracted: extractedName || "Not confidently read",
      comparedWith: applicant.name || "Not available",
      status: !extractedName
        ? "Needs Manual Review"
        : nameMatched
          ? "Matched"
          : "Not Matched",
    },
  ];
  if (documentType !== "awards") {
    rows.push({
      field: "Student ID",
      extracted: studentIds.join(", ") || "Not confidently read",
      comparedWith: applicant.studentId || "Not available",
      status:
        !studentIds.length || !expectedId
          ? "Needs Manual Review"
          : studentIds.includes(expectedId)
            ? "Matched"
            : "Not Matched",
    });
  }
  if (documentType === "enrollment") {
    const program = labeledValue(source, "(?:program|degree(?:\\s+program)?)");
    const yearSemester = labeledValue(
      source,
      "(?:year\\s+level|academic\\s+year|school\\s+year|semester)",
    );
    rows.push(
      {
        field: "Program",
        extracted: program || "Not confidently read",
        comparedWith: applicant.program || "Not available",
        status:
          program &&
          applicant.program &&
          normalizeIdentity(program) === normalizeIdentity(applicant.program)
            ? "Matched"
            : "Needs Manual Review",
      },
      {
        field: "Year Level / Semester",
        extracted: yearSemester || "Not confidently read",
        comparedWith: applicant.year || "Not available",
        status:
          yearSemester &&
          applicant.year &&
          new RegExp(
            `\\b${String(applicant.year).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:st|nd|rd|th)?(?:\\s+year)?\\b`,
            "i",
          ).test(yearSemester)
            ? "Matched"
            : "Needs Manual Review",
      },
    );
  } else if (documentType === "grades") {
    const grades = [
      ...new Set(
        [...source.matchAll(GRADE_PATTERN)].map((match) =>
          match[0].toUpperCase(),
        ),
      ),
    ];
    rows.push({
      field: "Course / Grade",
      extracted: grades.length
        ? grades.slice(0, 12).join(", ")
        : "No likely grade values read",
      comparedWith: applicant.subjects?.length
        ? `Selected subjects: ${applicant.subjects.join(", ")}`
        : "Selected subjects not available",
      status: "Needs Manual Review",
    });
  } else if (documentType === "awards") {
    const award = labeledValue(source, "(?:certificate|award|title)");
    rows.push({
      field: "Certificate / Award",
      extracted: award || "Not confidently read",
      comparedWith: "Review submitted evidence",
      status: "Needs Manual Review",
    });
  }
  return rows;
}

export const tutorCredentialOcrLimits = {
  maxFileSize: MAX_FILE_SIZE,
  maxPdfPages: MAX_PDF_PAGES,
};

export function analyzeTutorCredential(documentType, text, applicant = {}) {
  const source = String(text || "")
    .normalize("NFKC")
    .replace(/[–—]/g, "-");
  const checks = [];
  const ids = extractStudentIds(source);
  const expectedId = normalizedStudentId(applicant.studentId);
  if (ids.length) {
    checks.push(
      check(
        "Student ID format",
        "Matched",
        `Found ${[...new Set(ids)].join(", ")} using the campus ID pattern.`,
      ),
    );
    checks.push(
      check(
        "Student ID matches applicant",
        !expectedId
          ? "Needs Manual Review"
          : ids.includes(expectedId)
            ? "Matched"
            : "Not Matched",
        !expectedId
          ? "Applicant student ID is unavailable for comparison."
          : ids.includes(expectedId)
            ? "The extracted ID matches the applicant profile."
            : `Applicant profile lists ${applicant.studentId}.`,
      ),
    );
  } else {
    checks.push(
      check(
        "Student ID",
        "Needs Manual Review",
        "No ID matching the expected numeric pattern was read.",
      ),
    );
  }

  const expectedName = normalizeIdentity(applicant.name);
  const normalizedText = normalizeIdentity(source);
  if (expectedName) {
    const foundName = normalizedText.includes(expectedName);
    checks.push(
      check(
        "Applicant name",
        foundName ? "Matched" : "Needs Manual Review",
        foundName
          ? "The applicant name appears in the extracted text."
          : "The full applicant name was not confidently found in OCR text.",
      ),
    );
  } else {
    checks.push(
      check(
        "Applicant name",
        "Needs Manual Review",
        "Applicant name is unavailable for comparison.",
      ),
    );
  }

  if (documentType === "studentId") {
    const institutionFound =
      /\b(?:caraga\s+state(?:\s+university)?|carsu|csu)\b/i.test(source);
    checks.push(
      check(
        "Caraga State University text",
        institutionFound ? "Matched" : "Needs Manual Review",
        institutionFound
          ? "Recognized a Caraga State University name or abbreviation."
          : "University text was not confidently recognized.",
      ),
    );
  } else if (documentType === "enrollment") {
    const registrationFound =
      /\b(?:certificate\s+of\s+registration|COR|enrollment|registration|registered)\b/i.test(
        source,
      );
    const institutionFound = /\bcaraga\s+state\s+university\b/i.test(source);
    const formMarkers = [
      /\bstudent\s+information\b|\bregistration\s+information\b/i,
      /\bid\s+number\b|\bstudent\s+id\b/i,
      /\bsurname\b|\blast\s+name\b/i,
      /\bprogram\b|\bdegree\b/i,
      /\bacademic\s+year\b|\bsemester\b/i,
      /\bsubject\b|\bcourse\s+code\b|\bcredit\s+units?\b/i,
    ].filter((pattern) => pattern.test(source)).length;
    const carsuFormatFound = institutionFound && formMarkers >= 2;
    checks.push(
      check(
        "CSU enrollment document format",
        registrationFound && carsuFormatFound
          ? "Matched"
          : "Needs Manual Review",
        registrationFound
          ? carsuFormatFound
            ? "Recognized registration wording and CSU enrollment fields."
            : "Registration wording found, but CSU enrollment fields need review."
          : "Expected Certificate of Registration wording was not confidently recognized.",
      ),
    );
  } else if (documentType === "grades") {
    const gradeValues = [...source.matchAll(GRADE_PATTERN)].map((match) =>
      match[0].toUpperCase(),
    );
    checks.push(
      check(
        "Grade evidence",
        gradeValues.length ? "Matched" : "Needs Manual Review",
        gradeValues.length
          ? `Recognized possible grade values: ${[...new Set(gradeValues)].slice(0, 12).join(", ")}.`
          : "No likely grade values were confidently recognized.",
      ),
    );
    const gradeReportTitle =
      /\b(?:student\s+grade\s+report|evaluation\s+of\s+grades|academic\s+record|transcript)\b/i.test(
        source,
      );
    const gradeTableFields = [
      /\bsubject\b/i,
      /\bdescription\b/i,
      /\bgrade\b/i,
      /\bcompletion\b/i,
      /\bunit\b|\bcredit\s+units?\b/i,
    ].filter((pattern) => pattern.test(source)).length;
    const academicRecordFound = gradeReportTitle && gradeTableFields >= 3;
    checks.push(
      check(
        "CSU academic record format",
        academicRecordFound ? "Matched" : "Needs Manual Review",
        academicRecordFound
          ? "Recognized an academic-record title and its grade table headings."
          : "Could not confirm the expected student grade report and table layout.",
      ),
    );
  }

  return {
    checks,
    summary: checks.some((item) => item.status === "Not Matched")
      ? "Potential mismatch — review the original document."
      : checks.every((item) => item.status === "Matched")
        ? "Pattern checks passed — manual review is still required."
        : "Needs manual review — OCR could not confirm every check.",
  };
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not prepare a PDF page for OCR."));
    }, "image/png");
  });
}

function prepareCanvasForOcr(sourceCanvas, maxDimension = 2600) {
  const scale = Math.min(
    2,
    maxDimension / Math.max(sourceCanvas.width, sourceCanvas.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
  canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context)
    throw new Error("Your browser could not prepare this document for OCR.");
  context.filter = "grayscale(1) contrast(1.2)";
  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  context.filter = "none";
  return canvas;
}

async function prepareImageFile(file) {
  const bitmap = await createImageBitmap(file);
  const source = document.createElement("canvas");
  const scale = Math.min(1, 2600 / Math.max(bitmap.width, bitmap.height));
  source.width = Math.max(1, Math.round(bitmap.width * scale));
  source.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = source.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Your browser could not prepare this image for OCR.");
  }
  context.filter = "grayscale(1) contrast(1.2)";
  context.drawImage(bitmap, 0, 0, source.width, source.height);
  context.filter = "none";
  bitmap.close();
  const processed = prepareCanvasForOcr(source);
  source.width = 0;
  source.height = 0;
  try {
    return await canvasToPng(processed);
  } finally {
    processed.width = 0;
    processed.height = 0;
  }
}

function pdfPageText(content) {
  const text = content.items
    .filter((item) => typeof item.str === "string")
    .map((item) => item.str.trim())
    .filter(Boolean)
    .join(" ");
  return text.replace(/\s+/g, " ").trim();
}

async function readPdfText(file, { onProgress, onConfidence, signal }) {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const loadingTask = pdfjs.getDocument({
    data: await file.arrayBuffer(),
  });
  try {
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const pageCount = Math.min(totalPages, MAX_PDF_PAGES);
    const texts = [];
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      signal?.throwIfAborted();
      onProgress({
        label: `Preparing PDF page ${pageNumber} of ${pageCount}`,
        progress: (pageNumber - 1) / pageCount,
      });
      const page = await pdf.getPage(pageNumber);
      const embeddedText = pdfPageText(await page.getTextContent());
      if (embeddedText.length >= 80) {
        texts.push(embeddedText);
        onProgress({
          label: `Read embedded text from PDF page ${pageNumber}`,
          progress: pageNumber / pageCount,
        });
        continue;
      }
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(
        3,
        2400 / Math.max(baseViewport.width, baseViewport.height),
      );
      const viewport = page.getViewport({ scale });
      const rendered = document.createElement("canvas");
      rendered.width = Math.ceil(viewport.width);
      rendered.height = Math.ceil(viewport.height);
      const context = rendered.getContext("2d");
      if (!context)
        throw new Error("Your browser could not prepare this PDF for OCR.");
      await page.render({ canvas: rendered, canvasContext: context, viewport })
        .promise;
      const canvas = prepareCanvasForOcr(rendered);
      rendered.width = 0;
      rendered.height = 0;
      const image = await canvasToPng(canvas);
      canvas.width = 0;
      canvas.height = 0;
      const text = await extractImageText(image, {
        signal,
        recognizeOptions: ROTATION_AWARE_OCR_OPTIONS,
        onConfidence,
        onProgress: (event) =>
          onProgress({
            label: `Page ${pageNumber}: ${event.label || "Reading text"}`,
            progress: (pageNumber - 1 + (event.progress || 0)) / pageCount,
          }),
      });
      texts.push(text);
    }
    return {
      text: texts.join("\n\n"),
      pagesRead: pageCount,
      totalPages,
    };
  } finally {
    await loadingTask.destroy();
  }
}

export async function readTutorCredential(
  file,
  { onProgress = () => {}, onConfidence = () => {}, signal } = {},
) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0)
    throw new Error("The selected document is empty or unavailable.");
  if (file.size > MAX_FILE_SIZE)
    throw new Error("Choose a document of 10 MB or less.");
  signal?.throwIfAborted();
  if (file.type === "application/pdf") {
    const confidences = [];
    const result = await readPdfText(file, {
      onProgress,
      onConfidence: (value) => confidences.push(value),
      signal,
    });
    return {
      ...result,
      truncated: result.totalPages > result.pagesRead,
      confidence: confidences.length
        ? confidences.reduce((total, value) => total + value, 0) /
          confidences.length
        : null,
    };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("OCR supports PDF, JPG, PNG, or WebP documents.");
  const preparedImage = await prepareImageFile(file);
  let confidence = null;
  return {
    text: await extractImageText(preparedImage, {
      onProgress,
      signal,
      onConfidence: (value) => {
        confidence = value;
        onConfidence(value);
      },
      recognizeOptions: ROTATION_AWARE_OCR_OPTIONS,
    }),
    pagesRead: 1,
    totalPages: 1,
    truncated: false,
    confidence,
  };
}
