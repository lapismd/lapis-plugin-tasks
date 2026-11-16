import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const cli = createRequire(import.meta.url).resolve("@changesets/cli/bin.js");
const packageName = "@lapis-notes/lapis-plugin-tasks";
const versionPattern = /^\d+\.\d+\.\d+$/;

export function hasVersionIntent(plan, manifest) {
  if (
    manifest.name !== packageName ||
    manifest.private === true ||
    !versionPattern.test(manifest.version) ||
    !Array.isArray(plan?.changesets) ||
    !Array.isArray(plan?.releases)
  )
    throw Error("Invalid Tasks version intent evidence");
  if (plan.releases.length === 0) return false;
  const [release] = plan.releases;
  if (
    plan.releases.length !== 1 ||
    release.name !== packageName ||
    !["patch", "minor", "major"].includes(release.type) ||
    release.oldVersion !== manifest.version ||
    !versionPattern.test(release.newVersion) ||
    release.newVersion === release.oldVersion
  )
    throw Error("Unexpected Tasks version target");
  return true;
}

/** Ask the installed, runtime-qualified CLI; note-file presence is insufficient. */
export function inspectVersionIntent(root = process.cwd()) {
  const temporary = mkdtempSync(join(tmpdir(), "tasks-version-intent-"));
  try {
    const report = join(temporary, "status.json");
    execFileSync(process.execPath, [cli, "status", "--output", report], {
      cwd: root,
      stdio: "pipe",
      timeout: 60_000,
    });
    return hasVersionIntent(
      JSON.parse(readFileSync(report, "utf8")),
      JSON.parse(readFileSync(join(root, "package.json"), "utf8")),
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (!process.env.GITHUB_OUTPUT)
    throw Error("Missing GitHub step output file");
  const pending = inspectVersionIntent();
  appendFileSync(process.env.GITHUB_OUTPUT, `hasChangesets=${pending}\n`);
  console.log(`Genuine Tasks version intent: ${pending}`);
}
