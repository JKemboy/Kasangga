import test from "node:test";
import assert from "node:assert/strict";
import {
  loadAuthAccount,
  accountHome,
  workspaceProfile,
} from "../src/services/authAccount.js";

function client(profile, roles, error = null) {
  const filters = [];
  return {
    filters,
    from(table) {
      const result = { data: table === "users" ? profile : roles, error };
      return {
        select() {
          return this;
        },
        eq(key, value) {
          filters.push([table, key, value]);
          return this;
        },
        maybeSingle: async () => result,
        then(resolve, reject) {
          return Promise.resolve(result).then(resolve, reject);
        },
      };
    },
  };
}
test("account lookup scopes profile and active roles to the authenticated user", async () => {
  const api = client({ user_id: "u1", account_status: "active" }, [
    { role: "tutor" },
    { role: "invented" },
  ]);
  assert.deepEqual((await loadAuthAccount(api, "u1")).roles, ["tutor"]);
  assert.deepEqual(api.filters, [
    ["users", "user_id", "u1"],
    ["user_roles", "user_id", "u1"],
    ["user_roles", "is_active", true],
  ]);
});
test("missing or restricted profiles, absent roles and query errors fail closed", async () => {
  for (const api of [
    client(null, []),
    client({ account_status: "suspended" }, [{ role: "tutor" }]),
    client({ account_status: "active" }, []),
    client({ account_status: "active" }, [{ role: "admin" }], {
      message: "denied",
    }),
  ])
    await assert.rejects(loadAuthAccount(api, "u1"));
});
test("role routing and display identity use loaded account data", () => {
  assert.equal(accountHome(["learner", "tutor"]), "/tutor-dashboard");
  assert.equal(accountHome(["learner"]), "/learner-dashboard");
  assert.equal(accountHome([]), "/login");
  assert.equal(
    workspaceProfile(
      { first_name: "Test", last_name: "User" },
      { email: "test@example.com" },
    ).name,
    "Test User",
  );
});
