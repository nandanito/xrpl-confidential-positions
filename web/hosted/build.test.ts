/**
 * The build's two refusals that need no container: where it may write, and
 * whether the tree it is about to build is the commit's (`REVIEW-059` R1-10).
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkExportedTree, exportSource, listTree, outProblems } from "./build.ts";

const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const temp = () => { const d = mkdtempSync(join(tmpdir(), "wconf-build-test-")); dirs.push(d); return d; };
const git = (cwd: string, ...a: string[]) => {
  const r = Bun.spawnSync(["git", "-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", ...a], { cwd, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
  return r.stdout.toString().trim();
};

/** A two-file repository with one commit. */
function repo(): { dir: string; commit: string } {
  const dir = temp();
  git(dir, "init", "-q");
  mkdirSync(join(dir, "web/app"), { recursive: true });
  writeFileSync(join(dir, "README.md"), "x\n");
  writeFileSync(join(dir, "web/app/page.ts"), "export const a = 1;\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "one");
  return { dir, commit: git(dir, "rev-parse", "HEAD") };
}

describe("where a build may write", () => {
  test("refuses the repository itself and anything inside it", () => {
    const { dir } = repo();
    expect(outProblems(dir, dir).join()).toMatch(/outside the repository/);
    expect(outProblems(join(dir, "out"), dir).join()).toMatch(/outside the repository/);
  });
  test("refuses a directory that is not empty, and takes a new or empty one", () => {
    const { dir } = repo();
    const used = temp();
    mkdirSync(join(used, "work/src"), { recursive: true });
    expect(outProblems(used, dir).join()).toMatch(/is not empty/);
    expect(outProblems(temp(), dir)).toEqual([]);
    expect(outProblems(join(temp(), "new"), dir)).toEqual([]);
  });
});

describe("the tree a build is about to build", () => {
  test("a clean export lists exactly the commit's files", () => {
    const { dir, commit } = repo();
    const src = join(temp(), "src");
    exportSource(dir, src, false, commit);
    expect(checkExportedTree(src, ["README.md", "web/app/page.ts"])).toEqual([]);
  });
  test("a file left in the directory before the export is refused (REVIEW-059 R1-10, as measured)", () => {
    const { dir, commit } = repo();
    const src = join(temp(), "src");
    mkdirSync(join(src, "web/app/public/assets"), { recursive: true });
    writeFileSync(join(src, "web/app/public/assets/review059.js"), "export const outsider = 1;\n");
    exportSource(dir, src, false, commit);
    expect(listTree(src)).toContain("web/app/public/assets/review059.js");
    expect(checkExportedTree(src, ["README.md", "web/app/page.ts"]).join()).toMatch(/web\/app\/public\/assets\/review059\.js is in the build tree and not in the commit/);
  });
  test("a committed file the export lost is refused", () => {
    expect(checkExportedTree(temp(), ["README.md"]).join()).toMatch(/README\.md is in the commit and not in the build tree/);
  });
});
