import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  collegeProgramMap,
  detectAcademicPair,
  findCollege,
  validAcademicPair,
} from "../src/data/collegeProgramMap.js";
import {
  parseStudentIdText,
  readStudentId,
} from "../src/services/studentIdOcr.js";
import { profileError } from "../src/services/profileCompletion.js";

for (const [college, program] of [
  ["CCIS", "BSIT"],
  ["CCIS", "BSIS"],
  ["CCIS", "BSCS"],
  ["CAA", "BSA"],
  ["CEd", "BEEd"],
  ["CEd", "BSEd"],
  ["CEGS", "BSCE"],
  ["CHaSS", "BSPsych"],
  ["CMNS", "BSBiol"],
  ["CoFES", "BS Forestry"],
]) {
  test(`maps ${college} - ${program} to canonical names`, () => {
    const result = detectAcademicPair(`${college} - ${program}`);
    assert.equal(result.collegeCode, college);
    assert.equal(result.programCode, program);
    assert.equal(result.college, findCollege(college).name);
    assert.equal(
      result.program,
      findCollege(college).programs.find((p) => p.code === program).name,
    );
  });
}
test("normalizes separators, case, whitespace and bounded OCR substitutions", () => {
  for (const value of [
    "CCIS-BSIT",
    "CCIS - BSIT",
    "CCIS BSIT",
    "ccis / bsit",
    " CCIS   —  BSIT ",
    "CC1S - BS1T",
  ])
    assert.equal(detectAcademicPair(value)?.programCode, "BSIT", value);
});
test("preserves overlapping program codes and all supplied choices", () => {
  for (const c of collegeProgramMap)
    for (const p of c.programs)
      assert.equal(
        detectAcademicPair(`${c.code} - ${p.code}`)?.programCode,
        p.code,
      );
  assert.ok(findCollege("CEGS").programs.some((p) => p.code === "BSARCH"));
  assert.ok(findCollege("CEGS").programs.some((p) => p.code === "BSMECH"));
  assert.equal(
    findCollege("CAA").programs.find((p) => p.code === "BSA").majors.length,
    6,
  );
});
test("unknown, mismatched and ambiguous pairs are not guessed", () => {
  for (const value of [
    "CCIS - UNKNOWN",
    "CAA - BSIT",
    "CCIS - BSIT / BSIS",
    "CCIS CAA BSIT",
    "DP",
  ])
    assert.equal(detectAcademicPair(value), null, value);
  assert.equal(validAcademicPair("CCIS", "BSCE"), false);
  assert.equal(validAcademicPair("CCIS", "arbitrary"), false);
});
test("provided ID example fills the existing identity fields", () => {
  assert.deepEqual(
    parseStudentIdText(
      "CARAGA STATE UNIVERSITY\nJohn Kirk L. Emboy\n231-01293\nCCIS - BSIT",
      { allowUnlabelledName: true },
    ),
    {
      name: "John Kirk L. Emboy",
      studentId: "231-01293",
      college: "College of Computing and Information Sciences",
      program: "Bachelor of Science in Information Technology",
    },
  );
});
test("conflicting front/back academics stay blank", async () => {
  const front = { type: "image/png", size: 1 },
    back = { type: "image/jpeg", size: 1 };
  const result = await readStudentId(front, back, {
    recognize: async (file) => (file === front ? "CCIS - BSIT" : "CAA - BSA"),
  });
  assert.equal(result.fields.college, undefined);
  assert.equal(result.fields.program, undefined);
});
test("manual canonical pair validates without OCR and rejects arbitrary values", () => {
  const pair = detectAcademicPair("CCIS BSIT");
  const values = {
    name: "Test Student",
    studentId: "231-01293",
    phone: "09123456789",
    bio: "Student bio",
    interests: "Programming",
    year: "1",
    ...pair,
  };
  assert.equal(profileError(values), "");
  assert.notEqual(profileError({ ...values, program: "Unknown" }), "");
});
test("server allow-list is generated from the shared catalogue", () => {
  const sql = fs.readFileSync(
    new URL("../supabase/manual/learner_profile_setup.sql", import.meta.url),
    "utf8",
  );
  const actual = JSON.parse(sql.split("$catalogue$")[1]);
  assert.deepEqual(
    actual,
    collegeProgramMap.flatMap((c) => c.programs.map((p) => [c.name, p.name])),
  );
});
