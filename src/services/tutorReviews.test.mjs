import assert from "node:assert/strict";
import test from "node:test";
import { listTutorReviews, getTutorCompletedSessions } from "./tutorReviews.js";
test("completed sessions are loaded independently of review counts", async () => {
  const count = await getTutorCompletedSessions(2, {
    rpc: async (name, args) => {
      assert.equal(name, "get_tutor_completed_sessions");
      assert.equal(args.p_tutor_profile_id, "2");
      return { data: "4", error: null };
    },
  });
  assert.equal(count, 4);
});
test("a failed session-count lookup cannot appear as zero", async () => {
  await assert.rejects(
    () =>
      getTutorCompletedSessions(2, {
        rpc: async () => ({ error: { code: "PGRST202" } }),
      }),
    /tutor_reviews.sql/,
  );
});
test("profile reviews include learner, stars, comment and average", async () => {
  const client = {
    rpc: async (name, args) => {
      assert.equal(name, "list_tutor_reviews");
      assert.equal(args.p_tutor_profile_id, "2");
      return {
        data: [
          {
            review_id: 1,
            learner_name: "Ana",
            rating: 5,
            review_text: "Helpful",
            reviewed_at: "2026-10-14T01:00:00Z",
            service_title: "Math",
            topic: "Limits",
          },
          { review_id: 2, rating: 3, reviewed_at: "2026-10-13T01:00:00Z" },
        ],
        error: null,
      };
    },
  };
  const result = await listTutorReviews(2, client);
  assert.equal(result.average, 4);
  assert.equal(result.count, 2);
  assert.equal(result.entries[0].text, "Helpful");
  assert.equal(result.entries[0].name, "Ana");
});
test("an empty result is an unrated profile", async () => {
  const result = await listTutorReviews(2, {
    rpc: async () => ({ data: [], error: null }),
  });
  assert.equal(result.count, 0);
  assert.equal(result.average, 0);
});
test("a query failure is reported instead of an empty review list", async () => {
  await assert.rejects(
    () =>
      listTutorReviews(2, {
        rpc: async () => ({ error: { code: "PGRST202" } }),
      }),
    /tutor_reviews.sql/,
  );
});
