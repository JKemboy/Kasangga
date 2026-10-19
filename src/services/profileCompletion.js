import {
  findCollege,
  findProgram,
  validAcademicPair,
} from "./collegeProgramMap.js";
export function profileError(p, verified = true) {
  if (!verified) return "Verify your email before completing your profile.";
  for (const key of [
    "name",
    "studentId",
    "phone",
    "bio",
    "interests",
    "program",
    "year",
    "college",
  ])
    if (!String(p[key] || "").trim()) return "Complete every required field.";
  if (!validAcademicPair(p.college, p.program))
    return "Select a valid college and its corresponding program.";
  if (!/^[+0-9 ()-]{7,20}$/.test(p.phone.trim()))
    return "Enter a valid phone number.";
  if (!/^[1-6]$/.test(String(p.year))) return "Choose a valid year level.";
  if (
    p.name.length > 150 ||
    p.studentId.length > 50 ||
    p.bio.length > 1000 ||
    p.interests.length > 1000 ||
    p.program.length > 150 ||
    p.college.length > 150
  )
    return "One or more fields exceed the allowed length.";
  return "";
}
export function profileValues(p = {}) {
  const college = findCollege(p.college);
  const program = findProgram(college, p.program);
  return {
    name: [p.first_name, p.last_name].filter(Boolean).join(" "),
    studentId: p.student_id || "",
    phone: p.phone_number || "",
    bio: p.short_bio || "",
    interests: p.study_interests || "",
    program: program?.name || "",
    year: String(p.year_level || ""),
    college: college?.name || "",
  };
}
export function needsProfile(p, user) {
  return !!profileError(profileValues(p), !!user?.email_confirmed_at);
}
