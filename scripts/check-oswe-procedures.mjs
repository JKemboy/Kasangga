import assert from "node:assert/strict";
import {
  osweProcedures,
  filterProcedures,
} from "../src/services/osweProcedures.js";
import { policyCategories } from "../src/services/policyPresentation.js";
assert.equal(osweProcedures.length, 10);
assert.equal(new Set(osweProcedures.map((p) => p.title)).size, 10);
assert.equal(osweProcedures.filter((p) => p.owner === "System").length, 4);
assert.equal(
  osweProcedures.filter((p) => p.owner === "University Policies").length,
  6,
);
for (const category of policyCategories) {
  const count = osweProcedures.filter((p) => p.category === category).length;
  assert.ok(count > 0);
  assert.equal(filterProcedures(osweProcedures, { category }).length, count);
  for (const owner of ["System", "University Policies"]) {
    assert.deepEqual(
      filterProcedures(osweProcedures, { category, owner }),
      osweProcedures.filter(
        (p) => p.category === category && p.owner === owner,
      ),
    );
  }
}
assert.equal(
  filterProcedures(osweProcedures, { query: "face-to-face" }).length,
  1,
);
assert.equal(
  filterProcedures(osweProcedures, { query: "unmatched text" }).length,
  0,
);
assert.ok(
  osweProcedures.every(
    (p) => p.basis && p.content && policyCategories.includes(p.category),
  ),
);
console.log(
  "OSWE procedure catalog, category counts, combined filters and search passed.",
);
