/**
 * What the AI panel's + (or a paste, or a drop) adds to a message, as Claude's own chat window does:
 * - pictures (a screenshot, a photo of a page): sent as base64 and given to the agent as images (runner/agent/claude.py);
 *   a large one is made smaller first, and a small thumbnail stays in the chat;
 * - music: a score file (MusicXML, MIDI, ABC, Humdrum), which the agent can load(), or a recording, which the runner
 *   turns into a score first (runner/agent/core.py save_attachments).
 */

export interface Picture {
  name: string;
  type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  /** base64, without the data: prefix */
  data: string;
  /** a small JPEG data URL, for the message box and the chat */
  thumb: string;
  /** the picture as sent, to see it full size (a data URL; not kept after a reload) */
  full: string;
  width: number;
  height: number;
}

/** a score file or a recording attached to a message */
export interface MusicFile {
  kind: "score" | "audio";
  name: string;
  data: string;
  size: number;
}
const SCORE_FILE = /\.(musicxml|xml|mxl|midi?|abc|krn)$/i;
const AUDIO_FILE = /\.(mp3|wav|m4a|ogg|oga|flac|aac|aiff?)$/i;
export const MAX_FILES = 4;
const MAX_MUSIC = 20_000_000;
export const ACCEPT = "image/png,image/jpeg,image/gif,image/webp,.musicxml,.xml,.mxl,.mid,.midi,.abc,.krn,audio/*";

/** a music file as the panel sends it; null when it isn't one; "big" when it is over 20 MB */
export async function readMusic(file: File): Promise<MusicFile | null | "big"> {
  const kind = SCORE_FILE.test(file.name) ? "score" : AUDIO_FILE.test(file.name) ? "audio" : null;
  if (!kind) return null;
  if (file.size > MAX_MUSIC) return "big";
  return { kind, name: file.name, data: await toBase64(file), size: file.size };
}

/** a size for a chip: 3.2 MB, 640 kB */
export const sizeText = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} kB`);

export const MAX_PICTURES = 4;
/** larger than this (bytes, or pixels on the long side) is drawn smaller first */
const MAX_BYTES = 3_000_000;
const MAX_SIDE = 2400;
const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

const toBase64 = (blob: Blob) =>
  new Promise<string>((done, fail) => {
    const r = new FileReader();
    r.onload = () => done(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => fail(r.error);
    r.readAsDataURL(blob);
  });

function draw(img: ImageBitmap, side: number, type: string, quality: number): Promise<Blob> {
  const k = Math.min(1, side / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * k));
  c.height = Math.max(1, Math.round(img.height * k));
  const g = c.getContext("2d")!;
  if (type === "image/jpeg") {
    g.fillStyle = "#fff"; // (a transparent screenshot on white, not black)
    g.fillRect(0, 0, c.width, c.height);
  }
  g.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((done, fail) => c.toBlob((b) => (b ? done(b) : fail(new Error("could not draw the picture"))), type, quality));
}

/** a picture file as the panel sends it, or null when it isn't a picture this can send */
export async function readPicture(file: File): Promise<Picture | null> {
  const type = (TYPES as readonly string[]).includes(file.type) ? (file.type as Picture["type"]) : null;
  if (!type) return null;
  const img = await createImageBitmap(file);
  try {
    const big = file.size > MAX_BYTES || Math.max(img.width, img.height) > MAX_SIDE;
    const body: Blob = big ? await draw(img, MAX_SIDE, "image/jpeg", 0.9) : file;
    const outType = big ? "image/jpeg" : type;
    const data = await toBase64(body);
    return {
      name: file.name || `picture.${type.split("/")[1]}`,
      type: outType,
      data,
      thumb: `data:image/jpeg;base64,${await toBase64(await draw(img, 160, "image/jpeg", 0.7))}`,
      full: `data:${outType};base64,${data}`,
      width: img.width,
      height: img.height,
    };
  } finally {
    img.close();
  }
}

/** the files in a paste or a drop */
export const filesIn = (items: DataTransferItemList | null | undefined): File[] =>
  [...(items ?? [])].filter((i) => i.kind === "file").map((i) => i.getAsFile()).filter((f): f is File => f !== null);
export const isPicture = (f: File) => f.type.startsWith("image/");
