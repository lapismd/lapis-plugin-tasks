import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lifecycleInputs } from "./native-lifecycle-inputs.test.fixture";
import { captureLifecycle } from "./native-lifecycle-reference.test.fixture";
import { durationLifecycleInputs } from "./native-lifecycle-duration.test.fixture";

const fixturePath = resolve(
  "crates/lapis-task-services/tests/fixtures/lifecycle.json",
);
const capture = process.env.LAPIS_TASKS_CAPTURE_LIFECYCLE === "1";

describe("retained Task lifecycle repository reference", () => {
  it("preserves valid duration tracking in complete lifecycle traces", async () => {
    const cases = [];
    for (const input of durationLifecycleInputs()) {
      cases.push({ ...input, expected: await captureLifecycle(input) });
    }
    const actual = {
      schema: 1,
      oracleRevision: "a2e9f126afd54ab3e9f4418c5c41769bbf9876b0",
      cases,
    };
    if (capture) {
      await mkdir(resolve("test-results"), { recursive: true });
      await writeFile(
        resolve("test-results/lifecycle-duration.json"),
        JSON.stringify(actual, null, 2) + "\n",
      );
    } else {
      expect(actual).toEqual(
        JSON.parse(
          await readFile(
            resolve(
              "crates/lapis-task-services/tests/fixtures/lifecycle-duration.json",
            ),
            "utf8",
          ),
        ),
      );
    }
    expect(cases).toHaveLength(18);
    for (const name of [
      "complete / schedule / duration",
      "complete / completion / duration",
      "complete / completion-without-start / duration",
    ]) {
      expect(
        cases.find((entry) => entry.name === `valid duration / ${name}`)!
          .expected,
      ).toMatchObject({
        attempts: [
          {
            planner: {
              value: {
                observation: {
                  input: {
                    tracking: { type: "duration", target: "30m" },
                    occurrenceDate: "2026-08-20",
                  },
                  completion: { type: "duration", durationMinutes: 8 },
                },
              },
            },
            intents: [
              { kind: "ensure-daily" },
              { kind: "daily-write", failed: false },
              { kind: "task-write", failed: false },
            ],
          },
        ],
      });
    }
    expect(
      cases.find(
        (entry) => entry.name === "valid duration / missing duration value",
      )!.expected,
    ).toMatchObject({
      attempts: [
        {
          result: {
            error: {
              name: "InvalidTaskOccurrenceValueError",
              message: "Duration completion requires minutes.",
            },
          },
          intents: [],
        },
      ],
    });
  }, 30_000);

  it("preserves complete lifecycle plans, write traces and retry snapshots", async () => {
    const cases = [];
    for (const input of lifecycleInputs()) {
      cases.push({ ...input, expected: await captureLifecycle(input) });
    }
    const actual = {
      schema: 1,
      oracleRevision: "fde58de0b03f97691a109b3448f414c5ac19eb5a",
      cases,
    };
    if (capture) {
      await mkdir(resolve("test-results"), { recursive: true });
      await writeFile(
        resolve("test-results/lifecycle.json"),
        JSON.stringify(actual, null, 2) + "\n",
      );
    } else {
      expect(actual).toEqual(JSON.parse(await readFile(fixturePath, "utf8")));
    }
    expect(cases.length).toBeGreaterThan(90);
    for (const entry of cases) {
      const result = entry.expected as {
        attempts: Array<{
          plan: { taskRaw?: string; observation?: unknown };
          intents: Array<{ kind: string; raw?: string }>;
        }>;
      };
      for (const attempt of result.attempts) {
        const taskWrite = attempt.intents.find(
          (intent) => intent.kind === "task-write",
        );
        if (taskWrite) expect(attempt.plan.taskRaw).toBe(taskWrite.raw);
        if (attempt.intents.some((intent) => intent.kind === "daily-write")) {
          expect(attempt.plan.observation).toBeDefined();
        }
      }
    }
    for (const name of [
      "complete / ordinary / none",
      "complete / schedule / boolean",
      "complete / schedule / count",
      "skip / schedule / none",
      "existing custom daily path",
    ]) {
      expect(
        cases.find((entry) => entry.name === name)!.expected,
      ).toMatchObject({
        attempts: [{ result: { value: { id: "read" } } }],
      });
    }
    const retry = cases.find(
      (item) => item.name === "failed Task write then retry",
    )!;
    expect(retry.expected).toMatchObject({
      attempts: [
        {
          result: { error: { message: "simulated Task write failure" } },
          taskRaw: retry.raw,
        },
        { result: { value: { id: "read" } } },
      ],
    });
  }, 30_000);
});
