import { extractImageText, scheduleImageError } from "./ocrService.js";

export function idImageError(file) {
  return file ? scheduleImageError(file) : "Choose an ID image first.";
}

// Only labelled values and distinctive academic/ID patterns are suggested.
// Uncertain names are left blank for review rather than guessed from signatures.
export function parseStudentIdText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
  const labels = {
    name: /^(?:full\s*name|student\s*name|name)\s*[:.\-]?\s*(.*)$/i,
    studentId:
      /^(?:student\s*(?:id|number|no\.?)|id\s*(?:number|no\.?)?)\s*[:.\-]?\s*(.*)$/i,
    program:
      /^(?:course\s*\/\s*program|course|program|degree)\s*[:.\-]?\s*(.*)$/i,
    college: /^college\s*[:\-]\s*(.*)$/i,
  };
  const fields = {};
  for (const [key, pattern] of Object.entries(labels)) {
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(pattern);
      if (!match) continue;
      const value = match[1] || lines[i + 1] || "";
      if (!value || Object.values(labels).some((p) => p.test(value))) continue;
      fields[key] = value;
      break;
    }
  }
  fields.studentId ||= lines.join(" ").match(/\b\d{4}-\d{4,8}\b/)?.[0];
  fields.program ||= lines.find((line) =>
    /^(?:bachelor\s+of\s+|BS\s|BA\s|B\.S\.\s)/i.test(line),
  );
  fields.college ||= lines.find((line) => /^college\s+of\s+/i.test(line));
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value),
  );
}

export async function readStudentId(
  front,
  back,
  { signal, onProgress = () => {}, recognize = extractImageText } = {},
) {
  for (const file of [front, back]) {
    const error = idImageError(file);
    if (error) throw new Error(error);
  }
  const texts = {};
  for (const [side, file] of [
    ["front", front],
    ["back", back],
  ]) {
    signal?.throwIfAborted();
    texts[side] = await recognize(file, {
      signal,
      onProgress: (event) => onProgress({ ...event, side }),
    });
  }
  signal?.throwIfAborted();
  return {
    texts,
    fields: {
      ...parseStudentIdText(texts.back),
      ...parseStudentIdText(texts.front),
    },
  };
}
