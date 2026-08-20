import { describe, expect, it } from "vitest";
import { parseTaskDocument } from "./task-document";
import {
  completeTaskDocument,
  planTaskDocument,
  setTaskChecklistItemChecked,
  skipOccurrence,
  TaskChecklistMutationError,
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
    strategy: rolling
    frequency: daily
    interval: 1
    anchor: schedule
    resetChecklist: true
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
