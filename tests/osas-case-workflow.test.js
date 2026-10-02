import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
test("case workflow preserves evidence boundaries and requires a supported decision", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  try {
    const { caseTransition } = await server.ssrLoadModule(
      "/src/components/osas/CaseWorkflow.jsx",
    );
    const record = {
      caseId: "C1",
      status: "Under Review",
      reporter: "Reporter",
      student: "Student",
      history: [],
    };
    assert.throws(
      () => caseTransition(record, "decision", {}),
      /Pending Decision/,
    );
    const requested = caseTransition(record, "request", {
      recipient: "Reporter",
      notes: "Full message thread is required.",
      due: "2026-10-15",
    });
    assert.equal(requested.status, "Awaiting Evidence");
    assert.equal(record.history.length, 0);
    const pending = caseTransition(requested, "pending");
    assert.throws(
      () =>
        caseTransition(pending, "decision", {
          outcome: "No Violation",
          notes: "short",
          basis: "Policy",
          ack: true,
        }),
      /Complete/,
    );
    const decision = caseTransition(pending, "decision", {
      outcome: "No Violation",
      notes: "Reviewed all available records and documented statements.",
      basis: "Policy reference",
      ack: true,
      hasCondition: true,
      condition: "Attend counseling",
      due: "2026-10-20",
    });
    assert.equal(decision.status, "Resolved");
    assert.equal(decision.decision.conditionDone, false);
    const completed = caseTransition(decision, "condition");
    assert.equal(completed.decision.conditionDone, true);
    assert.equal(completed.history.length, 4);
    assert.throws(() => caseTransition(completed, "condition"), /No pending/);
    assert.throws(
      () => caseTransition({ ...record, archived: true }, "pending"),
      /read-only/,
    );
  } finally {
    await server.close();
  }
});
