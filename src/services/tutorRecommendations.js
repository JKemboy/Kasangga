const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
// Subject associations are ranking hints, not assertions about a student's curriculum.
const disciplines = [
  [
    /\b(bsit|bscs|bsis|information technology|computer science|information systems)\b/,
    [
      "programming",
      "computer science",
      "database",
      "software",
      "network",
      "algorithm",
      "web development",
      "python",
      "java",
      "javascript",
      "sql",
    ],
  ],
  [
    /\b(engineering|bsce|bsee|bsme|bsece|bscpe)\b/,
    [
      "calculus",
      "physics",
      "algebra",
      "engineering",
      "mechanics",
      "mathematics",
    ],
  ],
  [
    /\b(accountancy|accounting|bsa|bsma)\b/,
    [
      "accounting",
      "accountancy",
      "finance",
      "taxation",
      "auditing",
      "business",
    ],
  ],
  [
    /\b(business|bsba|entrepreneurship|economics)\b/,
    [
      "business",
      "economics",
      "marketing",
      "finance",
      "accounting",
      "statistics",
    ],
  ],
  [
    /\b(nursing|bsn|biology|medicine)\b/,
    ["biology", "anatomy", "physiology", "chemistry", "health"],
  ],
  [
    /\b(mathematics|statistics|bsmath)\b/,
    ["mathematics", "statistics", "calculus", "algebra", "probability"],
  ],
  [
    /\b(education|bsed|beed)\b/,
    ["education", "teaching", "pedagogy", "curriculum"],
  ],
  [
    /\b(agriculture|agricultural|forestry|environmental)\b/,
    ["agriculture", "forestry", "ecology", "biology", "soil", "environmental"],
  ],
];
const ignored = new Set([
  "bachelor",
  "science",
  "arts",
  "bs",
  "ba",
  "of",
  "in",
  "and",
  "program",
  "course",
  "major",
]);
export function courseRecommendations(tutors, program) {
  const course = normalize(program);
  if (!course) return [];
  const terms = new Set(
    course.split(" ").filter((word) => word.length > 2 && !ignored.has(word)),
  );
  for (const [pattern, subjects] of disciplines) {
    if (pattern.test(course)) subjects.forEach((subject) => terms.add(subject));
  }
  return tutors
    .map((tutor) => {
      const matchingServices = (tutor.services || [])
        .map((service) => {
          const text = ` ${normalize([service.name, service.subtitle, service.category, ...(service.topics || [])].join(" "))} `;
          const score = [...terms].filter((term) =>
            text.includes(` ${term} `),
          ).length;
          return { service, score };
        })
        .filter((match) => match.score > 0);
      return {
        ...tutor,
        courseScore: Math.max(
          0,
          ...matchingServices.map((match) => match.score),
        ),
        courseServices: matchingServices.map((match) => match.service),
      };
    })
    .filter((tutor) => tutor.courseScore > 0)
    .sort(
      (a, b) =>
        b.courseScore - a.courseScore || (b.rating || 0) - (a.rating || 0),
    );
}
