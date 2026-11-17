import { test } from "node:test";
import assert from "node:assert/strict";
import { fitBox, resizeBox } from "../src/tools/floatingWindow.ts";

const min = { w: 320, h: 260 };

test("resizing from the right or bottom grows the window; from the left or top it moves too", () => {
  const s = { x: 500, y: 100, w: 400, h: 500 };
  assert.deepEqual(resizeBox(s, { r: true, b: true }, 50, 20, min), { x: 500, y: 100, w: 450, h: 520 });
  assert.deepEqual(resizeBox(s, { l: true }, -100, 0, min), { x: 400, y: 100, w: 500, h: 500 });
  assert.deepEqual(resizeBox(s, { t: true, l: true }, 30, 40, min), { x: 530, y: 140, w: 370, h: 460 });
});

test("a resize stops at the minimum size without pushing the far edge", () => {
  const s = { x: 500, y: 100, w: 400, h: 500 };
  const b = resizeBox(s, { l: true, t: true }, 300, 400, min);
  assert.deepEqual(b, { x: 580, y: 340, w: 320, h: 260 });
  assert.equal(b.x + b.w, s.x + s.w);
  assert.equal(b.y + b.h, s.y + s.h);
});

test("a window is kept on screen and no bigger than it", () => {
  assert.deepEqual(fitBox({ x: 1400, y: -50, w: 400, h: 500 }, 1512, 766, min), { x: 1104, y: 8, w: 400, h: 500 });
  assert.deepEqual(fitBox({ x: 0, y: 0, w: 3000, h: 3000 }, 1000, 700, min), { x: 8, y: 8, w: 984, h: 684 });
});
