// Academic-year grouping uses the August start of the school year.
export function academicYear(value) {
  const day = value
    ? String(value).slice(0, 10)
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
  const year = Number(day.slice(0, 4)),
    month = Number(day.slice(5, 7));
  if (!year || !month) return "";
  const start = month >= 8 ? year : year - 1;
  return start + "-" + (start + 1);
}
