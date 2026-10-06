import { test } from "node:test";
import assert from "node:assert/strict";
import {
  idImageError,
  parseStudentIdText,
  readStudentId,
} from "../src/services/studentIdOcr.js";
import { workspaceProfile } from "../src/services/authAccount.js";

const image = { type: "image/png", size: 100 };
test("ID upload only accepts nonempty supported images within 10 MiB", () => {
  assert.equal(idImageError(image), "");
  for (const file of [
    null,
    { type: "application/pdf", size: 100 },
    { ...image, size: 0 },
    { ...image, size: 10 * 1024 * 1024 + 1 },
  ])
    assert.ok(idImageError(file));
});
test("extracts only ID profile fields, never email or manual fields", () => {
  assert.deepEqual(
    parseStudentIdText(
      "Full Name: Ana Cruz\nStudent ID: 2026-12345\nCourse / Program: BS Mathematics\nCollege: CSM\nEmail: other@example.com\nPhone: 09123456789",
    ),
    {
      name: "Ana Cruz",
      studentId: "2026-12345",
      program: "BS Mathematics",
      college: "CSM",
    },
  );
});
test("supports separate label lines and leaves ambiguous names for review", () => {
  assert.equal(parseStudentIdText("Name\nAna Cruz").name, "Ana Cruz");
  assert.deepEqual(
    parseStudentIdText(
      "CARAGA STATE UNIVERSITY\nOffice of the President\nSignature",
    ),
    {},
  );
  assert.equal(
    parseStudentIdText(
      "2026-12345\nBachelor of Science in Mathematics\nCollege of Science and Mathematics",
    ).college,
    "College of Science and Mathematics",
  );
});
test("both images are read sequentially and front fields take precedence", async () => {
  const front = { ...image, side: "front" },
    back = { ...image, side: "back" },
    calls = [];
  const result = await readStudentId(front, back, {
    recognize: async (file) => {
      calls.push(file.side);
      return file.side === "front"
        ? "Name: Ana Cruz"
        : "Name: Emergency Contact\nCollege: CSM";
    },
  });
  assert.deepEqual(calls, ["front", "back"]);
  assert.deepEqual(result.fields, { name: "Ana Cruz", college: "CSM" });
  assert.ok(result.texts.front);
  assert.ok(result.texts.back);
});
test("missing back image and cancellation prevent OCR completion", async () => {
  let called = false;
  await assert.rejects(
    readStudentId(image, null, {
      recognize: async () => {
        called = true;
        return "";
      },
    }),
  );
  assert.equal(called, false);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    readStudentId(image, image, { signal: controller.signal }),
    { name: "AbortError" },
  );
});
test("saved profile maps identity and academics consistently for Profile", () => {
  const result = workspaceProfile({
    first_name: "Ana",
    last_name: "Cruz",
    student_id: "2026-12345",
    csu_email: "ana@carsu.edu.ph",
    program: "BS Mathematics",
    college: "CSM",
    year_level: 4,
    short_bio: "About me",
    study_interests: "Math, Physics",
    phone_number: "09123456789",
  });
  assert.equal(result.name, "Ana Cruz");
  assert.equal(result.studentId, "2026-12345");
  assert.equal(result.email, "ana@carsu.edu.ph");
  assert.equal(result.program, "BS Mathematics");
  assert.equal(result.college, "CSM");
  assert.equal(result.year, "4");
  assert.deepEqual(result.interests, ["Math", "Physics"]);
});

test("ID auto-fill only replaces four fields and clears undetected stale values", async () => {
  const { applyIdFields } = await import("../src/services/studentIdOcr.js");
  const manual = {
    phone: "09123456789",
    bio: "My bio",
    interests: "Math",
    year: "4",
    email: "me@carsu.edu.ph",
  };
  assert.deepEqual(
    applyIdFields(
      { ...manual, name: "Old Name", college: "Old College" },
      { name: "New Name", studentId: "2026-12345", phone: "wrong" },
    ),
    {
      ...manual,
      name: "New Name",
      studentId: "2026-12345",
      program: "",
      college: "",
    },
  );
});
test("ID layout supports unlabelled front name, spaced ID and wrapped college", () => {
  const fields = parseStudentIdText(
    "CARAGA STATE UNIVERSITY\nANA MARIA CRUZ\n2026 - 12345\nBSIT\nCollege of Computing &\nInformation Sciences",
    { allowUnlabelledName: true },
  );
  assert.equal(fields.name, "ANA MARIA CRUZ");
  assert.equal(fields.studentId, "2026-12345");
  assert.equal(fields.program, "BSIT");
  assert.equal(fields.college, "College of Computing & Information Sciences");
});
test("separate college label works and emergency contact names are excluded", () => {
  assert.equal(parseStudentIdText("College\nCSM").college, "CSM");
  assert.equal(
    parseStudentIdText("In case of emergency\nName: Parent Name").name,
    undefined,
  );
});
