// CSU catalogue supplied for this project. Shared by OCR, forms and validation.
const program = (code, name, majors) => ({
  code,
  name,
  ...(majors ? { majors } : {}),
});
export const collegeProgramMap = [
  {
    code: "CAA",
    name: "College of Agriculture and Agri-Industries",
    programs: [
      program("BSA", "Bachelor of Science in Agriculture", [
        "Agricultural Economics",
        "Agronomy",
        "Animal Science",
        "Crop Protection",
        "Horticulture",
        "Soil Science",
      ]),
      program("BAT", "Bachelor in Agricultural Technology"),
      program("BSFT", "Bachelor of Science in Food Technology"),
    ],
  },
  {
    code: "CCIS",
    name: "College of Computing and Information Sciences",
    programs: [
      program("BSCS", "Bachelor of Science in Computer Science"),
      program("BSIS", "Bachelor of Science in Information Systems"),
      program("BSIT", "Bachelor of Science in Information Technology"),
    ],
  },
  {
    code: "CEd",
    name: "College of Education",
    programs: [
      program("BEEd", "Bachelor of Elementary Education"),
      program("BSEd", "Bachelor of Secondary Education", [
        "English",
        "Filipino",
        "Mathematics",
        "Science",
      ]),
      program("DTC", "Diploma in Teachers Certificate Program"),
    ],
  },
  {
    code: "CEGS",
    name: "College of Engineering and Geo-Sciences",
    programs: [
      program(
        "BSABE",
        "Bachelor of Science in Agricultural and Biosystems Engineering",
      ),
      program("BSCE", "Bachelor of Science in Civil Engineering"),
      program("BSECE", "Bachelor of Science in Electronics Engineering"),
      program("BSGE", "Bachelor of Science in Geodetic Engineering"),
      program("BSGEOL", "Bachelor of Science in Geology"),
      program("BSME", "Bachelor of Science in Mining Engineering"),
      program("BSARCH", "Bachelor of Science in Architecture"),
      program("BSMECH", "Bachelor of Science in Mechanical Engineering"),
    ],
  },
  {
    code: "CHaSS",
    name: "College of Humanities and Social Sciences",
    departments: [
      { code: "DCH", name: "Department of Communication and Humanities" },
      { code: "DP", name: "Department of Psychology" },
      { code: "DSW", name: "Department of Social Work" },
      { code: "DSoc", name: "Department of Sociology" },
    ],
    programs: [
      program("BSPsych", "Bachelor of Science in Psychology"),
      program("BSSW", "Bachelor of Science in Social Work"),
      program("ABSocio", "Bachelor of Arts in Sociology"),
    ],
  },
  {
    code: "CMNS",
    name: "College of Mathematics and Natural Sciences",
    departments: [
      { code: "DM", name: "Department of Mathematics" },
      { code: "DB", name: "Department of Biology" },
      { code: "DC", name: "Department of Chemistry" },
      { code: "DP", name: "Department of Physics" },
    ],
    programs: [
      program("BSAM", "Bachelor of Science in Applied Mathematics"),
      program("BSBiol", "Bachelor of Science in Biology"),
      program("BSChem", "Bachelor of Science in Chemistry"),
      program("BSMBio", "Bachelor of Science in Marine Biology"),
      program("BSMath", "Bachelor of Science in Mathematics"),
      program("BSPhys", "Bachelor of Science in Physics"),
    ],
  },
  {
    code: "CoFES",
    name: "College of Forestry and Environmental Sciences",
    programs: [
      program("BS Agroforestry", "Bachelor of Science in Agroforestry"),
      program("BS Forestry", "Bachelor of Science in Forestry"),
      program("BS EnvSci", "Bachelor of Science in Environmental Science"),
    ],
  },
];

const normalize = (value) =>
  String(value || "")
    .normalize("NFKC")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]/g, "");
export const findCollege = (value) =>
  collegeProgramMap.find((c) =>
    [c.code, c.name].some((v) => normalize(v) === normalize(value)),
  );
export const findProgram = (college, value) =>
  college?.programs.find((p) =>
    [p.code, p.name, `${p.code} - ${p.name}`].some(
      (v) => normalize(v) === normalize(value),
    ),
  );
export function validAcademicPair(college, programName) {
  return !!findProgram(findCollege(college), programName);
}

// Word-boundary matching prevents BSGE matching BSGEOL and BSME matching BSMECH.
function contains(text, phrase, code = false) {
  const escaped = phrase
    .toUpperCase()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s*");
  const pattern = code
    ? escaped.replace(/I/g, "[I1|]").replace(/O/g, "[O0]")
    : escaped.replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^A-Z0-9])${pattern}(?=$|[^A-Z0-9])`, "i").test(text);
}
export function detectAcademicPair(text) {
  const source = String(text || "")
    .normalize("NFKC")
    .replace(/&/g, " AND ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ");
  const colleges = collegeProgramMap.filter(
    (c) => contains(source, c.code, true) || contains(source, c.name),
  );
  const programs = collegeProgramMap.flatMap((c) =>
    c.programs
      .filter((p) => contains(source, p.code, true) || contains(source, p.name))
      .map((p) => ({ college: c, program: p })),
  );
  if (colleges.length > 1 || programs.length > 1) return null;
  if (programs.length !== 1) return null;
  const match = programs[0];
  if (colleges.length && colleges[0].code !== match.college.code) return null;
  return {
    college: match.college.name,
    program: match.program.name,
    collegeCode: match.college.code,
    programCode: match.program.code,
  };
}
