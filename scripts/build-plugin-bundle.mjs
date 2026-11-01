import { execFileSync } from "node:child_process";
import { copyFile, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { init, parse } from "es-module-lexer";

execFileSync(
  "pnpm",
  ["exec", "vite", "build", "--config", "vite.bundle.config.ts"],
  { stdio: "inherit" },
);
await copyFile("manifest.json", ".release/runtime/manifest.json");
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const shared = new Set(
  manifest.lapis.runtime.entries.workspace.sharedDependencies,
);
await init;
async function audit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await audit(file);
    else if (/\.[cm]?js$/.test(file)) {
      const [imports] = parse(await readFile(file, "utf8"));
      for (const item of imports) {
        const name = item.n;
        if (
          name &&
          !name.startsWith(".") &&
          !name.startsWith("/") &&
          !shared.has(name)
        )
          throw Error(`Undeclared shared runtime import ${name} in ${file}`);
      }
    }
  }
}
await audit(".release/runtime");
