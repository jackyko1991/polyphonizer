import { test } from "node:test";
import assert from "node:assert/strict";
import { keyTurn, pageSize, pagesPerView, turn, viewOf } from "../src/engine/reader.ts";

const A4 = 210 / 297;

test("a landscape screen shows two A4 pages, a portrait one (or a narrow window) one; each is as large as fits", () => {
  assert.equal(pagesPerView(1920, 1000, A4), 2);
  assert.equal(pagesPerView(1000, 1300, A4), 1);
  const two = pageSize(1920, 1000, A4, 2);
  assert.equal(two.h, 1000);
  assert.ok(two.w * 2 + 16 <= 1920);
  const one = pageSize(800, 1300, A4, 1);
  assert.equal(one.w, 800);
  assert.ok(one.h <= 1300);
});

test("turning moves by whole views and stays inside the score", () => {
  assert.equal(turn(0, 1, 2, 5), 2);
  assert.equal(turn(2, 1, 2, 5), 4);
  assert.equal(turn(4, 1, 2, 5), 4); // the last view (page 5 alone)
  assert.equal(turn(4, -1, 2, 5), 2);
  assert.equal(turn(0, -1, 2, 5), 0);
  assert.equal(turn(3, 1, 1, 4), 3);
  assert.equal(viewOf(3, 2), 2); // playback on page 4 shows pages 3–4
});

test("page-turn keys: arrows, Page Up/Down (pedals), Space, Enter, Home and End", () => {
  assert.equal(keyTurn("PageDown"), 1);
  assert.equal(keyTurn("ArrowLeft"), -1);
  assert.equal(keyTurn(" "), 1);
  assert.equal(keyTurn("End"), "last");
  assert.equal(keyTurn("a"), null);
});
