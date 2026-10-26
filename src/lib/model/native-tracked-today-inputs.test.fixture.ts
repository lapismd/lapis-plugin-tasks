export type TrackedTodayInput = {
  name: string;
  files: Record<string, string>;
  dates: string[];
  daily: Record<string, string>;
};

const today = "2026-08-20";
const repeat = `  repeat:\n    start: ${today}\n    rrule: FREQ=DAILY\n    anchor: schedule\n    missed: skip\n`;
const boolean = "  tracking:\n    type: boolean\n";

function scenario(
  name: string,
  options: {
    repeat?: string;
    tracking?: string;
    status?: string;
    plan?: string;
    path?: string;
    extra?: string;
    daily?: Record<string, string>;
  } = {},
): TrackedTodayInput {
  const path = options.path ?? "Habit.md";
  const raw = `---\ntype: task\nid: tracked\ntask:\n  status: ${options.status ?? "open"}\n  start: anytime\n${options.plan ?? `  plan:\n    date: ${today}\n    at: morning\n`}${options.repeat ?? repeat}${options.tracking ?? boolean}${options.extra ?? ""}---\n\n# A tracked habit\n\nAuthored Task content.\n`;
  return {
    name,
    files: { [path]: raw },
    dates: [today, today, "2026-08-21"],
    daily: options.daily ?? {},
  };
}

export function trackedTodayInputs(): TrackedTodayInput[] {
  return [
    scenario("boolean and local date refresh"),
    scenario("count at afternoon boundary", {
      tracking:
        "  tracking:\n    type: count\n    target: 8\n    unit: glasses\n",
      plan: `  plan:\n    date: ${today}\n    at: time\n    time: '12:00'\n`,
    }),
    scenario("duration at evening boundary", {
      tracking: "  tracking:\n    type: duration\n    target: 30m\n",
      plan: `  plan:\n    date: ${today}\n    at: time\n    time: '18:00'\n`,
    }),
    scenario("untracked current recurrence", { tracking: "" }),
    scenario("ordinary tracked task", { repeat: "" }),
    scenario("future recurrence", {
      repeat: repeat.replace(today, "2026-08-22"),
      plan: "  plan:\n    date: 2026-08-22\n    at: anytime\n",
    }),
    scenario("overdue carry", {
      repeat: repeat
        .replace(today, "2026-08-19")
        .replace("missed: skip", "missed: carry"),
      plan: "  plan:\n    date: 2026-08-19\n    at: anytime\n",
    }),
    scenario("paused recurrence", { repeat: repeat + "    paused: true\n" }),
    scenario("unsupported recurrence", {
      repeat: repeat.replace("FREQ=DAILY", "FREQ=HOURLY"),
    }),
    scenario("exhausted recurrence", {
      repeat: repeat
        .replace(today, "2026-08-19")
        .replace("FREQ=DAILY", "FREQ=DAILY;COUNT=1"),
      plan: "  plan:\n    date: 2026-08-19\n    at: anytime\n",
    }),
    scenario("completed current recurrence", { status: "completed" }),
    scenario("canceled current recurrence", { status: "canceled" }),
    scenario("current inbox recurrence", { extra: "  inbox: true\n" }),
    scenario("uppercase Markdown source", { path: "Habits/Current.MARKDOWN" }),
    scenario("existing authored daily at another path", {
      daily: {
        "Journal/Existing.MD": `---\ntype: daily-note\ndate: ${today}\n---\n\n# Authored day\n\nPersonal notes survive.\n`,
      },
    }),
  ];
}
