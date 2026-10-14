import assert from "node:assert/strict";
import test from "node:test";
import { listLearnerReviews, saveLearnerReview } from "./learnerReviews.js";
import { mapLearnerSession } from "./learnerSessions.js";
const review = {
  rating_id: 7,
  booking_id: 12,
  rating_score: 5,
  comment: "Helpful tutor",
  rated_at: "2026-10-14T01:00:00Z",
  is_visible: true,
};
test("saved reviews reload with the same booking identity", async () => {
  const client = { rpc: async () => ({ data: [review], error: null }) };
  const rows = await listLearnerReviews(client);
  assert.equal(rows[0].sessionId, "12");
  assert.equal(rows[0].rating, 5);
});
test("review submission forwards the booking and preserves server errors", async () => {
  const client = {
    rpc: async (name, args) => {
      assert.equal(name, "save_my_learner_review");
      assert.equal(args.p_booking_id, 12);
      assert.equal(args.p_rating, 5);
      return { data: review, error: null };
    },
  };
  assert.equal(
    (
      await saveLearnerReview(
        "12",
        { rating: 5, text: "Helpful tutor" },
        client,
      )
    ).sessionId,
    "12",
  );
  await assert.rejects(
    () =>
      saveLearnerReview(
        "12",
        { rating: 5, text: "Helpful tutor" },
        {
          rpc: async () => ({ error: { message: "Session is not completed" } }),
        },
      ),
    /not completed/,
  );
});
test("a past confirmed booking does not become completed until marked done", () => {
  const row = {
    booking_id: 12,
    tutor_name: "Tutor",
    booking_status: "confirmed",
    payment_status: "paid",
    session_date: "2020-01-01",
    start_time: "09:00:00",
    end_time: "10:00:00",
    duration: 1,
    amount: 450,
    rate_per_hour: 450,
  };
  assert.notEqual(mapLearnerSession(row).lifecycle, "Completed");
  assert.equal(
    mapLearnerSession({ ...row, booking_status: "completed" }).lifecycle,
    "Completed",
  );
});
