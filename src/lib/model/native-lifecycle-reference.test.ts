import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lifecycleInputs } from "./native-lifecycle-inputs.test.fixture";
import { captureLifecycle } from "./native-lifecycle-reference.test.fixture";

const fixturePath = resolve("crates/lapis-task-services/tests/fixtures/lifecycle.json");
const capture = process.env.LAPIS_TASKS_CAPTURE_LIFECYCLE === "1";

describe("retained Task lifecycle repository reference", () => {
  it("preserves complete lifecycle plans, write traces and retry snapshots", async () => {
    const cases = [];
    for (const input of lifecycleInputs()) {
      cases.push({ ...input, expected: await captureLifecycle(input) });
    }
    const actual = { schema: 1, oracleRevision: "fde58de0b03f97691a109b3448f414c5ac19eb5a", cases };
    if (capture) {
      await mkdir(resolve("test-results"), { recursive: true });
      await writeFile(resolve("test-results/lifecycle.json"), JSON.stringify(actual, null, 2) + "\n");
    } else {
      expect(actual).toEqual(JSON.parse(await readFile(fixturePath, "utf8")));
    }
    expect(cases.length).toBeGreaterThan(90);
    for (const entry of cases) {
      const result = entry.expected as { attempts: Array<{
        plan: { taskRaw?: string; observation?: unknown };
        intents: Array<{ kind: string; raw?: string }>;
      }> };
      for (const attempt of result.attempts) {
        const taskWrite = attempt.intents.find((intent) => intent.kind === "task-write");
        if (taskWrite) expect(attempt.plan.taskRaw).toBe(taskWrite.raw);
        if (attempt.intents.some((intent) => intent.kind === "daily-write")) {
          expect(attempt.plan.observation).toBeDefined();
        }
      }
    }
    for (const name of ["complete / ordinary / none", "complete / schedule / boolean",
      "complete / schedule / count", "skip / schedule / none", "existing custom daily path"]) {
      expect(cases.find((entry) => entry.name === name)!.expected).toMatchObject({
        attempts: [{ result: { value: { id: "read" } } }],
      });
    }
    const retry = cases.find((item) => item.name === "failed Task write then retry")!;
    expect(retry.expected).toMatchObject({ attempts: [
      { result: { error: { message: "simulated Task write failure" } }, taskRaw: retry.raw },
      { result: { value: { id: "read" } } },
    ] });
  }, 30_000);
});
