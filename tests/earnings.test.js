import test from "node:test";
import assert from "node:assert/strict";
import {
  sessionAllocation,
  summarizeEarnings,
} from "../src/components/tutor/workspace/earnings.js";
import { allocation, seed } from "./fixtures/tutorData.js";

const earned = (amount) => ({ status: "Completed", payment: "Paid", amount });
const cents = (amount) => Math.round(amount * 100);
const zero = { gross: 0, tutor: 0, osas: 0, platform: 0 };

test("seed earnings and the existing allocation API keep their established totals", () => {
  const expected = {
    count: 24,
    gross: 10350,
    tutor: 9315,
    osas: 517.5,
    platform: 517.5,
  };
  assert.deepEqual(summarizeEarnings(seed.sessions), expected);
  assert.deepEqual(allocation(seed.sessions), expected);
});

test("only completed paid sessions earn shares and contribute to the summary", () => {
  const excluded = [
    { status: "Completed", payment: "Unpaid", amount: 525 },
    { status: "Completed", payment: "Refunded", amount: 525 },
    { status: "Confirmed", payment: "Paid", amount: 525 },
    { status: "Pending", payment: "Paid", amount: 525 },
    { status: "Cancelled", payment: "Paid", amount: 525 },
  ];
  for (const session of excluded) {
    assert.deepEqual(sessionAllocation(session), { ...zero, gross: 525 });
  }
  assert.deepEqual(summarizeEarnings(excluded), { count: 0, ...zero });
  assert.deepEqual(summarizeEarnings([...excluded, earned(525)]), {
    count: 1,
    gross: 525,
    tutor: 472.5,
    osas: 26.25,
    platform: 26.25,
  });
});

test("largest remainders receive leftover cents with deterministic recipient ties", () => {
  assert.deepEqual(sessionAllocation(earned(1.01)), {
    gross: 1.01,
    tutor: 0.91,
    osas: 0.05,
    platform: 0.05,
  });
  assert.deepEqual(sessionAllocation(earned(1.11)), {
    gross: 1.11,
    tutor: 1,
    osas: 0.06,
    platform: 0.05,
  });
  assert.deepEqual(sessionAllocation(earned(0.1)), {
    gross: 0.1,
    tutor: 0.09,
    osas: 0.01,
    platform: 0,
  });
  assert.deepEqual(sessionAllocation(earned(0.15)), {
    gross: 0.15,
    tutor: 0.13,
    osas: 0.01,
    platform: 0.01,
  });
});

test("every cent remainder conserves gross and each share stays within a cent of its percentage", () => {
  for (let totalCents = 0; totalCents <= 2000; totalCents++) {
    const row = sessionAllocation(earned(totalCents / 100));
    const shares = [row.tutor, row.osas, row.platform].map(cents);
    assert.equal(
      shares.reduce((sum, share) => sum + share, 0),
      totalCents,
    );
    for (const [index, percentage] of [0.9, 0.05, 0.05].entries()) {
      assert.ok(Math.abs(shares[index] - totalCents * percentage) < 1);
    }
  }
});

test("summary adds row allocations instead of redistributing the combined gross", () => {
  const rows = [earned(0.1), earned(0.1), earned(1.11), earned(3.87)];
  const snapshot = structuredClone(rows);
  const summary = summarizeEarnings(rows);
  for (const key of ["gross", "tutor", "osas", "platform"]) {
    const expectedCents = rows.reduce(
      (sum, session) => sum + cents(sessionAllocation(session)[key]),
      0,
    );
    assert.equal(cents(summary[key]), expectedCents);
  }
  assert.equal(summary.count, rows.length);
  assert.equal(
    cents(summary.tutor) + cents(summary.osas) + cents(summary.platform),
    cents(summary.gross),
  );
  assert.deepEqual(summarizeEarnings([earned(0.1), earned(0.1)]), {
    count: 2,
    gross: 0.2,
    tutor: 0.18,
    osas: 0.02,
    platform: 0,
  });
  assert.deepEqual(rows, snapshot);
});

test("decimal amounts round half up to cents before allocating", () => {
  for (const [amount, expected] of [
    [1.005, 1.01],
    [2.675, 2.68],
    [" 350.125 ", 350.13],
    ["525.00", 525],
    [0.004, 0],
    [0.005, 0.01],
    [1e-7, 0],
    ["1e2", 100],
    [10000.005, 10000.01],
  ]) {
    const row = sessionAllocation(earned(amount));
    assert.equal(row.gross, expected, `Amount: ${amount}`);
    assert.equal(
      cents(row.tutor) + cents(row.osas) + cents(row.platform),
      cents(expected),
    );
  }
});

test("invalid amounts are neutralized without NaN or negative earnings", () => {
  const invalid = [
    NaN,
    Infinity,
    -Infinity,
    -0.01,
    "-525",
    "not a number",
    "₱525.00",
    "0x10",
    null,
    undefined,
    "",
    " ",
    {},
    [],
    true,
    1e100,
  ];
  for (const amount of invalid) {
    assert.deepEqual(sessionAllocation(earned(amount)), zero);
  }
  assert.deepEqual(summarizeEarnings(invalid.map(earned)), {
    count: invalid.length,
    ...zero,
  });
  assert.deepEqual(sessionAllocation(undefined), zero);
  assert.deepEqual(summarizeEarnings([null, undefined]), { count: 0, ...zero });
  assert.deepEqual(summarizeEarnings(), { count: 0, ...zero });
});
