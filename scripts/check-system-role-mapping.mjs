import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { mapOsweRecords } from "../src/services/osweRecords.js";
import { mapLearnerSession } from "../src/services/learnerSessions.js";
import { mapTutorSession } from "../src/services/tutorSessions.js";
import {
  profileError,
  profileValues,
} from "../src/services/profileCompletion.js";
const root = process.argv[2];
assert.ok(root, "Provide role snapshot export directory");
const roles = JSON.parse(
  readFileSync(join(root, "role-snapshots.json"), "utf8").replace(
    /^\uFEFF/,
    "",
  ),
).rows;
assert.equal(roles.length, 4);
const server = await createServer({
  server: { middlewareMode: true },
  logLevel: "error",
});
try {
  const { mapLcoDatabase } = await server.ssrLoadModule(
    "/src/services/lcoRecords.js",
  );
  for (const { role, payload } of roles) {
    assert.ok(payload.roles.includes(role));
    if (role === "lco") {
      const mapped = mapLcoDatabase(payload.snapshot);
      assert.ok(mapped);
      console.log(
        `PASS LCO: live snapshot mapped (${Object.keys(mapped).length} data groups).`,
      );
    } else if (role === "oswe") {
      const mapped = mapOsweRecords(payload.snapshot);
      assert.ok(Array.isArray(mapped.cases));
      assert.ok(Array.isArray(mapped.clearance));
      console.log(
        `PASS OSWE: live snapshot mapped (${mapped.policies.length} catalog records).`,
      );
    } else {
      for (const row of payload.learner_sessions) {
        assert.equal(row.learner_id, payload.user_id);
        const mapped = mapLearnerSession(row);
        assert.ok(mapped.id);
        assert.ok(!mapped.startAt.includes("Invalid"));
      }
      if (role === "tutor")
        for (const row of payload.tutor_sessions) {
          assert.ok(mapTutorSession(row).id);
        }
      assert.ok(payload.reports && Array.isArray(payload.services));
      console.log(
        `PASS ${role}: sessions, reviews, reports, directory and chat reads; profile gate ${profileError(profileValues(payload.profile), true) ? "required" : "complete"}.`,
      );
    }
  }
} finally {
  await server.close();
}
