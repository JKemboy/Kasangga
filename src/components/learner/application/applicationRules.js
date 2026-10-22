export const SUBJECTS = {
  Programming: ["Python Basics", "Java", "Problem Solving"],
  "Web Development": ["HTML & CSS", "JavaScript", "React"],
  "Database Systems": ["SQL", "Database Design", "Normalization"],
  Calculus: ["Limits", "Derivatives", "Integrals"],
  "Linear Algebra": ["Matrices", "Vector Spaces", "Systems of Equations"],
  Statistics: ["Descriptive Statistics", "Probability", "Hypothesis Testing"],
  Physics: ["Kinematics", "Dynamics", "Laws of Motion"],
  English: ["Grammar", "Academic Writing", "Reading Comprehension"],
};
export const DOCUMENTS = [
  {
    id: "studentId",
    title: "Caraga State University Student ID",
    required: true,
    description: "Verifies your CSU student identity.",
  },
  {
    id: "enrollment",
    title: "Certificate of Registration (COR) / Current Enrollment Proof",
    required: true,
    description:
      "Upload your COR or enrollment proof for the current semester. It must show your current enrollment and academic details.",
  },
  {
    id: "grades",
    title: "Grade Evidence / Academic Record",
    required: true,
    description:
      "Attach grades or academic records for courses relevant to the services or subject expertise you selected in this application.",
  },
  {
    id: "awards",
    title: "Relevant Certificates / Awards",
    required: false,
    description:
      "Additional evidence of expertise, training or academic achievement.",
  },
];
export function tutoringError(draft) {
  if (!draft.subjects?.length || draft.subjects.some((s) => !SUBJECTS[s]))
    return "Choose at least one subject.";
  if (draft.bio?.trim().length < 30 || !draft.bio || draft.bio.length > 400)
    return "Write a bio of 30–400 characters.";
  if (!["Online", "In-Person", "Both"].includes(draft.type))
    return "Choose a session type.";
  if (
    !draft.motivation ||
    draft.motivation.trim().length < 20 ||
    draft.motivation.length > 300
  )
    return "Explain why you are applying in 20–300 characters.";
  return "";
}
export function documentsError(documents) {
  return DOCUMENTS.some(
    (d) =>
      d.required &&
      !documents[d.id]?.storagePath &&
      !documents[d.id]?.storageId,
  )
    ? "Upload Student ID, enrollment proof and grade evidence."
    : "";
}
export function applicationError(draft) {
  return (
    tutoringError(draft) ||
    documentsError(draft.documents || {}) ||
    (!draft.certified ? "Check the certification box." : "")
  );
}
