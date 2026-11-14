import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const write = process.argv.includes("--write");
const catalog = JSON.parse(
  execFileSync(
    "cargo",
    [
      "run",
      "--quiet",
      "--locked",
      "--manifest-path",
      "crates/lapis-task-operations/Cargo.toml",
      "--bin",
      "export",
    ],
    { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
  ),
);
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const operations = catalog.map(({ id, version }) => ({ id, version }));
const expected = JSON.stringify(catalog, null, 2) + "\n";
if (write) {
  await writeFile("operations.json", expected);
  manifest.lapis.contributes = { ...manifest.lapis.contributes, operations };
  await writeFile("manifest.json", JSON.stringify(manifest, null, 2) + "\n");
} else {
  if (
    (await readFile("operations.json", "utf8")) !== expected ||
    JSON.stringify(manifest.lapis.contributes?.operations) !==
      JSON.stringify(operations)
  )
    throw new Error(
      "Stale Tasks operation catalog; run pnpm generate:operations.",
    );
}
console.log(
  `Verified ${catalog.length} Tasks operations and help definitions.`,
);
