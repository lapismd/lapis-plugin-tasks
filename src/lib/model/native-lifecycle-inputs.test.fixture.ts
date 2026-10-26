import type { TasksDayPartSettings } from "../tasks-settings";

export type LifecycleAction = {
  type: "complete" | "skip";
  at: string;
  localDate: string;
  trackedValue?: number;
};
export type LifecycleInput = {
  name: string;
  path: string;
  raw: string;
  actions: LifecycleAction[];
  settings: TasksDayPartSettings;
  daily: Record<string, string>;
  dailyPath?: string;
  failTaskWrites?: number;
  failDailyWrites?: number;
};
const settings = { afternoonStartsAt: "12:00", eveningStartsAt: "17:00" };
const today = "2026-08-20";
const at = `${today}T09:00:00Z`;
const daily = `---\ntype: daily-note\ndate: ${today}\n---\n\n# Day 📝\n\nPersonal notes.\n`;
function raw(repeat: string, tracking: string, plan = `  plan:\n    date: ${today}\n    at: morning\n`) {
  return `---\ntype: task\nid: read\nopaque: preserve\ntask:\n  status: open\n  inbox: false\n  start: anytime\n${plan}${repeat}${tracking}  comments: []\n---\n\n# Read 📝\n\n- [x] First\n- [ ] Second\n`;
}
const schedule = `  repeat:\n    start: ${today}\n    rrule: FREQ=DAILY\n    anchor: schedule\n    missed: carry\n`;
const completion = schedule.replace("anchor: schedule", "anchor: completion");
const variants = {
  ordinary: "",
  schedule,
  completion,
  "completion-without-start": completion.replace(`    start: ${today}\n`, ""),
  paused: schedule + "    paused: true\n",
  exhausted: schedule.replace("FREQ=DAILY", "FREQ=DAILY;COUNT=1").replace(today, "2026-08-19"),
  unsupported: schedule.replace("FREQ=DAILY", "FREQ=DAILY;BYHOUR=12"),
};
const tracking = {
  none: "",
  boolean: "  tracking:\n    type: boolean\n",
  count: "  tracking:\n    type: count\n    unit: pages\n    target: 8\n",
  duration: "  tracking:\n    type: duration\n    targetMinutes: 30\n",
  number: "  tracking:\n    type: number\n    unit: kg\n",
};
function input(name: string, source: string, action: "complete" | "skip", value?: number): LifecycleInput {
  return { name, raw: source, path: "tasks/Read.md", settings,
    actions: [{ type: action, at, localDate: today, ...(value === undefined ? {} : { trackedValue: value }) }],
    daily: { [`daily/${today}.md`]: daily } };
}
export function lifecycleInputs(): LifecycleInput[] {
  const cases: LifecycleInput[] = [];
  for (const action of ["complete", "skip"] as const) {
    for (const [kind, repeat] of Object.entries(variants)) {
      for (const [type, value] of Object.entries(tracking)) {
        cases.push(input(`${action} / ${kind} / ${type}`, raw(repeat, value), action, type === "boolean" || type === "none" ? undefined : 8));
      }
    }
  }
  const recurring = raw(schedule, tracking.count);
  const retry = input("failed Task write then retry", recurring, "complete", 8);
  retry.failTaskWrites = 1;
  retry.actions.push({ ...retry.actions[0]! });
  cases.push(retry);
  const failedDaily = input("failed daily write then retry", recurring, "complete", 8);
  failedDaily.failDailyWrites = 1;
  failedDaily.actions.push({ ...failedDaily.actions[0]! });
  cases.push(failedDaily);
  const followingSkip = input("complete then next-day skip", recurring, "complete", 8);
  followingSkip.actions.push({ type: "skip", at: "2026-08-21T09:00:00Z", localDate: "2026-08-21" });
  cases.push(followingSkip);
  for (const type of ["count", "duration", "number"] as const) {
    cases.push(input(`missing ${type} value`, raw(schedule, tracking[type]), "complete"));
    for (const value of [0, -1, 1.5]) {
      cases.push(input(`invalid ${type} value ${value}`, raw(schedule, tracking[type]), "complete", value));
    }
  }
  for (const time of ["11:59", "12:00", "16:59", "17:00"]) {
    cases.push(input(`time boundary ${time}`, raw(schedule, tracking.boolean, `  plan:\n    date: ${today}\n    at: time\n    time: '${time}'\n`), "complete"));
  }
  const custom = input("existing custom daily path", recurring, "complete", 8);
  custom.dailyPath = "Journal/old-name.md";
  custom.daily = { [custom.dailyPath]: daily };
  cases.push(custom);
  const wrongDate = input("noncanonical daily date", recurring, "complete", 8);
  wrongDate.daily = { [`daily/${today}.md`]: daily.replace(today, "2026-08-19") };
  cases.push(wrongDate);
  const missing = input("daily provider creates explicit fixture seed", recurring, "complete", 8);
  missing.daily = {};
  cases.push(missing);
  const duplicate = input("duplicate daily observations", recurring, "complete", 8);
  const observation = "- [ ] [Read](../tasks/Read.md) <!-- task-occurrence task=read date=2026-08-20 kind=count -->\n";
  duplicate.daily = { [`daily/${today}.md`]: daily + observation.repeat(2) };
  cases.push(duplicate);
  cases.push(input("ordinary Markdown refuses lifecycle", "# Ordinary\n", "complete"));
  cases.push(input("Task List refuses lifecycle", "---\ntype: task-list\nid: list\n---\n# List\n", "complete"));
  return cases;
}
