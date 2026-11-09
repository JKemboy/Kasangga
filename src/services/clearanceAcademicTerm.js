// Older case-generated clearances used workflow text in the academic fields.
// Their academic term is AY 2025-2026, first semester.
export function clearanceAcademicTerm(yearValue, semesterValue) {
  const legacy = (value) =>
    /^case[\s-]+follow[\s-]*up$/i.test(String(value || "").trim());
  const year = legacy(yearValue)
    ? "2025-2026"
    : String(yearValue || "")
        .trim()
        .replace(/^AY\.?\s*/i, "");
  const rawSemester = legacy(semesterValue)
    ? "1st Sem"
    : String(semesterValue || "").trim();
  const semester = /^(1|1st|first)(?:[\s_-]*(sem|semester))?$/i.test(
    rawSemester,
  )
    ? "1st Sem"
    : /^(2|2nd|second)(?:[\s_-]*(sem|semester))?$/i.test(rawSemester)
      ? "2nd Sem"
      : rawSemester;
  return {
    academicYear: year,
    semester,
    term: year && semester ? `AY. ${year}, ${semester}` : "Not provided",
  };
}
