import test from "node:test";
import assert from "node:assert/strict";
import {
  tutoringError,
  documentsError,
  applicationError,
  documentSlots,
  applicationDocuments,
} from "../src/components/learner/application/applicationRules.js";
import {
  submitTutorApplication,
  loadMyTutorApplication,
} from "../src/services/tutorApplications.js";
const document = (name) => ({
  storagePath: "user/Applicant/" + name,
  name,
  type: "application/pdf",
});
const draft = {
  subjects: ["Custom Subject"],
  courseCode: "IT 101",
  courseDescription: "Introduction to Computing",
  gcashName: "Tutor Name",
  gcashNumber: "+639171234567",
  bio: "A student tutor with relevant academic experience.",
  motivation: "I want to help fellow students understand this subject.",
  documents: {
    enrollment: document("cor.pdf"),
    grades: document("grades.pdf"),
    awards_one: document("one.pdf"),
    awards_two: document("two.pdf"),
  },
  certified: true,
};
test("application accepts custom subjects without topics, levels, session type or CSU ID", () => {
  assert.equal(applicationError(draft), "");
  assert.equal(documentsError(draft.documents), "");
  assert.match(
    documentsError({ enrollment: draft.documents.enrollment }),
    /grade/,
  );
});
test("missing course and payout details have actionable warnings", () => {
  for (const key of [
    "courseCode",
    "courseDescription",
    "gcashName",
    "gcashNumber",
  ])
    assert.notEqual(tutoringError({ ...draft, [key]: "" }), "");
  for (const gcashNumber of ["+6391712345678", "09171234567", "+638171234567"])
    assert.match(tutoringError({ ...draft, gcashNumber }), /GCash number/);
  assert.match(tutoringError({ ...draft, subjects: [] }), /Add button/);
  assert.match(
    applicationError({ ...draft, certified: false }),
    /certification/,
  );
});
test("multiple awards remain distinct in document slots and RPC payload", () => {
  const awards = documentSlots(draft.documents).filter((slot) => slot.uploaded);
  assert.equal(awards.length, 2);
  assert.equal(new Set(awards.map((slot) => slot.id)).size, 2);
  const payload = applicationDocuments(draft.documents);
  assert.deepEqual(
    payload
      .filter((item) => item.document_type === "awards")
      .map((item) => item.file_name),
    ["one.pdf", "two.pdf"],
  );
  assert.equal(
    payload.some((item) => item.document_type === "studentId"),
    false,
  );
});
test("submission persists course payout and each award using the Supabase RPC", async () => {
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
    rpc: async (name, payload) => {
      assert.equal(name, "submit_tutor_application");
      assert.equal(payload.p_details.courseCode, draft.courseCode);
      assert.equal(payload.p_details.gcashNumber, draft.gcashNumber);
      assert.equal(payload.p_details.applicationVersion, 2);
      assert.equal(
        payload.p_documents.filter((item) => item.document_type === "awards")
          .length,
        2,
      );
      assert.equal("sessionType" in payload.p_details, false);
      assert.equal("topics" in payload.p_details, false);
      return { data: 7, error: null };
    },
  };
  assert.equal(
    (
      await submitTutorApplication(
        draft,
        { name: "Tutor" },
        "user",
        null,
        client,
      )
    ).id,
    "7",
  );
});
test("reloading from Supabase retains multiple award files and payout details", async () => {
  const row = {
    application_id: 7,
    user_id: "user",
    application_status: "pending",
    application_details: draft,
  };
  const docs = [1, 2].map((id) => ({
    document_id: id,
    document_type: "awards",
    file_path: "user/Applicant/" + id + ".pdf",
    file_name: id + ".pdf",
    mime_type: "application/pdf",
  }));
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
    from: (table) => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => ({ data: row, error: null }),
        in: async () => ({ data: docs, error: null }),
      };
      return builder;
    },
  };
  const saved = await loadMyTutorApplication("user", client);
  assert.equal(saved.gcashNumber, draft.gcashNumber);
  assert.equal(saved.courseDescription, draft.courseDescription);
  assert.equal(Object.keys(saved.documents).length, 2);
  assert.equal(saved.documents.awards_1.name, "1.pdf");
  assert.equal(saved.documents.awards_2.name, "2.pdf");
});
