import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import {
  osweProcedures,
  filterProcedures,
  catalogPolicies,
} from "../src/services/osweProcedures.js";
import { listLcoPolicies } from "../src/services/lcoPolicies.js";
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
assert.equal(
  policies.length,
  10,
  "OSWE search and dashboard use only the document catalog",
);
const lcoPolicies = await listLcoPolicies({
  from: () => ({
    select: () => ({
      order: async () => ({ data: exported.rows, error: null }),
    }),
  }),
});
assert.equal(
  lcoPolicies.length,
  10,
  "LCO search and policy list share the document catalog",
);
assert.deepEqual(
  lcoPolicies.map((p) => p.title),
  osweProcedures.map((p) => p.title),
);
assert.equal(
  filterProcedures(lcoPolicies, { query: lcoPolicies[0].id }).length,
  1,
  "Policy notification IDs are searchable",
);
assert.equal(
  catalogPolicies([
    ...lcoPolicies,
    { ...lcoPolicies[0], title: osweProcedures[0].legacyTitle },
  ]).length,
  10,
  "Legacy aliases do not add duplicate procedures",
);
const procedures = policies.filter((p) =>
  osweProcedures.some((expected) => expected.title === p.title),
);
assert.equal(procedures.length, 10);
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
  const { default: Recommendation } = await server.ssrLoadModule(
    "/src/components/shared/PolicyRecommendationDetails.jsx",
  );
  const reference = renderToStaticMarkup(
    React.createElement(Recommendation, {
      compact: true,
      subject: { type: "Harassment", student: "Student" },
      history: { previousCount: 2 },
    }),
  );
  assert.ok(reference.includes("2 prior confirmed same-type violation(s)"));
  assert.ok(reference.includes("Harassment"));
  assert.ok(reference.includes("Recording a Case Decision"));
  assert.ok(!reference.includes("Privacy or Consent Violation"));
  assert.ok(!reference.includes("First recorded violation"));
  const html = renderToStaticMarkup(
    React.createElement(List, {
      settings: {},
      policies: [
        ...procedures,
        {
          ...procedures[0],
          id: "extra-1",
          title: "Appeals of Disciplinary Decisions",
        },
        {
          ...procedures[0],
          id: "extra-2",
          title: "Legacy Incident Handling Guide",
        },
      ],
    }),
  );
  assert.ok(!html.includes("Appeals of Disciplinary Decisions"));
  assert.ok(!html.includes("Legacy Incident Handling Guide"));
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
          : policy.content
              .split("\n\n")[1]
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;")
              .replaceAll('"', "&quot;")
              .replaceAll("'", "&#x27;"),
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
