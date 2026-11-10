import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import {
  osweProcedures,
  filterProcedures,
} from "../src/services/osweProcedures.js";
import { mapOsweRecords } from "../src/services/osweRecords.js";
import {
  policyPresentation,
  policyCategories,
} from "../src/services/policyPresentation.js";

assert.ok(process.argv[2], "Provide a Supabase JSON policies export");
const exported = JSON.parse(
  readFileSync(process.argv[2], "utf8").replace(/^\uFEFF/, ""),
);
const snapshot = Object.fromEntries(
  [
    "users",
    "incident_reports",
    "incident_evidence",
    "evidence_validations",
    "cases",
    "case_actions",
    "case_decisions",
    "clearance_reviews",
    "clearance_holds",
    "financial_sessions",
    "notifications",
  ].map((key) => [key, []]),
);
snapshot.policies = exported.rows;
const policies = mapOsweRecords(snapshot).policies.map(policyPresentation);
const procedures = policies.filter((p) =>
  osweProcedures.some((expected) => expected.title === p.title),
);
assert.equal(procedures.length, 11);
for (const expected of osweProcedures) {
  const actual = procedures.find((p) => p.title === expected.title);
  assert.equal(actual.category, expected.category);
  assert.equal(actual.owner, expected.owner);
  assert.ok(actual.content.startsWith("Basis:"));
}
for (const category of policyCategories) {
  for (const owner of ["System", "University Policies"]) {
    assert.deepEqual(
      filterProcedures(procedures, { category, owner }),
      procedures.filter((p) => p.category === category && p.owner === owner),
    );
  }
}
const server = await createServer({
  server: { middlewareMode: true },
  logLevel: "error",
});
try {
  const { default: List } = await server.ssrLoadModule(
    "/src/components/oswe/OswePolicies.jsx",
  );
  const { default: Details } = await server.ssrLoadModule(
    "/src/components/oswe/PolicyDetails.jsx",
  );
  const html = renderToStaticMarkup(
    React.createElement(List, { settings: {}, policies: procedures }),
  );
  for (const policy of procedures) {
    assert.ok(html.includes(policy.title), `List renders ${policy.title}`);
    const detail = renderToStaticMarkup(
      React.createElement(Details, {
        policy,
        policies: procedures,
        date: (value) => value,
        onClose() {},
        onSelect() {},
      }),
    );
    assert.ok(detail.includes("Basis:"));
    assert.ok(detail.includes(policy.owner));
    assert.ok(
      detail.includes(
        policy.content.includes("pending verification")
          ? "Official procedure content pending verification."
          : policy.content.split("\n\n")[1],
      ),
    );
  }
  const searched = renderToStaticMarkup(
    React.createElement(List, {
      settings: {},
      policies: procedures,
      searchQuery: "Face-to-Face",
    }),
  );
  assert.ok(searched.includes("OSWE Completion Form: Face-to-Face Submission"));
  assert.ok(!searched.includes("View Receiving Reports from LCO"));
  const empty = renderToStaticMarkup(
    React.createElement(List, {
      settings: {},
      policies: procedures,
      searchQuery: "no matching procedure xyz",
    }),
  );
  assert.ok(empty.includes("No matching policies"));
  console.log(
    "PASS: live database records → UI mapper → list/details; exact titles/owners/categories; combined filters; search and empty state.",
  );
} finally {
  await server.close();
}
