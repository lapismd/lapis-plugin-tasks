import { describe, expect, it } from "vitest";
import { parseTaskDocument } from "./task-document";
import {
  completeTaskDocument,
  planTaskDocument,
  setTaskChecklistItemChecked,
  setTaskRepeat,
  pauseTaskRecurrence,
  resumeTaskRecurrence,
  skipOccurrence,
  TaskChecklistMutationError,
  TaskRecurrenceMutationError,
} from "./task-mutations";

const ROUTINE = `---
type: task
id: t_morning
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-20
    at: "07:00"
    duration: 45m
  repeat:
    start: 2026-08-20
    rrule: FREQ=DAILY
    anchor: schedule
    missed: carry
    resetChecklist: true
    lastCompletedAt: 2026-08-19T07:45:00.000Z
    completionCount: 0
---

# Morning routine
## Notes
- [x] Keep this historical box
## Checklist
- [x] Shower
- [ ] Breakfast
`;

describe("task mutations", () => {
  it("rolls a recurring task forward and resets every lightweight checklist item", () => {
    const parsed = parseTaskDocument(ROUTINE, "morning.md");
    expect(parsed?.kind).toBe("task");
    const next = completeTaskDocument(parsed!, "2026-08-20T07:52:00+01:00");
    expect(next.kind).toBe("task");
    if (next.kind !== "task") return;
    expect(next.task.status).toBe("open");
    expect(next.task.plan?.date).toBe("2026-08-21");
    expect(next.task.repeat?.completionCount).toBe(1);
    expect(next.body).toContain("- [ ] Keep this historical box");
    expect(next.body).toMatch(/## Checklist\n- \[ \] Shower\n- \[ \] Breakfast/);
  });

  it("skips an occurrence without recording completion", () => {
    const parsed = parseTaskDocument(ROUTINE, "morning.md");
    const next = skipOccurrence(parsed!, "2026-08-21T00:00:00Z");
    if (next.kind !== "task") return;
    expect(next.task.status).toBe("open");
    expect(next.task.plan?.date).toBe("2026-08-21");
    expect(next.task.repeat?.completionCount).toBe(0);
  });

  it("sets and clears the normalized recurrence object", () => {
    const parsed = parseTaskDocument(ROUTINE, "morning.md");
    const changed = setTaskRepeat(
      parsed!,
      {
        start: "2026-08-20",
        rrule: "FREQ=WEEKLY;INTERVAL=2",
        anchor: "completion",
        missed: "carry",
        resetChecklist: true,
      },
      "2026-08-20T10:00:00Z",
    );
    expect(changed.task.repeat).toMatchObject({
      rrule: "FREQ=WEEKLY;INTERVAL=2",
      anchor: "completion",
      resetChecklist: true,
      lastCompletedAt: "2026-08-19T07:45:00.000Z",
      completionCount: 0,
    });
    expect(
      setTaskRepeat(changed, undefined, "2026-08-20T10:01:00Z").task.repeat,
    ).toBeUndefined();
  });

  it("uses calendar monthly rules and clears the active plan on exhaustion", () => {
    const parsed = parseTaskDocument(
      ROUTINE.replace("FREQ=DAILY", "FREQ=MONTHLY;COUNT=2").replace(
        /date: 2026-08-20/g,
        "date: 2026-08-31",
      ).replace("start: 2026-08-20", "start: 2026-08-31"),
      "month-end.md",
    );
    const first = completeTaskDocument(
      parsed!,
      "2026-08-31T08:00:00+01:00",
      "2026-08-31",
    );
    if (first.kind !== "task") return;
    expect(first.task.plan?.date).toBe("2026-10-31");
    const exhausted = completeTaskDocument(
      first,
      "2026-10-31T08:00:00Z",
      "2026-10-31",
    );
    if (exhausted.kind !== "task") return;
    expect(exhausted.task.status).toBe("open");
    expect(exhausted.task.plan).toBeUndefined();
    expect(exhausted.task.repeat?.completionCount).toBe(2);
  });

  it("establishes a completion anchor on first completion", () => {
    const parsed = parseTaskDocument(
      ROUTINE.replace("    start: 2026-08-20\n", "").replace(
        "anchor: schedule",
        "anchor: completion",
      ),
      "completion-anchor.md",
    );
    const next = completeTaskDocument(
      parsed!,
      "2026-08-22T18:00:00+01:00",
      "2026-08-22",
    );
    if (next.kind !== "task") return;
    expect(next.task.repeat?.start).toBe("2026-08-22");
    expect(next.task.plan?.date).toBe("2026-08-23");
  });

  it("persists inclusive pause ranges and resumes from the action date", () => {
    const parsed = parseTaskDocument(ROUTINE, "morning.md");
    const paused = pauseTaskRecurrence(
      parsed!,
      "2026-08-20T09:00:00+01:00",
      "2026-08-20",
    );
    expect(paused.task.repeat).toMatchObject({
      paused: true,
      pausedSince: "2026-08-20",
    });
    const resumed = resumeTaskRecurrence(
      paused,
      "2026-08-24T09:00:00+01:00",
      "2026-08-24",
    );
    expect(resumed.task.repeat).toMatchObject({
      paused: false,
      pauseRanges: [{ start: "2026-08-20", end: "2026-08-23" }],
    });
    expect(resumed.task.repeat?.pausedSince).toBeUndefined();
    expect(resumed.task.plan?.date).toBe("2026-08-24");
  });

  it("blocks legacy and unsupported recurrence advancement", () => {
    const legacy = parseTaskDocument(
      ROUTINE.replace(
        /start: 2026-08-20\n    rrule: FREQ=DAILY\n    anchor: schedule\n    missed: carry/,
        "frequency: daily\n    interval: 1\n    anchor: schedule",
      ),
      "legacy.md",
    );
    expect(() => completeTaskDocument(legacy!, "2026-08-20T08:00:00Z")).toThrow(
      TaskRecurrenceMutationError,
    );
    const unsupported = parseTaskDocument(
      ROUTINE.replace("FREQ=DAILY", "FREQ=HOURLY"),
      "unsupported.md",
    );
    expect(() => skipOccurrence(unsupported!, "2026-08-20T08:00:00Z")).toThrow(
      /unsupported recurrence/i,
    );
  });

  it("planning a someday task reactivates it", () => {
    const parsed = parseTaskDocument(
      `---
type: task
id: t_later
task:
  status: open
  start: someday
---
# Later
`,
      "later.md",
    );
    const next = planTaskDocument(
      parsed!,
      { date: "2026-08-22", at: "anytime" },
      "2026-08-20T12:00:00Z",
    );
    if (next.kind !== "task") return;
    expect(next.task.start).toEqual({ kind: "anytime" });
    expect(next.task.plan?.date).toBe("2026-08-22");
  });

  it("updates one checklist marker while preserving surrounding Markdown", () => {
    const parsed = parseTaskDocument(ROUTINE, "morning.md");
    const next = setTaskChecklistItemChecked(parsed!, 2, "Breakfast", true);
    expect(next.body).toBe(
      parsed!.body.replace("- [ ] Breakfast", "- [x] Breakfast"),
    );
    expect(next.checklist).toMatchObject([
      { text: "Keep this historical box", checked: true, position: 0 },
      { text: "Shower", checked: true, position: 1 },
      { text: "Breakfast", checked: true, position: 2 },
    ]);
  });

  it("rejects a stale checklist ordinal or expected label", () => {
    const parsed = parseTaskDocument(ROUTINE, "morning.md");
    expect(() =>
      setTaskChecklistItemChecked(parsed!, 2, "Pack lunch", true),
    ).toThrow(TaskChecklistMutationError);
    expect(() =>
      setTaskChecklistItemChecked(parsed!, 4, "Breakfast", true),
    ).toThrow("checklist changed");
  });
});
