import assert from "node:assert/strict";
import test from "node:test";
import { calculateUnionArea } from "../src/geometry.js";

test("returns zero for no boxes", () => {
  assert.equal(calculateUnionArea([]), 0);
});

test("adds non-overlapping normalized boxes", () => {
  const area = calculateUnionArea([
    [0, 0, 0.25, 0.4],
    [0.5, 0.5, 1, 1],
  ]);
  assert.equal(area, 0.35);
});

test("counts overlapping pixels only once", () => {
  const area = calculateUnionArea([
    [0, 0, 0.75, 0.75],
    [0.25, 0.25, 1, 1],
  ]);
  assert.equal(area, 0.875);
});

test("normalizes reversed and out-of-page coordinates", () => {
  assert.equal(calculateUnionArea([[1.2, 1.2, -0.2, -0.2]]), 1);
});
