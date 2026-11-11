import assert from "node:assert/strict";
import { join } from "node:path";
import {
  actionDefaultConditions,
  actionConditionTemplates,
  COMPLETION_INSTRUCTION,
} from "../src/services/osweDecisionRules.js";
// Browser-only transport fixtures. SQL regression exercises the real transactional RPCs separately.
export function caseBrowserFixture(snapshot, officer) {
  const db = structuredClone(snapshot);
  const reporter = "11111111-1111-4111-8111-111111111111",
    student = "22222222-2222-4222-8222-222222222222";
  db.users = [
    { user_id: officer, name: "OSWE Test Officer" },
    {
      user_id: reporter,
      name: "Reporter Fixture",
      student_id: "2023-00001",
      college: "CEGS",
      program: "BS Engineering",
      csu_email: "reporter@example.test",
      phone_number: "09000000001",
    },
    {
      user_id: student,
      name: "Respondent Fixture",
      student_id: "2023-00002",
      college: "CCIS",
      program: "BS Computer Science",
      csu_email: "respondent@example.test",
      phone_number: "09000000002",
    },
  ];
  db.cases = [];
  db.case_actions = [];
  db.case_decisions = [];
  db.evidence_validations = [];
  db.clearance_holds = [];
  db.clearance_reviews = [];
  db.notifications = [];
  db.incident_reports = [900001, 900002, 900003].map((id) => ({
    report_id: id,
    booking_id: id,
    reported_by: reporter,
    reported_against: student,
    incident_type: "Privacy or Consent Violation",
    incident_category: "Student Handbook Violation",
    description:
      "Original incident description from the reporting workflow. Browser test fixture only.",
    priority: "high",
    report_status: "screened",
    osas_referral_status: "referred",
    submitted_at: "2026-11-11T08:00:00Z",
    referred_at: "2026-11-11T09:00:00Z",
  }));
  db.incident_evidence = db.incident_reports.flatMap((r) =>
    [0, 1].map((i) => ({
      evidence_id: r.report_id * 10 + i,
      report_id: r.report_id,
      submitted_by: reporter,
      evidence_type: "image/png",
      file_name: i ? "session-proof.png" : "submitted-image.png",
      file_path: `fixture/${r.report_id}/${i}.png`,
      storage_bucket: i ? "session-completion-proofs" : "incident-evidence",
      source_booking_id: i ? r.booking_id : null,
      validation_status: "pending",
      uploaded_at: "2026-11-11T08:00:00Z",
    })),
  );
  db.case_sessions = db.incident_reports.map((r) => ({
    booking_id: r.booking_id,
    title: "Database Systems",
    date: "2026-11-10",
    start: "08:00:00",
    end: "09:00:00",
    type: "online",
    platform: "Google Meet",
  }));
  let failValidation = false,
    verifiedSuggestion = false;
  const mappings = [];
  function rpc(name, args) {
    if (name === "save_oswe_occurrence_mapping") {
      const existing = mappings.find(
        (r) =>
          r.incident_type === args.p_type && r.occurrence === args.p_occurrence,
      );
      if (existing)
        Object.assign(existing, {
          suggested_action: args.p_action,
          handbook_basis: args.p_basis,
          official_excerpt: args.p_excerpt,
          active: !!args.p_action,
        });
      else
        mappings.push({
          incident_type: args.p_type,
          occurrence: args.p_occurrence,
          suggested_action: args.p_action,
          handbook_basis: args.p_basis,
          official_excerpt: args.p_excerpt,
          active: !!args.p_action,
        });
      return { data: null };
    }
    if (name === "oswe_case_review_snapshot") return { data: db };
    if (name === "oswe_start_case_review") {
      const r = db.incident_reports.find(
        (r) => r.report_id === args.p_report_id,
      );
      if (!db.cases.some((c) => c.report_id === r.report_id))
        db.cases.push({
          case_id: r.report_id,
          report_id: r.report_id,
          case_type: r.incident_type,
          priority: r.priority,
          case_status: "under_review",
          assigned_osas_id: officer,
          opened_at: "2026-11-11T10:00:00Z",
        });
      r.osas_referral_status = "case_opened";
      return { data: r.report_id };
    }
    if (name === "oswe_case_review_context") {
      const action = verifiedSuggestion ? "Written Warning" : null;
      const source = action
        ? {
            kind: "policy",
            sourceId: 900099,
            title: "Verified browser-only policy fixture",
            version: "v2",
            section: "Fixture.1",
            excerpt:
              "Explicit synthetic policy fixture for this case; never stored live.",
            action,
            criteria: { description_all: ["incident description"] },
          }
        : null;
      return {
        data: {
          history: {
            previousCount: action ? 2 : 0,
            suggestedAction: action,
            records: [],
          },
          defaults: actionDefaultConditions,
          editableDefaults: actionConditionTemplates,
          completionInstruction: COMPLETION_INSTRUCTION,
          recommendation: {
            status: action ? "supported" : "unavailable",
            action,
            winningSource: source,
            matches: source ? [source] : [],
            relatedSources: [],
            reason: action
              ? "The approved fixture provision explicitly supports this action."
              : "No current verified provision supports an action for the recorded facts.",
            facts: {
              previousConfirmedSameType: action ? 2 : 0,
              currentOrdinal: action ? 3 : 1,
              totalEvidenceCount: 2,
              reviewedEvidenceCount: 2,
              validatedEvidenceCount: 1,
            },
            fingerprint: "browser-only-fixture",
            precedence: "Matched provisions agree",
          },
        },
      };
    }
    if (name === "oswe_validate_case_evidence") {
      if (failValidation) {
        failValidation = false;
        return {
          data: { message: "Verification write failed; retry." },
          status: 403,
        };
      }
      db.incident_evidence.find(
        (e) => e.evidence_id === args.p_evidence_id,
      ).validation_status = args.p_result;
      return { data: null };
    }
    if (
      name === "oswe_record_decision_and_hold" ||
      name === "oswe_record_no_violation"
    ) {
      const c = db.cases.find((c) => c.report_id === args.p_report_id),
        nv = name.endsWith("no_violation");
      const decision = nv
        ? {
            outcome: "No Violation",
            notes: args.p_notes,
            finding: "not_substantiated",
          }
        : {
            ...args.p_decision,
            workflow: "clearance_handoff",
            conditionDone: false,
            conditionTrackingVersion: 2,
          };
      db.case_decisions.push({
        case_id: c.case_id,
        decision_id: c.case_id,
        decision_type: decision.outcome,
        decision_details: JSON.stringify(decision),
        decided_by: officer,
        decision_date: "2026-11-11",
      });
      c.case_status = nv ? "archived" : "resolved";
      c.resolved_at = "2026-11-11T10:00:00Z";
      if (nv) c.archived_at = c.resolved_at;
      else {
        decision.conditions = decision.conditions.map((condition) => ({
          ...condition,
          completed: false,
        }));
        db.case_decisions.at(-1).decision_details = JSON.stringify(decision);
        db.clearance_reviews = [
          {
            clearance_review_id: 900010,
            user_id: student,
            academic_year: "Case follow-up",
            semester: "Case follow-up",
            clearance_status: "on_hold",
            requested_at: "2026-11-11T10:00:00Z",
          },
        ];
        db.clearance_holds.push({
          hold_id: c.case_id,
          case_id: c.case_id,
          clearance_review_id: 900010,
          hold_status: "active",
        });
      }
      return { data: nv ? c.case_id : 900010 };
    }
    if (name === "oswe_verify_case_condition") {
      const row = db.case_decisions.find((d) => d.case_id === args.p_case_id),
        d = JSON.parse(row.decision_details);
      d.conditions[args.p_index].completed = args.p_completed;
      d.conditions[args.p_index].completedAt = "2026-11-11T10:00:00Z";
      if (d.conditions[args.p_index].text === COMPLETION_INSTRUCTION)
        d.completionForm = {
          delivery: "in_person",
          verifiedAt: "2026-11-11T10:00:00Z",
        };
      row.decision_details = JSON.stringify(d);
      return { data: null };
    }
    if (name === "oswe_review_student_clearance") {
      db.clearance_reviews[0].clearance_status = "cleared";
      db.clearance_holds.forEach((h) => {
        h.hold_status = "released";
      });
      db.case_decisions.forEach((r) => {
        const d = JSON.parse(r.decision_details);
        if (d.workflow) {
          d.conditionDone = true;
          r.decision_details = JSON.stringify(d);
        }
      });
      return { data: null };
    }
    return null;
  }
  return {
    rpc,
    db,
    mappings,
    enableVerifiedSuggestion: () => {
      verifiedSuggestion = true;
    },
    rejectNextValidation: () => {
      failValidation = true;
    },
  };
}
export async function checkCaseBrowser(page, fixture, root, base) {
  const flow = () => page.locator(".case-review-flow");
  const evidence = () => page.locator(".review-evidence-item");
  const shot = async (name) => {
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: join(root, `oswe-case-${name}.png`),
      fullPage: true,
    });
  };
  const fits = async () =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Case layout overflows viewport",
    );
  await page.setViewportSize({ width: 1640, height: 1000 });
  await page.locator(".case-list-card").first().waitFor();
  assert.equal(
    await page.getByRole("tab", { name: /To Review/ }).innerText(),
    "To Review3",
  );
  await shot("list-desktop");
  await page
    .getByRole("button", { name: "Open Case", exact: true })
    .first()
    .click();
  await flow().getByText("Reporter Fixture", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Valid", exact: true })
    .first()
    .waitFor({ state: "visible" });
  await page.waitForFunction(
    () => !document.querySelector(".case-validation-toggle button").disabled,
  );
  assert.ok(
    await page
      .getByRole("button", { name: "Proceed to Case Action", exact: true })
      .isDisabled(),
  );
  await page
    .getByRole("button", { name: "Preview", exact: true })
    .first()
    .click();
  await page.getByAltText("submitted-image.png").waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector('img[alt="submitted-image.png"]')?.naturalWidth >
      0,
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  fixture.rejectNextValidation();
  await evidence()
    .nth(0)
    .getByRole("button", { name: "Valid", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Verification write failed" })
    .waitFor();
  assert.equal(
    await evidence()
      .nth(0)
      .getByRole("button", { name: "Valid", exact: true })
      .getAttribute("aria-pressed"),
    "false",
  );
  await evidence()
    .nth(0)
    .getByRole("button", { name: "Valid", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document
        .querySelector(".case-validation-toggle button")
        .getAttribute("aria-pressed") === "true",
  );
  assert.ok(
    await page
      .getByRole("button", { name: "Proceed to Case Action", exact: true })
      .isDisabled(),
  );
  await evidence()
    .nth(1)
    .getByRole("button", { name: "Insufficient", exact: true })
    .click();
  await page.getByText("Evidence is valid.", { exact: true }).waitFor();
  await shot("evidence-desktop");
  for (const width of [900, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await fits();
    await shot(`evidence-${width}`);
  }
  await page.setViewportSize({ width: 1640, height: 1000 });
  await page
    .getByRole("button", { name: "Proceed to Case Action", exact: true })
    .click();
  await page
    .getByText("First recorded violation", {
      exact: true,
    })
    .waitFor();
  assert.equal(await flow().getByText("Suggested", { exact: true }).count(), 0);
  for (const action of Object.keys(actionDefaultConditions)) {
    await page.getByRole("radio", { name: new RegExp("^" + action) }).check();
    assert.equal(
      await page
        .getByRole("button", {
          name: "Record Decision (No Violation)",
          exact: true,
        })
        .count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("checkbox", {
          name: /After assessing the reviewed evidence/,
        })
        .count(),
      0,
    );
    for (const value of actionConditionTemplates[action]) {
      assert.ok(
        await page
          .locator(".case-condition-row input")
          .evaluateAll(
            (inputs, v) => inputs.some((i) => i.value === v && !i.readOnly),
            value,
          ),
      );
    }
    assert.ok(
      await page
        .locator(".case-condition-row input")
        .evaluateAll((inputs) =>
          inputs.some(
            (i) =>
              i.value === "Submit the completed OSWE Completion Form" &&
              i.readOnly,
          ),
        ),
    );
  }
  await page.getByRole("radio", { name: /^Counseled/ }).check();
  await page
    .getByRole("textbox", { name: "Condition 1", exact: true })
    .fill("Attend the OSWE-assessed Guidance Counselor evaluation");
  await page
    .getByRole("button", { name: "Add condition", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Condition 3", exact: true })
    .fill("Attend an additional documented follow-up session");
  await page.getByRole("radio", { name: /^Verbal Warning/ }).check();
  await page.getByRole("radio", { name: /^Counseled/ }).check();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Condition 3", exact: true })
      .inputValue(),
    "Attend an additional documented follow-up session",
  );
  await page
    .getByRole("button", { name: "Add condition", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove condition 4", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Basis for the decision *", exact: true })
    .fill(
      "OSWE reviewed the recorded evidence and manually assessed the applicable Terms provision and required conditions.",
    );
  await shot("decision-desktop");
  for (const width of [900, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await fits();
    await shot(`decision-${width}`);
  }
  await page.setViewportSize({ width: 1640, height: 1000 });
  await page
    .getByRole("button", {
      name: "Record Decision & Block Clearance",
      exact: true,
    })
    .click();
  await page.getByRole("checkbox", { name: /I confirm the violation/ }).check();
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: "Record Decision & Block Clearance",
      exact: true,
    })
    .click();
  await page
    .getByRole("heading", { name: /Student Clearance Review/ })
    .waitFor();
  assert.ok(
    page.url().includes("Student+Clearance+Review") ||
      decodeURIComponent(page.url()).includes("Student Clearance Review"),
  );
  const target = page.locator(".oswe-clearance-target");
  await target.waitFor();
  assert.match(await target.innerText(), /Respondent Fixture/);
  assert.match(await target.innerText(), /On Hold/);
  assert.equal(fixture.db.clearance_holds[0].hold_status, "active");
  await page.goto(base + "/oswe-dashboard?section=Case%20Review");
  await page.reload();
  await page.locator(".case-list-tabs").waitFor();
  await page.getByRole("tab", { name: /Decision Recorded/ }).click();
  await page
    .getByRole("button", { name: "View Decision", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: /To Review/ }).click();
  await page
    .getByRole("button", { name: "Open Case", exact: true })
    .first()
    .click();
  await page.waitForFunction(
    () => !document.querySelector(".case-validation-toggle button").disabled,
  );
  await evidence()
    .nth(0)
    .getByRole("button", { name: "Insufficient", exact: true })
    .click();
  await page.waitForFunction(
    () => !document.querySelector(".case-validation-toggle button").disabled,
  );
  await evidence()
    .nth(1)
    .getByRole("button", { name: "Insufficient", exact: true })
    .click();
  await page.getByText("Evidence is insufficient.", { exact: true }).waitFor();
  await page
    .getByRole("button", {
      name: "Record Decision (No Violation)",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Basis for the decision *", exact: true })
    .fill(
      "All available evidence was individually reviewed and does not substantiate a violation in this case.",
    );
  await page.getByRole("checkbox", { name: /I reviewed all evidence/ }).check();
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: "Record Decision (No Violation)",
      exact: true,
    })
    .click();
  await page.getByRole("tab", { name: /Decision Recorded/ }).waitFor();
  assert.match(
    await page.getByRole("tab", { name: /Decision Recorded/ }).innerText(),
    /2/,
  );
  assert.equal(fixture.db.case_decisions.length, 2);
  await page.goto(
    `${base}/oswe-dashboard?section=Student%20Clearance%20Review`,
  );
  await page
    .getByRole("button", { name: "Review Respondent Fixture", exact: true })
    .click();
  const clearance = page.getByRole("dialog", {
    name: "Student clearance review",
    exact: true,
  });
  await clearance.getByRole("button", { name: "Cleared", exact: true }).click();
  await clearance
    .getByRole("textbox", { name: "Review notes", exact: true })
    .fill("All physical requirements were reviewed by the OSWE test officer.");
  await clearance
    .getByRole("checkbox", { name: /I received the signed form/ })
    .check();
  assert.ok(
    await clearance
      .getByRole("button", { name: "Save Clearance Decision", exact: true })
      .isDisabled(),
  );
  await clearance
    .getByRole("textbox", { name: /Condition verification notes/ })
    .fill(
      "Verified the actual requirement and physical signed form in person.",
    );
  const checks = clearance.locator('section input[type="checkbox"]');
  assert.equal(await checks.count(), 4);
  for (let i = 0; i < 4; i++) {
    await checks.nth(i).click();
    await page.waitForFunction(
      (index) =>
        document.querySelectorAll('.clr-review section input[type="checkbox"]')[
          index
        ]?.checked,
      i,
    );
  }
  await clearance
    .getByRole("button", { name: "Save Clearance Decision", exact: true })
    .click();
  await clearance.waitFor({ state: "hidden" });
  assert.equal(fixture.db.clearance_reviews[0].clearance_status, "cleared");
  await page
    .getByRole("button", { name: "Review Respondent Fixture", exact: true })
    .click();
  await clearance
    .getByText("This clearance is already cleared. This review is read-only.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await clearance
      .getByRole("button", { name: "Save Clearance Decision", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await clearance
      .getByRole("button", { name: "Cleared", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await clearance
      .getByRole("textbox", { name: "Review notes", exact: true })
      .count(),
    0,
  );
  assert.ok(
    await clearance
      .locator('section input[type="checkbox"]')
      .evaluateAll((inputs) => inputs.every((input) => input.disabled)),
  );
  await clearance.getByRole("button", { name: "Close", exact: true }).click();
  fixture.enableVerifiedSuggestion();
  await page.goto(`${base}/oswe-dashboard?section=Case%20Review`);
  await page.getByRole("button", { name: "Open Case", exact: true }).click();
  await page.waitForFunction(
    () => !document.querySelector(".case-validation-toggle button").disabled,
  );
  for (let i = 0; i < 2; i++) {
    await evidence()
      .nth(i)
      .getByRole("button", { name: "Valid", exact: true })
      .click();
    await page.waitForFunction(
      () => !document.querySelector(".case-validation-toggle button").disabled,
    );
  }
  await page
    .getByRole("button", { name: "Proceed to Case Action", exact: true })
    .click();
  await flow().getByText("Suggested", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("radio")
      .evaluateAll((items) => items.filter((i) => i.checked).length),
    0,
    "Suggestion must not select an action automatically",
  );
  await page.getByRole("radio", { name: /^Counseled/ }).check();
  await page
    .getByRole("textbox", { name: "Basis for the decision *", exact: true })
    .fill(
      "A manual assessment of the valid evidence supports this alternative action for the fixture.",
    );
  await page
    .getByRole("button", {
      name: "Record Decision & Block Clearance",
      exact: true,
    })
    .click();
  assert.equal(
    await page.getByRole("dialog").count(),
    0,
    "Override without justification must not reach confirmation",
  );
  await page
    .getByRole("textbox", {
      name: "Reason for departing from the suggestion *",
      exact: true,
    })
    .fill(
      "The manually reviewed circumstances support counseling in this test fixture.",
    );
  await page
    .getByRole("button", {
      name: "Record Decision & Block Clearance",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  console.log(
    "PASS: Case cards, source previews, failed-write recovery, evidence gating, four manual actions, required/custom conditions, responsive layouts, confirmation, No Violation, refresh persistence, verified suggestion override and individual clearance verification.",
  );
}
