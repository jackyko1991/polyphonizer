/**
 * One look for every toolbar control (score panel, editor, Learn): the same height (h-9), corners and font size, so
 * buttons, selects, number fields, segmented tabs and checkboxes line up.
 */
export const CONTROL_H = "h-9";
/** a plain button */
export const BUTTON =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-sm font-medium whitespace-nowrap text-gray-700 hover:bg-gray-50 disabled:opacity-40";
/** the main action (Run, Check) */
export const PRIMARY =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-(--lk-accent) bg-(--lk-accent) px-3 text-sm font-medium whitespace-nowrap text-white hover:opacity-90 disabled:opacity-50";
/** a button that is switched on (Edit notes, Edit breaks) */
export const BUTTON_ON =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-(--lk-accent) bg-(--lk-accent) px-2.5 text-sm font-medium whitespace-nowrap text-white";
/** a select or a text/number field */
export const FIELD = "h-9 min-w-0 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700";
/** a segmented control's frame and its tabs */
export const SEGMENTS = "inline-flex h-9 shrink-0 items-stretch rounded-md border border-gray-300 p-0.5 text-sm";
export const SEGMENT = "inline-flex items-center rounded px-2.5 font-medium whitespace-nowrap";
/** a checkbox with its label, centred on the same line */
export const CHECK = "inline-flex h-9 shrink-0 items-center gap-1.5 text-sm whitespace-nowrap text-gray-700";

/** the width the score is laid out for: while full screen is on, the width it had before (zoom, no re-flow) */
export const layoutWidth = (width: number, frozen: number | null) => frozen ?? width;
