import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { browserInvocations } from "./validation/model.mjs";

// Vitest shards partition the full discovered file set. A new process for each
// shard also creates a fresh browser and orchestrator connection.
const root = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(
  new URL("./vitest.mjs", import.meta.resolve("vitest/package.json")),
);
const args = process.argv.slice(2);
if (args[0] === "--") args.shift();
const invocations = browserInvocations(args);
for (const [index, invocation] of invocations.entries()) {
  console.log(`Storybook acceptance batch ${index + 1}/${invocations.length}`);
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "run",
      "--config",
      "scripts/vitest-storybook-batches.config.mjs",
      "--project",
      "storybook",
      "--maxWorkers=1",
      ...invocation,
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
