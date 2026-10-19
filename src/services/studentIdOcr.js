import {
  detectAcademicPair,
  findCollege,
  findProgram,
} from "./collegeProgramMap.js";
import { extractImageText, scheduleImageError } from "./ocrService.js";
import { prepareStudentIdRegions } from "./studentIdRegions.js";

export function idImageError(file) {
  return file ? scheduleImageError(file) : "Choose a student ID image first.";
}

export const ID_FIELDS = {
  name: "Full Name",
  studentId: "Student ID",
  program: "Course / Program",
  college: "College",
};
export function applyIdFields(previous, fields) {
  const next = { ...previous };
  for (const key of Object.keys(ID_FIELDS)) next[key] = fields[key] || "";
  const college = findCollege(next.college);
  const program = findProgram(college, next.program);
  next.college = college?.name || "";
  next.program = program?.name || "";
  return next;
}

export function parseStudentIdText(text, { allowUnlabelledName = false } = {}) {
  const lines = String(text || "")
    .normalize("NFKC")
    .replace(/[\u2013\u2014]/g, "-")
    .split(/\r?\n/)
    .map((v) => v.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const patterns = {
    name: /^(?:full\s*name|student\s*name|name)(?:\s*[:.\-]\s*|\s+|$)(.*)$/i,
    studentId:
      /^(?:student\s*(?:id(?:\s*(?:number|no\.?))?|number|no\.?)|id(?:\s*(?:number|no\.?))?)(?:\s*[:.\-]\s*|\s+|$)(.*)$/i,
    program:
      /^(?:course\s*\/\s*program|course|program|degree)(?:\s*[:.\-]\s*|\s+|$)(.*)$/i,
    college: /^college(?:\s*[:\-]\s*|$)(.*)$/i,
  };
  const fields = {};
  const isLabel = (line) => Object.values(patterns).some((p) => p.test(line));
  const stop = lines.findIndex((line) =>
    /emergency|in case of|parent|guardian/i.test(line),
  );
  const identity = stop < 0 ? lines : lines.slice(0, stop);
  for (const [key, pattern] of Object.entries(patterns)) {
    const source = ["program", "college"].includes(key) ? lines : identity;
    for (let i = 0; i < source.length; i++) {
      const match = source[i].match(pattern);
      if (!match) continue;
      let value = match[1] || source[i + 1] || "";
      if (!value || isLabel(value)) continue;
      if (key === "studentId") value = value.replace(/\s*-\s*/g, "-");
      if (key === "name" && /\d|signature|president/i.test(value)) continue;
      fields[key] = value;
      break;
    }
  }
  fields.studentId ||= identity
    .join(" ")
    .match(/\b\d{3,4}\s*-\s*\d{4,8}\b/)?.[0]
    .replace(/\s/g, "");
  const programIndex = identity.findIndex((line) =>
    /^(?:bachelor\s+of\s+|BS(?:[A-Z]{1,5}\b|\s)|BA\s|B\.S\.\s)/i.test(line),
  );
  const collegeIndex = identity.findIndex((line) =>
    /^college\s+of\s+/i.test(line),
  );
  fields.program ||= identity[programIndex];
  fields.college ||= identity[collegeIndex];
  // Join clear wrapped academic phrases; never append labels or identity lines.
  for (const key of ["program", "college"]) {
    const index = identity.indexOf(fields[key]);
    const following = identity[index + 1];
    if (
      index >= 0 &&
      /(?:of|in|and|&)$/i.test(fields[key]) &&
      following &&
      !isLabel(following) &&
      !/\d|university|signature/i.test(following)
    )
      fields[key] += " " + following;
  }
  if (!fields.name && allowUnlabelledName) {
    const candidates = identity.filter(
      (line) =>
        /^[\p{L}][\p{L} .,'?-]+$/u.test(line) &&
        line.split(/\s+/).length >= 2 &&
        line.split(/\s+/).length <= 7 &&
        !/university|college|bachelor|science|technology|republic|philippines|student|signature|president|valid|address|blood|contact|course|program|caraga|butuan|city|campus|registration/i.test(
          line,
        ) &&
        !detectAcademicPair(line) &&
        line !== fields.program &&
        !isLabel(line),
    );
    if (candidates.length === 1) fields.name = candidates[0];
  }
  const academic = detectAcademicPair(text);
  delete fields.college;
  delete fields.program;
  if (academic) {
    fields.college = academic.college;
    fields.program = academic.program;
  }
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value),
  );
}

export async function readStudentId(
  front,
  back,
  { signal, onProgress = () => {}, recognize = extractImageText,
    prepareRegions = recognize === extractImageText ? prepareStudentIdRegions : null } = {},
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
      parameters: { tessedit_pageseg_mode: "11" },
      onProgress: (event) => onProgress({ ...event, side }),
    });
  }
  signal?.throwIfAborted();
  let regionName;
  if (prepareRegions) {
    try {
      onProgress({side:"front", label:"Preparing name and college/program strips", progress:0});
      const regions = await prepareRegions(front);
      signal?.throwIfAborted();
      if (regions) {
        for (const [key, mode] of [["name", "13"], ["academic", "7"]]) {
          texts[key + "Strip"] = await recognize(regions[key], {
            signal, parameters: {tessedit_pageseg_mode:mode},
            onProgress: event => onProgress({...event, side:"front", label:`${key === "name" ? "Name strip" : "College/program strip"}: ${event.label}`}),
          });
        }
        const name = texts.nameStrip.replace(/\s+/g," ").trim();
        if (/^[\p{L}][\p{L} .,'\u2019-]+$/u.test(name) && name.split(" ").length >= 2 && name.split(" ").length <= 8 && !/university|college|student|signature/i.test(name)) regionName = name;
      }
    } catch (error) {
      if (signal?.aborted || error.name === "AbortError") throw error;
      // Keep whole-image results available if region preparation is unsupported.
      texts.regionWarning = "Could not read the ID strips separately. Review the whole-image results or enter missing fields manually.";
    }
  }
  signal?.throwIfAborted();
  const academic = detectAcademicPair(texts.front + "\n" + texts.back + "\n" + (texts.academicStrip || ""));
  const fields = {
    ...parseStudentIdText(texts.back),
    ...parseStudentIdText(texts.front, { allowUnlabelledName: true }),
  };
  if (regionName) fields.name = regionName;
  delete fields.college;
  delete fields.program;
  if (academic) {
    fields.college = academic.college;
    fields.program = academic.program;
  }
  return {
    texts,
    fields,
    academic,
  };
}
