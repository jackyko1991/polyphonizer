/**
 * Pictures pasted (or chosen) into the AI panel's message: a screenshot, a photo of a page. Each goes to the runner as
 * base64 with the message (runner/agent/core.py keeps it in the chat's folder for that turn, where the agent looks at
 * it); a large one is made smaller first, and a small thumbnail stays in the chat to show what was sent.
 */

export interface Picture {
  name: string;
  type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  /** base64, without the data: prefix */
  data: string;
  /** a small JPEG data URL, for the message box and the chat */
  thumb: string;
}

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
    return {
      name: file.name || `picture.${type.split("/")[1]}`,
      type: big ? "image/jpeg" : type,
      data: await toBase64(body),
      thumb: `data:image/jpeg;base64,${await toBase64(await draw(img, 160, "image/jpeg", 0.7))}`,
    };
  } finally {
    img.close();
  }
}

/** the picture files in a paste or a drop */
export const picturesIn = (items: DataTransferItemList | null | undefined): File[] =>
  [...(items ?? [])].filter((i) => i.kind === "file" && i.type.startsWith("image/")).map((i) => i.getAsFile()).filter((f): f is File => f !== null);
