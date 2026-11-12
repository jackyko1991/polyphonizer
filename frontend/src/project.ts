/**
 * The editor's project: its Python files (main.py sets `score`; the others are modules it imports) and the player's
 * page layout of each sheet. Saved in this browser (localStorage); Export ▸ Code gives the files back.
 */

export const MAIN = "main.py";

export interface ProjectFile {
  name: string;
  code: string;
}
export interface Project {
  /** main.py first */
  files: ProjectFile[];
  active: string;
  /** by sheet: "full" or "part:<name>" */
  /** page layouts kept per browser by earlier versions; the page setup now lives in the code (pages(...)) */
  layouts: Record<string, unknown>;
}

const KEY = "polyphonizer.project";
/** the single-file editor's old key: its code becomes main.py */
const OLD_KEY = "polyphonizer.editor.code";

export function loadProject(fallback: string): Project {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Project | null;
    if (saved?.files?.length && saved.files[0].name === MAIN) return { ...saved, layouts: saved.layouts ?? {} };
    const old = localStorage.getItem(OLD_KEY);
    return { files: [{ name: MAIN, code: old ?? fallback }], active: MAIN, layouts: {} };
  } catch {
    return { files: [{ name: MAIN, code: fallback }], active: MAIN, layouts: {} };
  }
}

export function saveProject(p: Project) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* full or unavailable: the project still works until the tab closes */
  }
}

/** a Python module name: letters, digits and _, not starting with a digit, ending .py */
export const validName = (name: string) => /^[A-Za-z_]\w*\.py$/.test(name) && name !== MAIN && name !== "polyphonizer.py";

export function newFileName(files: ProjectFile[]): string {
  for (let i = 1; ; i++) {
    const name = `part${i}.py`;
    if (!files.some((f) => f.name === name)) return name;
  }
}


// ── a minimal zip (stored, no compression) for Export ▸ Code ──

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** a .zip holding these files, uncompressed */
export function zip(files: ProjectFile[]): Uint8Array {
  const enc = new TextEncoder();
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.code);
    const crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true);
    head.setUint16(4, 20, true);
    head.setUint16(6, 0x0800, true); // UTF-8 names
    head.setUint32(14, crc, true);
    head.setUint32(18, data.length, true);
    head.setUint32(22, data.length, true);
    head.setUint16(26, name.length, true);
    local.push(new Uint8Array(head.buffer), name, data);
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, data.length, true);
    dir.setUint32(24, data.length, true);
    dir.setUint16(28, name.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const size = central.reduce((n, b) => n + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  const parts = [...local, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((n, b) => n + b.length, 0));
  let at = 0;
  for (const b of parts) {
    out.set(b, at);
    at += b.length;
  }
  return out;
}

// ── recently opened scores (from the Library or imported), for the editor's score picker ──

export interface Recent {
  label: string;
  /** main.py for it */
  code: string;
}
const RECENT = "polyphonizer.recent";

export function recentScores(): Recent[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT) ?? "[]") as Recent[];
  } catch {
    return [];
  }
}

export function addRecent(r: Recent) {
  try {
    localStorage.setItem(RECENT, JSON.stringify([r, ...recentScores().filter((x) => x.label !== r.label)].slice(0, 8)));
  } catch {
    /* storage unavailable */
  }
}
