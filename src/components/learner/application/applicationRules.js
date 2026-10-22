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
      "Upload up to 10 certificates or awards. Select multiple files at once; each file must be 10 MB or less.",
  },
];
export function tutoringError(draft) {
  if (!draft.subjects?.length)
    return "Add at least one subject or area of expertise using the Add button.";
  if (!draft.courseCode?.trim())
    return "Enter the course code (for example, IT 101).";
  if (!draft.courseDescription?.trim())
    return "Enter the course description for your subject expertise.";
  if (draft.courseCode.length > 50 || draft.courseDescription.length > 1000)
    return "Course code must be at most 50 characters and description at most 1000 characters.";
  if (!draft.gcashName?.trim())
    return "Enter the account name registered with your GCash account.";
  if (!/^\+639\d{9}$/.test(draft.gcashNumber || ""))
    return "Enter a valid GCash number: +63 followed by 10 digits starting with 9.";
  if (draft.bio?.trim().length < 30 || !draft.bio || draft.bio.length > 400)
    return "Write a bio of 30–400 characters.";
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
    ? "Upload your current-semester COR or enrollment proof and grade evidence relevant to your subjects."
    : "";
}
export function applicationError(draft) {
  return (
    tutoringError(draft) ||
    documentsError(draft.documents || {}) ||
    (!draft.certified ? "Check the certification box." : "")
  );
}

export function documentSlots(documents = {}) {
  return DOCUMENTS.flatMap((document) =>
    document.id === "awards"
      ? [
          document,
          ...Object.keys(documents)
            .filter((key) => key.startsWith("awards_"))
            .map((key) => ({
              ...document,
              id: key,
              kind: "awards",
              uploaded: true,
            })),
        ]
      : [document],
  );
}
export function applicationDocuments(documents = {}) {
  return Object.entries(documents)
    .filter(([, document]) => document?.storagePath)
    .map(([key, document]) => ({
      document_type:
        document.documentType || (key.startsWith("awards_") ? "awards" : key),
      file_path: document.storagePath,
      file_name: document.name,
      mime_type: document.type,
    }));
}
