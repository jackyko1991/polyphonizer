/**
 * The full-screen page reader: one page, or two side by side when they fit, always the whole page on screen (no
 * vertical scrolling); turning moves by a whole view, as on a music stand or a tablet with a page-turn pedal.
 */

/** how many pages fit side by side in a box, each as tall as the box allows */
export function pagesPerView(boxW: number, boxH: number, aspect: number, gap = 16): 1 | 2 {
  return boxW >= 2 * boxH * aspect + gap ? 2 : 1;
}

/** each page's size (px) in the box: as large as fits, keeping the page's shape */
export function pageSize(boxW: number, boxH: number, aspect: number, perView: number, gap = 16): { w: number; h: number } {
  const w = Math.min(boxH * aspect, (boxW - gap * (perView - 1)) / perView);
  return { w: Math.floor(w), h: Math.floor(w / aspect) };
}

/** the first page of the view that shows `page` (views start at 0, perView, 2·perView …) */
export const viewOf = (page: number, perView: number) => Math.floor(page / perView) * perView;

/** the next / previous view's first page, kept inside the score */
export function turn(at: number, by: 1 | -1, perView: number, pages: number): number {
  const last = viewOf(Math.max(0, pages - 1), perView);
  return Math.max(0, Math.min(last, viewOf(at, perView) + by * perView));
}

/** keys that turn pages: arrows, Page Up/Down (page-turn pedals send these), Space and Enter, Home and End */
export function keyTurn(key: string): 1 | -1 | "first" | "last" | null {
  if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(key)) return 1;
  if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(key)) return -1;
  if (key === "Home") return "first";
  if (key === "End") return "last";
  return null;
}
