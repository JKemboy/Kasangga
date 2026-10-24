import test from "node:test";
import assert from "node:assert/strict";
import {
  completionFormHtml,
  reportActivity,
  reportNotice,
  reportStage,
  reportSteps,
  refundSummary,
} from "../src/services/myReportPresentation.js";
import { listMyReports } from "../src/services/myReports.js";

test("filed report stages follow actual Admin/referral/completion records", () => {
  assert.equal(
    reportStage({
      report_status: "submitted",
      osas_referral_status: "not_referred",
    }),
    "Admin Review",
  );
  assert.equal(
    reportStage({
      report_status: "under_review",
      osas_referral_status: "referred",
    }),
    "OSLD Review",
  );
  assert.equal(reportStage({ case: { resolved: true } }), "Resolved");
  assert.equal(
    reportStage({
      report_status: "resolved",
      osas_referral_status: "closed_no_case",
    }),
    "Resolved",
  );
});
test("only an actual active hold displays Clearance Blocked", () => {
  const pending = {
    case_status: "pending_completion",
    decision: {
      condition: "Submit signed acknowledgement",
      condition_done: false,
    },
  };
  assert.equal(reportStage(pending, true), "Awaiting Completion");
  assert.equal(
    reportStage({ ...pending, holds: [{ status: "active" }] }, true),
    "Clearance Blocked",
  );
  assert.equal(
    reportStage(
      { case_status: "resolved", holds: [{ status: "released" }] },
      true,
    ),
    "Resolved",
  );
});
test("reporter-facing outcome notice contains no other student's sanction", () => {
  const notice = reportNotice({
    report_status: "resolved",
    case: { resolved: true },
    decision: { outcome: "Written Warning" },
  });
  assert.ok(!notice.includes("Written Warning"));
  assert.ok(notice.includes("confidential"));
});
test("Admin-only reports have three steps and no OSLD phase", () => {
  assert.deepEqual(reportSteps({ osas_referral_status: "not_referred" }), [
    "Submitted",
    "Admin Review",
    "Resolved",
  ]);
  assert.deepEqual(reportSteps({ osas_referral_status: "referred" }), [
    "Submitted",
    "Admin Review",
    "Referred to OSLD",
    "OSLD Review",
    "Resolved",
  ]);
  assert.ok(
    reportNotice({
      report_status: "resolved",
      osas_referral_status: "not_referred",
    }).includes("Resolved by Kasangga Admin"),
  );
});
test("refund approval is never presented as confirmed payment delivery", () => {
  const message = refundSummary({
    refund: { status: "approved", confirmed: false },
  });
  assert.ok(message.includes("not yet confirmed"));
  assert.ok(!message.includes("sent"));
});
test("referred reports distinguish waiting for assessment from an opened case", () => {
  const referred = {
    osas_referral_status: "referred",
    referred_at: "2026-10-24T08:00:00Z",
  };
  assert.equal(reportSteps(referred).length, 5);
  assert.ok(reportNotice(referred).includes("awaiting OSLD assessment"));
  const opened = {
    ...referred,
    case: { case_id: 17, opened_at: "2026-10-25T08:00:00Z" },
  };
  assert.ok(reportNotice(opened).includes("OSLD is reviewing this case"));
  assert.ok(reportNotice(opened).includes("other student are kept private"));
  assert.ok(
    reportActivity(opened).some(
      (event) => event.title === "OSLD opened CASE-17 for review",
    ),
  );
});
test("confirmed GCash refunds appear with their actual processing date", () => {
  const report = {
    refund: {
      confirmed: true,
      full: true,
      method: "gcash",
      processed_at: "2026-10-24T09:00:00Z",
    },
  };
  assert.equal(refundSummary(report), "Full refund sent to your GCash.");
  const events = reportActivity(report);
  assert.equal(events[0].at, report.refund.processed_at);
  assert.equal(events[0].title, "Full refund sent to your GCash");
});
test("activity contains recorded dates and generic public action labels only", () => {
  const events = reportActivity(
    {
      opened_at: "2026-10-20T08:00:00Z",
      activity: [
        {
          type: "decision",
          at: "2026-10-21T08:00:00Z",
          private_notes: "Private staff note",
        },
      ],
    },
    true,
  );
  assert.equal(events.length, 2);
  assert.equal(events[1].title, "Decision recorded");
  assert.ok(!JSON.stringify(events).includes("Private staff note"));
});
test("completion form escapes case data and never claims submission", () => {
  const html = completionFormHtml(
    {
      case_id: 7,
      incident_type: "<script>alert(1)</script>",
      decision: {
        outcome: "Own decision",
        condition: "Submit acknowledgement",
        condition_done: false,
      },
    },
    { name: "Student & Name", student_id: "2026-001" },
  );
  assert.ok(html.includes("CASE-7"));
  assert.ok(html.includes("Student &amp; Name"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("Pending OSLD verification"));
  assert.ok(html.includes("does not mark any condition completed"));
  assert.throws(
    () => completionFormHtml({ case_id: 7 }),
    /No recorded decision/,
  );
});
test("report snapshot propagates server access failures", async () => {
  await assert.rejects(
    listMyReports({
      rpc: async () => ({ error: new Error("Not authorized") }),
    }),
    /Not authorized/,
  );
  const snapshot = await listMyReports({
    rpc: async (name) => {
      assert.equal(name, "my_reports_snapshot");
      return {
        data: { created: [{ report_id: 1 }], received: [] },
        error: null,
      };
    },
  });
  assert.equal(snapshot.created.length, 1);
  assert.deepEqual(snapshot.received, []);
});
