import test from "node:test";
import assert from "node:assert/strict";
import {
  matchesRating,
  matchesPrice,
  ratingOptions as ratings,
  priceOptions as prices,
} from "../src/services/tutorFilters.js";
test("rating bands cover boundaries without including unrated tutors", () => {
  for (const [value, band] of [
    [5, 1],
    [4.5, 1],
    [4.49, 2],
    [4, 2],
    [3.99, 3],
    [3.5, 3],
    [3.49, 4],
    [3, 4],
    [2.99, 5],
  ]) {
    assert.equal(matchesRating(value, ratings[band]), true);
    for (let other = 1; other < ratings.length; other++)
      if (other !== band)
        assert.equal(matchesRating(value, ratings[other]), false);
  }
  for (const value of [null, 0, undefined, NaN]) {
    assert.equal(matchesRating(value, ratings[0]), true);
    for (const band of ratings.slice(1))
      assert.equal(matchesRating(value, band), false);
  }
});
test("peso price ranges include correct limits", () => {
  for (const [value, band] of [
    [0, 1],
    [149.99, 1],
    [150, 2],
    [199.99, 2],
    [200, 3],
    [250, 3],
  ]) {
    assert.equal(matchesPrice(value, prices[band]), true);
    for (let other = 1; other < prices.length; other++)
      if (other !== band)
        assert.equal(matchesPrice(value, prices[other]), false);
  }
  assert.equal(matchesPrice(250.01, prices[3]), false);
  assert.equal(matchesPrice(500, prices[0]), true);
});
