/**
 * Turning a picture of music (PDF, photo) or a recording (audio, video) into notes, by one of three routes that all
 * speak the same small protocol (docs/plans/transcription.md):
 * - this browser: recordings only (Spotify's Basic Pitch, in the page; nothing leaves the device);
 * - your own runner: `pixi run runner` on your computer, or the same runner on a server of yours (a VPS with a GPU,
 *   a Mac): OMR with copista; recordings with Transkun (piano) or Basic Pitch (other instruments), written as a score
 *   (bars, key, two staves for piano) and on the GPU when there is one;
 * - the Polyphonizer service: the same runner, hosted, as a paid tier (coming).
 *
 * Protocol: GET <base>/status → { omr, transcribe, instruments, device, version }; POST <base>/omr or
 * <base>/transcribe[?instrument=piano|other] with the file as the body (its name in X-Filename) → MusicXML or MIDI,
 * or { error } with a 4xx/5xx status.
 */
import type { AgentStatus } from "../agent/client.ts";
import { fileKind } from "../library/elsewhere.ts";

export type JobKind = "omr" | "transcribe";
export type RouteId = "browser" | "runner" | "service";
/** what a recording is played on: piano (Transkun) or any other instrument or voice (Basic Pitch) */
export type Instrument = "piano" | "other";
export interface RunnerStatus {
  omr: boolean;
  transcribe: boolean;
  version: string;
  /** the instruments its built-in sound engine takes (empty: an engine of its own, which takes whatever it takes) */
  instruments?: Instrument[];
  /** where that engine runs: cuda, mps (the Apple GPU) or cpu */
  device?: string | null;
  /** what its AI agent offers (null: a runner from before the agent) */
  agent?: AgentStatus | null;
}

/** the local runner's address (pixi run runner) */
export const RUNNER_URL = "http://127.0.0.1:8765";

/** what a file needs to become notes: reading (a picture of music) or transcribing (a recording); null for a score */
export function jobKind(name: string, type = ""): JobKind | null {
  const k = fileKind(name, type);
  return k === "pdf" || k === "image" ? "omr" : k === "audio" || k === "video" ? "transcribe" : null;
}

/** the routes for a job, each ready or not and why not */
export function routesFor(
  kind: JobKind,
  have: { browser: boolean; runner: RunnerStatus | null },
): { id: RouteId; ready: boolean; why?: "not-here" | "loading" | "not-running" | "no-engine" | "coming" }[] {
  return [
    kind === "transcribe" ? { id: "browser", ready: have.browser, why: have.browser ? undefined : "loading" } : { id: "browser", ready: false, why: "not-here" },
    !have.runner ? { id: "runner", ready: false, why: "not-running" } : have.runner[kind] ? { id: "runner", ready: true } : { id: "runner", ready: false, why: "no-engine" },
    { id: "service", ready: false, why: "coming" },
  ];
}

export const jobUrl = (base: string, kind: JobKind, instrument?: Instrument) => `${base.replace(/\/+$/, "")}/${kind}${kind === "transcribe" && instrument ? `?instrument=${instrument}` : ""}`;

/** the name of what comes back: the file's name with the result's extension */
export function resultName(from: string, type: string): string {
  const stem = from.replace(/\.[^.]+$/, "");
  const ext = /musicxml\+xml|text\/xml|application\/xml/.test(type) ? "musicxml" : /musicxml/.test(type) ? "mxl" : /midi/.test(type) ? "mid" : "musicxml";
  return `${stem}.${ext}`;
}

/** a backend's address: https anywhere, or http on this computer only (anything else would send files in the clear) */
export function backendOk(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || (u.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname));
  } catch {
    return false;
  }
}

/** the backend this learner uses (their runner by default; their own server, Space or the service otherwise), kept in
 * this browser */
export interface Backend {
  url: string;
  token: string;
}
const BACKEND_KEY = "polyphonizer.transcribe.backend";
export function loadBackend(): Backend {
  try {
    const b = JSON.parse(localStorage.getItem(BACKEND_KEY) ?? "null") as Partial<Backend> | null;
    if (b?.url && backendOk(b.url)) return { url: b.url, token: b.token ?? "" };
  } catch {
    /* storage unavailable */
  }
  return { url: RUNNER_URL, token: "" };
}
export function saveBackend(b: Backend) {
  try {
    if (b.url === RUNNER_URL && !b.token) localStorage.removeItem(BACKEND_KEY);
    else localStorage.setItem(BACKEND_KEY, JSON.stringify(b));
  } catch {
    /* storage unavailable */
  }
}
const auth = (token?: string): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {});

/** what a runner can do, or null when nothing answers at that address */
export async function runnerStatus(base: string, f: typeof fetch = fetch, token?: string): Promise<RunnerStatus | null> {
  try {
    const r = await f(`${base.replace(/\/+$/, "")}/status`, { headers: auth(token), signal: AbortSignal.timeout?.(3000) });
    if (!r.ok) return null;
    const s = (await r.json()) as Partial<RunnerStatus>;
    const instruments = Array.isArray(s.instruments) ? s.instruments.filter((i): i is Instrument => i === "piano" || i === "other") : [];
    return { omr: !!s.omr, transcribe: !!s.transcribe, instruments, device: typeof s.device === "string" ? s.device : null, version: String(s.version ?? ""), agent: s.agent && typeof s.agent === "object" ? s.agent : null };
  } catch {
    return null;
  }
}

/** send a file to a runner (or the service) and get the notes back as a file */
export async function runJob(base: string, kind: JobKind, file: File, f: typeof fetch = fetch, token?: string, instrument?: Instrument): Promise<{ name: string; bytes: Uint8Array }> {
  const r = await f(jobUrl(base, kind, instrument), {
    method: "POST",
    headers: { "content-type": file.type || "application/octet-stream", "x-filename": encodeURIComponent(file.name), ...auth(token) },
    body: file,
  });
  if (!r.ok) {
    const msg = await r
      .json()
      .then((j: { error?: string }) => j.error)
      .catch(() => "");
    throw new Error(msg || `HTTP ${r.status}`);
  }
  return { name: resultName(file.name, r.headers.get("content-type") ?? ""), bytes: new Uint8Array(await r.arrayBuffer()) };
}

/** a PDF's number of pages: its page tree's largest /Count, else its /Type /Page objects (1 when unsure) */
export function pdfPageCount(bytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(bytes);
  const counts = [...text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/g), ...text.matchAll(/\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)].map((m) => Number(m[1]));
  if (counts.length) return Math.max(...counts);
  return Math.max(1, (text.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length);
}

/** about how long a job takes on a runner: ~30 s a page (copista-28m, CPU); a recording of known length: piano
 * (Transkun) ~6 % of its length on a GPU, ~15 % on the CPU, other instruments (Basic Pitch) ~2 %, and a few seconds to
 * load the model and write the score (measured on an M-series Mac); ~1 min when the length is not known */
export function estimateSeconds(kind: JobKind, pages = 1, sound?: { seconds?: number; device?: string | null; instrument?: Instrument }): number {
  if (kind === "omr") return 30 * Math.max(1, pages);
  const secs = sound?.seconds;
  if (!secs || !Number.isFinite(secs)) return 60;
  const rate = sound?.instrument === "other" ? 0.02 : sound?.device && sound.device !== "cpu" ? 0.06 : 0.15;
  return Math.round(8 + secs * rate);
}

/** a device's name for the learner */
export function deviceName(device: string | null | undefined): readonly [string, string] | null {
  if (!device) return null;
  if (device.startsWith("cuda")) return ["an NVIDIA GPU", "NVIDIA GPU"];
  if (device === "mps") return ["the Mac's GPU", "Mac 的 GPU"];
  if (device === "cpu") return ["the CPU", "CPU"];
  return [device, device];
}

/** the bar's width (%) after `elapsed` of an estimated `estimate` seconds: up to 95 %, the rest is the answer */
export const progressAt = (elapsed: number, estimate: number) => Math.min(95, (elapsed / Math.max(1, estimate)) * 95);
