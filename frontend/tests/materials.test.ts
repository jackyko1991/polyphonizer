import { test } from "node:test";
import assert from "node:assert/strict";
import { addFolder, addMaterial, allFolders, cleanPath, freePath, idsIn, moveItem, removeItem, renameItem, sizeText, treeOf } from "../src/materials.ts";
import { freshProject } from "../src/workspace.ts";
import { zip } from "../src/project.ts";

const file = (id: string, name: string, type = "application/pdf") => ({ id, name, type, size: 10, added: 1 });

test("files kept with a score: a free name in its folder, folders made and listed as a tree (folders first)", () => {
  let p = freshProject("score = None");
  p = addMaterial(p, file("a", "edition.pdf"), "sources");
  p = addMaterial(p, file("b", "edition.pdf"), "sources"); // the same name again
  p = addMaterial(p, file("c", "take 1.mp3", "audio/mpeg"));
  p = addFolder(p, "empty").project;
  assert.deepEqual(p.materials!.map((m) => m.path), ["sources/edition.pdf", "sources/edition (2).pdf", "take 1.mp3"]);
  const tree = treeOf(p);
  assert.deepEqual(tree.map((n) => [n.kind, n.name]), [["folder", "empty"], ["folder", "sources"], ["file", "take 1.mp3"]]);
  assert.deepEqual(tree[1].children.map((n) => n.name), ["edition (2).pdf", "edition.pdf"]);
  assert.deepEqual(allFolders(p), ["empty", "sources"]);
});

test("moving a file or a whole folder; a folder never into itself; renaming keeps the folder", () => {
  let p = freshProject("");
  p = addMaterial(p, file("a", "a.pdf"), "sources/old");
  p = addFolder(p, "keep").project;
  p = moveItem(p, "sources/old/a.pdf", "keep");
  assert.equal(p.materials![0].path, "keep/a.pdf");
  p = moveItem(p, "keep", "sources"); // a folder with what it holds
  assert.equal(p.materials![0].path, "sources/keep/a.pdf");
  assert.ok(p.folders!.includes("sources/keep"));
  assert.deepEqual(moveItem(p, "sources", "sources/keep"), p); // not into itself
  p = renameItem(p, "sources/keep/a.pdf", "Breitkopf 1853.pdf");
  assert.equal(p.materials![0].path, "sources/keep/Breitkopf 1853.pdf");
  p = renameItem(p, "sources", "editions");
  assert.equal(p.materials![0].path, "editions/keep/Breitkopf 1853.pdf");
  // to the top
  assert.equal(moveItem(p, "editions/keep/Breitkopf 1853.pdf", "").materials![0].path, "Breitkopf 1853.pdf");
});

test("removing a folder takes what it holds, and says which stored bytes can go", () => {
  let p = freshProject("");
  p = addMaterial(p, file("a", "a.pdf"), "x");
  p = addMaterial(p, file("b", "b.pdf"), "x/y");
  p = addMaterial(p, file("c", "c.pdf"));
  const { project, removed } = removeItem(p, "x");
  assert.deepEqual(removed.sort(), ["a", "b"]);
  assert.deepEqual(project.materials!.map((m) => m.path), ["c.pdf"]);
  assert.deepEqual([...idsIn([project, null])], ["c"]);
});

test("paths tidied; names made free; sizes read", () => {
  assert.equal(cleanPath("../a//b:c/./d?.pdf"), "a/b_c/d_.pdf");
  assert.equal(freePath(freshProject(""), ""), "file");
  assert.equal(sizeText(950), "950 B");
  assert.equal(sizeText(12_300), "12 kB");
  assert.equal(sizeText(1_250_000), "1.3 MB");
});

test("the project zip holds text and bytes, in folders", () => {
  const z = zip([
    { name: "main.py", code: "score = 1\n" },
    { name: "sources/a.bin", data: new Uint8Array([0, 255, 7]) },
  ]);
  const text = new TextDecoder("latin1").decode(z);
  assert.ok(text.includes("main.py") && text.includes("sources/a.bin") && text.includes("score = 1"));
  assert.equal(new DataView(z.buffer).getUint32(0, true), 0x04034b50);
  // the end record counts both files
  assert.equal(new DataView(z.buffer).getUint16(z.length - 22 + 10, true), 2);
});

test("the project's zip: code first, the score's files, kept files in their folders, the licence; a lost file noted", async () => {
  const { projectEntries } = await import("../src/exporting.ts");
  let p = freshProject("score = 1");
  p = { ...p, files: [{ name: "motifs.py", code: "x = 1" }, ...p.files] };
  p = addMaterial(p, file("a", "edition.pdf"), "sources");
  p = addMaterial(p, file("gone", "old.mp3", "audio/mpeg"));
  const score = { musicxml: "<score-partwise><identification></identification><part-list/></score-partwise>" } as never;
  const entries = await projectEntries(p, {
    title: "My Minuet",
    score,
    midi: new Uint8Array([1, 2]),
    rights: { licence: "CC-BY-4.0", holder: "Ana Lee" },
    bytes: async (id) => (id === "a" ? new Uint8Array([9]) : null),
  });
  assert.deepEqual(entries.map((e) => e.name), ["main.py", "motifs.py", "score/My_Minuet.musicxml", "score/My_Minuet.mid", "files/sources/edition.pdf", "files/MISSING.txt", "LICENSE.txt"]);
  const xml = (entries[2] as { code: string }).code;
  assert.match(xml, /<rights>© \d{4} Ana Lee\. Licensed under CC BY 4\.0: https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/<\/rights>/);
  assert.match((entries[5] as { code: string }).code, /old\.mp3/);
  assert.match((entries[6] as { code: string }).code, /Ana Lee/);
  // no licence, no score: just the code and files
  const plain = await projectEntries(freshProject("s"), { title: "", rights: null, bytes: async () => null });
  assert.deepEqual(plain.map((e) => e.name), ["main.py"]);
});
