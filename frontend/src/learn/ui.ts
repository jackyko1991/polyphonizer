/** Learn's own UI text, [English, Traditional Chinese] (strings.ts holds the shared ones). */
import type { L } from "../problems.ts";

export const UI = {
  lesson: ["Lesson", "課程"],
  lessonN: ["Lesson {n}", "第 {n} 課"],
  tabLesson: ["Lesson", "課程"],
  tabSyntax: ["Syntax", "語法"],
  tabRules: ["Rules", "規則"],
  yourTurn: ["Your turn", "換你了"],
  uses: ["Uses:", "用到："],
  next: ["Next", "下一個"],
  saved: ["Saved", "已儲存"],
  checkHint: ["Check: {save} or {enter}", "檢查：{save} 或 {enter}"],
  click: ["Click", "節拍器"],
  clickHint: ["A click on every beat while the score plays; the first beat of each bar is louder", "播放時每一拍都有節拍聲；每小節第一拍較響"],
  loop: ["Loop", "循環"],
  loopOff: ["whole piece", "整首"],
  loopBar: ["bar {n}", "第 {n} 小節"],
  loopHint: ["Play one bar over and over (press Play; Stop ends it)", "反覆播放一個小節（按播放；按停止結束）"],
  target: ["The target", "目標"],
  matches: ["Matches the target ✓", "和目標一致 ✓"],
  linked: ["Click a note in the score to find its code; move the cursor in the code to find its note.", "點樂譜上的音可找到它的程式碼；在程式碼中移動游標可找到它的音。"],
} satisfies Record<string, L>;

export const fillIn = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
