import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Vitest shards partition the full discovered file set. A new process for each
// shard also creates a fresh browser and orchestrator connection.
const root = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(
  new URL("./vitest.mjs", import.meta.resolve("vitest/package.json")),
);
const batches = 3;
for (let batch = 1; batch <= batches; batch += 1) {
  console.log(`Storybook acceptance batch ${batch}/${batches}`);
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "run",
      "--project",
      "storybook",
      "--maxWorkers=1",
      `--shard=${batch}/${batches}`,
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("All Storybook acceptance batches passed.");
