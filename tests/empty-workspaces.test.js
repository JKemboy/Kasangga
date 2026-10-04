import test from "node:test";
import assert from "node:assert/strict";
import { resetDemoData } from "../src/resetDemoData.js";
import { seed } from "../src/components/tutor/workspace/data.js";
import { applications, adminServices } from "../src/components/admin/adminData.js";
import { incidents } from "../src/components/osas/incidentMonitoringData.js";
import { sessionRecords } from "../src/components/learner/sessions/sessionRecords.js";

test("role defaults contain no sample people or activity", () => {
  for (const key of ["services", "sessions", "slots", "notifications", "threads", "reports", "uploads"]) assert.deepEqual(seed[key], []);
  assert.equal(seed.profile.name, "");
  for (const rows of [applications, adminServices, incidents, sessionRecords]) assert.deepEqual(rows, []);
});

test("demo reset clears only CampusTutor keys and runs once", () => {
  const data = new Map([["campustutor:learner-workspace:v1", "old data"], ["unrelated", "keep"]]);
  const storage = { get length() { return data.size; }, key: i => [...data.keys()][i], getItem: k => data.get(k), setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
  resetDemoData(storage);
  assert.equal(data.has("campustutor:learner-workspace:v1"), false);
  assert.equal(data.get("unrelated"), "keep");
  data.set("campustutor:learner-workspace:v1", "new data");
  resetDemoData(storage);
  assert.equal(data.get("campustutor:learner-workspace:v1"), "new data");
});
