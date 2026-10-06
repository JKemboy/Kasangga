import { test } from "node:test";
import assert from "node:assert/strict";
import {
  profileError,
  needsProfile,
} from "../src/services/profileCompletion.js";
const values = {
  name: "Student Name",
  studentId: "2026-0001",
  phone: "09123456789",
  bio: "Learning mathematics",
  interests: "Calculus",
  program: "Bachelor of Science in Mathematics",
  year: "1",
  college: "College of Mathematics and Natural Sciences",
};
test("every onboarding field is mandatory, including whitespace-only values", () => {
  assert.equal(profileError(values), "");
  for (const key of Object.keys(values))
    assert.notEqual(profileError({ ...values, [key]: "  " }), "", key);
});
test("unverified email and invalid field formats cannot unlock access", () => {
  assert.notEqual(profileError(values, false), "");
  assert.notEqual(profileError({ ...values, phone: "invalid" }), "");
  assert.notEqual(profileError({ ...values, year: "9" }), "");
  assert.notEqual(profileError({ ...values, bio: "a".repeat(1001) }), "");
});
test("completion derives from persisted fields, not local completion flags", () => {
  assert.equal(
    needsProfile({ complete: true }, { email_confirmed_at: "2026-01-01" }),
    true,
  );
  const p = {
    first_name: "Student",
    last_name: "Name",
    student_id: values.studentId,
    phone_number: values.phone,
    short_bio: values.bio,
    study_interests: values.interests,
    program: values.program,
    year_level: 1,
    college: values.college,
  };
  assert.equal(needsProfile(p, { email_confirmed_at: "2026-01-01" }), false);
  assert.equal(needsProfile(p, {}), true);
});
