import test from "node:test";
import assert from "node:assert/strict";
import {
  SERVICE_CATEGORIES,
  SERVICE_LEVELS,
  SERVICE_TYPES,
  validateService,
} from "../src/components/tutor/workspace/serviceRules.js";
import { services } from "./fixtures/tutorData.js";

const draft = {
  name: "Discrete Mathematics",
  subtitle: "Logic and Sets",
  category: "Mathematics",
  level: "College",
  description: "Guided practice in logic, sets, and proofs.",
  topics: "Logic, Sets, Proofs",
  rate: "350.50",
  type: "Online",
};

test("service values are trimmed, names normalized, and rates stored as numbers", () => {
  const input = Object.fromEntries(
    Object.entries({ ...draft, name: "  Discrete   Mathematics " }).map(
      ([key, value]) => [key, ` ${value} `],
    ),
  );
  const original = structuredClone(input);
  const result = validateService(input, services);
  assert.equal(result.error, "");
  assert.deepEqual(result.values, { ...draft, rate: 350.5 });
  assert.deepEqual(input, original);
});

test("all text fields are required and checked after trimming", () => {
  for (const field of ["name", "subtitle", "description", "topics"]) {
    for (const empty of ["", " \n\t ", undefined, null]) {
      const result = validateService({ ...draft, [field]: empty }, services);
      assert.match(result.error, /required/, `${field}: ${String(empty)}`);
      assert.equal(result.values, undefined);
    }
  }
});

test("service text limits accept the boundary and reject oversize values", () => {
  for (const [field, limit] of [
    ["name", 200],
    ["subtitle", 200],
    ["topics", 200],
    ["description", 600],
  ]) {
    assert.equal(
      validateService({ ...draft, [field]: "a".repeat(limit) }, services).error,
      "",
    );
    assert.match(
      validateService({ ...draft, [field]: "a".repeat(limit + 1) }, services)
        .error,
      /characters or fewer/,
    );
  }
});

test("rates require finite peso amounts within bounds and at most two decimals", () => {
  for (const rate of [
    "",
    " ",
    null,
    undefined,
    true,
    [],
    "NaN",
    NaN,
    Infinity,
    "0",
    "-1",
    "0.99",
    "10000.01",
  ]) {
    assert.match(
      validateService({ ...draft, rate }, services).error,
      /Rate must be between/,
      `Invalid rate: ${String(rate)}`,
    );
  }
  for (const rate of ["1.001", "350.999", "1e2", "0x10", "35,0"]) {
    assert.ok(validateService({ ...draft, rate }, services).error);
  }
  for (const rate of ["1", "1.01", "10000", "10000.00", 1, 350.5, 10000]) {
    const result = validateService({ ...draft, rate }, services);
    assert.equal(result.error, "", `Valid rate: ${rate}`);
    assert.equal(result.values.rate, Number(rate));
  }
});

test("allowed category, level, and session type options pass while invalid choices fail", () => {
  for (const [field, options] of [
    ["category", SERVICE_CATEGORIES],
    ["level", SERVICE_LEVELS],
    ["type", SERVICE_TYPES],
  ]) {
    for (const option of options) {
      assert.equal(
        validateService({ ...draft, [field]: option }, services).error,
        "",
      );
    }
    for (const invalid of ["", "Invalid option", null]) {
      assert.match(
        validateService({ ...draft, [field]: invalid }, services).error,
        /Choose a valid/,
      );
    }
  }
});

test("existing custom categories remain usable without accepting arbitrary new categories", () => {
  const existing = { ...services[0], category: "Engineering" };
  assert.equal(
    validateService({ ...existing }, [existing], existing.id).error,
    "",
  );
  assert.equal(
    validateService({ ...draft, category: "Engineering" }, [existing]).error,
    "",
  );
  assert.match(
    validateService({ ...draft, category: "Engineering" }, services).error,
    /valid service category/,
  );
});

test("duplicate service names ignore capitalization and repeated whitespace on create and edit", () => {
  assert.match(
    validateService({ ...draft, name: "  cALCULUS   1 " }, services).error,
    /already exists/,
  );
  assert.match(
    validateService(
      { ...draft, name: " Physics\t1 " },
      services,
      services[0].id,
    ).error,
    /already exists/,
  );
  const result = validateService(
    { ...services[0], name: " Calculus   1 ", rate: "400.00" },
    services,
    services[0].id,
  );
  assert.equal(result.error, "");
  assert.equal(result.values.name, "Calculus 1");
  assert.equal(result.values.rate, 400);
});

test("missing and suspended services reject edits even if incoming status is changed", () => {
  const suspended = services.find((service) => service.status === "Suspended");
  assert.match(
    validateService({ ...draft, status: "Active" }, services, suspended.id)
      .error,
    /Suspended services cannot be edited/,
  );
  assert.match(
    validateService(draft, services, "deleted-service").error,
    /no longer exists/,
  );
  const inactive = { ...services[0], status: "Inactive" };
  assert.equal(validateService(inactive, [inactive], inactive.id).error, "");
});

test("validated edits preserve identity, status, and performance when merged", () => {
  const existing = services[0];
  const original = structuredClone(existing);
  const result = validateService(
    {
      ...draft,
      id: "forged-id",
      status: "Suspended",
      rating: 5,
      completed: 999,
      arbitrary: "must not be saved",
    },
    services,
    existing.id,
  );
  assert.equal(result.error, "");
  assert.deepEqual(result.values, { ...draft, rate: 350.5 });
  const saved = { ...existing, ...result.values };
  for (const key of ["id", "status", "rating", "completed"]) {
    assert.equal(saved[key], original[key]);
  }
  assert.deepEqual(existing, original);
});
