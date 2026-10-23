import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapPolicy,
  validatePolicy,
  saveAdminPolicy,
} from "../src/services/adminPolicies.js";

const policy = {
  policyId: 1,
  title: " Student policy ",
  category: "Conduct",
  version: "v1.0",
  owner: "OSAS",
  status: "Active",
  effective: "2026-01-01",
  content: "## Purpose\n\nPolicy text.",
  documentPath: "",
  updatedAt: "2026-10-23T01:00:00Z",
};
test("maps database policy text, status and concurrency timestamp", () => {
  const row = mapPolicy({
    policy_id: 1,
    title: "Example",
    status: "draft",
    updated_at: policy.updatedAt,
    content: "Example content",
  });
  assert.equal(row.status, "Draft");
  assert.equal(row.content, "Example content");
  assert.equal(row.updatedAt, policy.updatedAt);
});
test("requires policy content and an effective date for active documents", () => {
  validatePolicy(policy);
  assert.throws(() => validatePolicy({ ...policy, content: " " }));
  assert.throws(() => validatePolicy({ ...policy, effective: "" }));
  assert.throws(() =>
    validatePolicy({ ...policy, documentPath: "javascript:alert(1)" }),
  );
  validatePolicy({ ...policy, status: "Draft", effective: "" });
});
test("sends changes through the Admin RPC with the original timestamp", async () => {
  let call;
  const result = await saveAdminPolicy(policy, {
    rpc: async (...args) => {
      call = args;
      return { data: 1 };
    },
  });
  assert.equal(result, 1);
  assert.equal(call[0], "save_admin_policy");
  assert.equal(call[1].p_id, 1);
  assert.equal(call[1].p_expected, policy.updatedAt);
  assert.equal(call[1].p_value.title, "Student policy");
  assert.equal(call[1].p_value.status, "active");
});
test("surfaces rejected saves without pretending success", async () => {
  await assert.rejects(
    () =>
      saveAdminPolicy(policy, {
        rpc: async () => ({ error: { message: "Policy changed" } }),
      }),
    /Policy changed/,
  );
});
