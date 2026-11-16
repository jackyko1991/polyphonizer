import { test } from "node:test";
import assert from "node:assert/strict";
import { fileKind } from "../src/library/elsewhere.ts";
import { backendOk, estimateSeconds, jobKind, pdfPageCount, progressAt, jobUrl, resultName, routesFor, RUNNER_URL, runJob, runnerStatus } from "../src/transcribe/routes.ts";

test("what a file needs: a picture of music is read (OMR), a recording or a video is transcribed, a score needs nothing", () => {
  assert.equal(jobKind("Erlkonig.pdf"), "omr");
  assert.equal(jobKind("page1.png"), "omr");
  assert.equal(jobKind("scan.JPG"), "omr");
  assert.equal(jobKind("take.mp3"), "transcribe");
  assert.equal(jobKind("lesson.mp4"), "transcribe");
  assert.equal(jobKind("clip.mov"), "transcribe");
  assert.equal(jobKind("rec", "video/webm"), "transcribe");
  assert.equal(jobKind("score.musicxml"), null);
  assert.equal(jobKind("notes.docx"), null);
  // the editor's Open file knows video and pictures too
  assert.equal(fileKind("lesson.mp4"), "video");
  assert.equal(fileKind("page1.png"), "image");
});

test("which routes can do a job: this browser (recordings only), your own runner (what it says it can), the service (coming)", () => {
  const none = routesFor("transcribe", { browser: false, runner: null });
  assert.deepEqual(
    none.map((r) => [r.id, r.ready]),
    [
      ["browser", false],
      ["runner", false],
      ["service", false],
    ],
  );
  assert.equal(none.find((r) => r.id === "runner")!.why, "not-running");
  assert.equal(none.find((r) => r.id === "service")!.why, "coming");

  const ready = routesFor("transcribe", { browser: true, runner: { omr: true, transcribe: true, version: "1" } });
  assert.deepEqual(ready.filter((r) => r.ready).map((r) => r.id), ["browser", "runner"]);

  // reading a page: never in the browser (for now); the runner if it has an OMR engine
  const omr = routesFor("omr", { browser: true, runner: { omr: false, transcribe: true, version: "1" } });
  assert.equal(omr.find((r) => r.id === "browser")!.why, "not-here");
  assert.equal(omr.find((r) => r.id === "runner")!.why, "no-engine");
  assert.ok(!omr.some((r) => r.ready));
});

test("the protocol: POST <base>/omr or /transcribe with the file; the answer is MusicXML or MIDI", () => {
  assert.equal(RUNNER_URL, "http://127.0.0.1:8765");
  assert.equal(jobUrl("http://127.0.0.1:8765/", "omr"), "http://127.0.0.1:8765/omr");
  assert.equal(jobUrl("https://example.org/api", "transcribe"), "https://example.org/api/transcribe");
  assert.equal(resultName("Erlkonig.pdf", "application/vnd.recordare.musicxml+xml"), "Erlkonig.musicxml");
  assert.equal(resultName("Erlkonig.pdf", "application/vnd.recordare.musicxml"), "Erlkonig.mxl");
  assert.equal(resultName("take 1.mp3", "audio/midi"), "take 1.mid");
});

test("the client: status (none when nothing answers), and a job sent with its name, answered with a file", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fake = (answer: (url: string) => Response) =>
    (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return answer(url);
    }) as typeof fetch;

  assert.equal(await runnerStatus(RUNNER_URL, fake(() => { throw new TypeError("Failed to fetch"); })), null);
  const status = await runnerStatus(RUNNER_URL, fake(() => Response.json({ omr: true, transcribe: false, version: "0.1" })));
  assert.deepEqual(status, { omr: true, transcribe: false, version: "0.1" });
  assert.equal(calls.at(-1)!.url, "http://127.0.0.1:8765/status");

  const file = new File([new Uint8Array([37, 80, 68, 70])], "Erlkonig.pdf", { type: "application/pdf" });
  const out = await runJob(RUNNER_URL, "omr", file, fake(() => new Response("<score-partwise/>", { headers: { "content-type": "application/vnd.recordare.musicxml+xml" } })));
  assert.equal(out.name, "Erlkonig.musicxml");
  assert.equal(new TextDecoder().decode(out.bytes), "<score-partwise/>");
  const sent = calls.at(-1)!;
  assert.equal(sent.url, "http://127.0.0.1:8765/omr");
  assert.equal(sent.init?.method, "POST");
  assert.equal(new Headers(sent.init?.headers).get("x-filename"), encodeURIComponent("Erlkonig.pdf"));

  // a refusal comes back as an error with the runner's message
  await assert.rejects(
    runJob(RUNNER_URL, "omr", file, fake(() => Response.json({ error: "No OMR engine: pixi run runner-omr" }, { status: 501 }))),
    /No OMR engine/,
  );
});

test("a backend of your own: its address (http only for this computer) and a token sent as a bearer", async () => {
  assert.equal(backendOk("http://127.0.0.1:8765"), true);
  assert.equal(backendOk("http://localhost:9000/"), true);
  assert.equal(backendOk("https://my-runner.example.org/api"), true);
  assert.equal(backendOk("https://someone-polyphonizer.hf.space"), true);
  // plain http to another computer would send your files unencrypted; other schemes are not backends
  assert.equal(backendOk("http://192.168.1.20:8765"), false);
  assert.equal(backendOk("javascript:alert(1)"), false);
  assert.equal(backendOk("ftp://x"), false);
  assert.equal(backendOk(""), false);

  const seen: Headers[] = [];
  const fake = (async (_u: string, init?: RequestInit) => {
    seen.push(new Headers(init?.headers));
    return Response.json({ omr: true, transcribe: true, version: "1" });
  }) as typeof fetch;
  await runnerStatus("https://my-runner.example.org", fake, "s3cret");
  assert.equal(seen[0].get("authorization"), "Bearer s3cret");
  await runnerStatus(RUNNER_URL, fake);
  assert.equal(seen[1].get("authorization"), null);
  const file = new File([new Uint8Array([1])], "take.mp3");
  await runJob("https://my-runner.example.org", "transcribe", file, (async (_u: string, init?: RequestInit) => {
    seen.push(new Headers(init?.headers));
    return new Response(new Uint8Array([77]), { headers: { "content-type": "audio/midi" } });
  }) as typeof fetch, "s3cret");
  assert.equal(seen[2].get("authorization"), "Bearer s3cret");
});

test("progress: a PDF's pages counted from its bytes, an estimate of the time, and a bar that waits for the answer", () => {
  const pdf = (n: number) => new TextEncoder().encode(`%PDF-1.4\n1 0 obj << /Type /Pages /Count ${n} >>\n` + "<< /Type /Page >>\n".repeat(n) + "%%EOF");
  assert.equal(pdfPageCount(pdf(3)), 3);
  assert.equal(pdfPageCount(pdf(1)), 1);
  // the page tree's /Count wins over counting (pages may be in compressed object streams)
  assert.equal(pdfPageCount(new TextEncoder().encode("%PDF-1.5 << /Type /Pages /Kids [4 0 R] /Count 12 >>")), 12);
  assert.equal(pdfPageCount(new TextEncoder().encode("not a pdf")), 1);
  assert.equal(estimateSeconds("omr", 1), 30);
  assert.equal(estimateSeconds("omr", 4), 120);
  assert.equal(estimateSeconds("transcribe", 1), 60);
  // never full before the answer: 95 % at most, half way at half the time
  assert.equal(progressAt(0, 30), 0);
  assert.equal(progressAt(15, 30), 47.5);
  assert.equal(progressAt(30, 30), 95);
  assert.equal(progressAt(300, 30), 95);
});
