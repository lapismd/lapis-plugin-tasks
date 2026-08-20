import { catalogTaskFromDocument } from "./catalog-adapter";
import { parseTaskDocument, type ParsedTaskFile } from "./task-document";
import type { Task } from "./types";

export const PLANNER_FIXTURE_TODAY = "2026-08-19";

export type PlannerMarkdownFixture = {
  path: string;
  raw: string;
  applicationId?: string;
};

export const plannerMarkdownFixtures: PlannerMarkdownFixture[] = [
  {
    path: "lists.md",
    raw: `---
type: task-list-navigation
id: lists-nav
---
# Lists

## Applications
- [Applications](./lists/applications.md)

## Docs
- [Docs](./lists/docs.md)

## CV
- [CV](./lists/cv.md)
`,
  },
  {
    path: "lists/applications.md",
    raw: `---
type: task-list
id: list-applications
list:
  status: active
---
# Applications

## Items
- [Tailor platform CV variant](../inbox/today-1.md)
- [Review interview notes](../inbox/today-2.md)
- [Send follow-up email](../inbox/evening.md)
- [Prepare model serving examples](../upcoming/serving.md)
- [Organize reference letters](../anytime/letters.md)
- [Submit Nova Bank application](../logbook/nova.md)
`,
  },
  {
    path: "lists/docs.md",
    raw: `---
type: task-list
id: list-docs
list:
  status: active
---
# Docs

## Items
- [Writing](./writing.md)
- [Draft design critique](../upcoming/critique.md)
- [Write flashcards for system design](../inbox/docs-1.md)
`,
  },
  {
    path: "lists/writing.md",
    raw: `---
type: task-list
id: list-writing
list:
  status: active
---
# Writing

## Items
`,
  },
  {
    path: "lists/cv.md",
    raw: `---
type: task-list
id: list-cv
list:
  status: active
---
# CV

## Items
- [Update portfolio case study](../anytime/portfolio.md)
- [Explore conference talks](../someday/talks.md)
`,
  },
  {
    path: "inbox/capture.md",
    raw: `---
type: task
id: story-task-inbox
task:
  status: open
  inbox: true
  start: anytime
---
# Capture release risk
`,
  },
  {
    path: "review/overdue.md",
    raw: `---
type: task
id: story-task-review
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-18
    at: anytime
---
# Finish yesterday's review
`,
  },
  {
    path: "inbox/today-1.md",
    applicationId: "nova-bank-platform-lead",
    raw: `---
type: task
id: story-task-today-1
created: 2026-06-20T09:00:00.000Z
updated: 2026-06-26T11:15:00.000Z
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-19
    at: anytime
  deadline: 2026-08-19
---
# Tailor platform CV variant
`,
  },
  {
    path: "inbox/today-2.md",
    applicationId: "atlas-ai-infra",
    raw: `---
type: task
id: story-task-today-2
created: 2026-06-21T09:00:00.000Z
updated: 2026-06-26T12:00:00.000Z
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-19
    at: anytime
  deadline: 2026-08-19
---
# Review interview notes

## Atlas AI loop

Capture the strongest signals from the infra interview before drafting the follow-up.

### What landed well

- Framing reliability work as product leverage, not only ops toil
- Concrete ownership of the multi-region failover story
- Clear trade-off discussion around build vs buy for the control plane

### Follow-ups

1. Pull the incident timeline from the shared doc and trim it to three beats
2. Note the Kubernetes upgrade cadence they mentioned for Q3
3. Prepare one sharper example of mentoring across platform + app teams

### Working draft

The panel responded well when the story stayed concrete: who felt the outage,
what changed in the runbook, and how the next upgrade window was protected.
Keep the rewrite focused on decision quality and cross-team coordination
instead of a laundry list of tools.

> Re-read the whiteboard notes before sending anything externally.

Also skim the earlier recruiter thread for any constraints on timeline or
comp that should shape the thank-you note.
`,
  },
  {
    path: "inbox/morning.md",
    raw: `---
type: task
id: story-task-morning
created: 2026-08-10T08:00:00.000Z
updated: 2026-08-18T09:00:00.000Z
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-19
    at: morning
---
# Prepare the morning brief
`,
  },
  {
    path: "inbox/afternoon-boundary.md",
    raw: `---
type: task
id: story-task-afternoon-boundary
created: 2026-08-10T08:00:00.000Z
updated: 2026-08-18T09:30:00.000Z
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-19
    at: "12:00"
---
# Review the midday handoff
`,
  },
  {
    path: "inbox/evening.md",
    applicationId: "nova-bank-platform-lead",
    raw: `---
type: task
id: story-task-evening
created: 2026-06-22T09:00:00.000Z
updated: 2026-06-26T13:00:00.000Z
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-19
    at: evening
  deadline: 2026-08-19
---
# Send follow-up email
`,
  },
  {
    path: "logbook/today-done.md",
    raw: `---
type: task
id: story-task-today-done
created: 2026-08-18T08:00:00.000Z
updated: 2026-08-19T10:30:00.000Z
task:
  status: completed
  completedAt: 2026-08-19T10:30:00.000Z
  start: anytime
  plan:
    date: 2026-08-19
    at: morning
---
# Publish the daily status
`,
  },
  {
    path: "logbook/today-canceled.md",
    raw: `---
type: task
id: story-task-today-canceled
created: 2026-08-18T08:00:00.000Z
updated: 2026-08-19T11:00:00.000Z
task:
  status: canceled
  completedAt: 2026-08-19T11:00:00.000Z
  start: anytime
  plan:
    date: 2026-08-19
    at: afternoon
---
# Cancel the duplicate reminder
`,
  },
  {
    path: "upcoming/serving.md",
    applicationId: "atlas-ai-infra",
    raw: `---
type: task
id: story-task-upcoming-1
created: 2026-06-17T15:30:00.000Z
updated: 2026-06-25T16:40:00.000Z
task:
  status: open
  start: anytime
  deadline: 2026-08-25
---
# Prepare model serving examples
`,
  },
  {
    path: "upcoming/critique.md",
    applicationId: "helix-design-systems",
    raw: `---
type: task
id: story-task-upcoming-2
created: 2026-06-18T10:00:00.000Z
updated: 2026-06-25T10:00:00.000Z
task:
  status: open
  start: anytime
  deadline: 2026-08-22
---
# Draft design critique
`,
  },
  {
    path: "anytime/portfolio.md",
    raw: `---
type: task
id: story-task-anytime-1
created: 2026-06-10T08:00:00.000Z
updated: 2026-06-20T08:00:00.000Z
task:
  status: open
  start: anytime
---
# Update portfolio case study
`,
  },
  {
    path: "anytime/letters.md",
    raw: `---
type: task
id: story-task-anytime-2
created: 2026-06-11T08:00:00.000Z
updated: 2026-06-21T08:00:00.000Z
task:
  status: open
  start: anytime
---
# Organize reference letters
`,
  },
  {
    path: "inbox/docs-1.md",
    raw: `---
type: task
id: story-task-docs-1
created: 2026-06-19T08:00:00.000Z
updated: 2026-06-24T08:00:00.000Z
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-19
    at: anytime
  deadline: 2026-08-19
---
# Write flashcards for system design
`,
  },
  {
    path: "someday/talks.md",
    raw: `---
type: task
id: story-task-someday
created: 2026-05-01T08:00:00.000Z
updated: 2026-06-01T08:00:00.000Z
task:
  status: open
  start: someday
---
# Explore conference talks
`,
  },
  {
    path: "logbook/nova.md",
    applicationId: "nova-bank-platform-lead",
    raw: `---
type: task
id: story-task-done
created: 2026-06-15T08:00:00.000Z
updated: 2026-06-28T18:00:00.000Z
task:
  status: completed
  completedAt: 2026-06-28T18:00:00.000Z
  start: anytime
  deadline: 2026-06-28
---
# Submit Nova Bank application
`,
  },
];

export function parsePlannerFixtures(): ParsedTaskFile[] {
  return plannerMarkdownFixtures.map((fixture) => {
    const document = parseTaskDocument(fixture.raw, fixture.path);
    if (!document) throw new Error(`Invalid planner fixture ${fixture.path}`);
    return document;
  });
}

function listTitleForPath(path: string): { listId: string; title: string } | null {
  const documents = parsePlannerFixtures();
  for (const document of documents) {
    if (document.kind !== "task-list") continue;
    if (
      document.structuralLinks.some(
        (link) =>
          link.kind === "list-item" &&
          (link.href === path || link.href.endsWith(`/${path.split("/").pop()}`)),
      )
    ) {
      return { listId: document.id, title: document.title };
    }
  }
  return null;
}

export function catalogTasksFromPlannerFixtures(): Task[] {
  const applicationIds = new Map(
    plannerMarkdownFixtures
      .filter((fixture) => fixture.applicationId)
      .map((fixture) => [fixture.path, fixture.applicationId!]),
  );
  return parsePlannerFixtures()
    .filter((document) => document.kind === "task")
    .map((document) => {
      const task = catalogTaskFromDocument(document);
      const membership = listTitleForPath(document.path);
      return {
        ...task,
        applicationId: applicationIds.get(document.path),
        listId: membership?.listId,
        areas: membership ? [membership.title] : [],
        createdAt: document.created ?? task.createdAt,
        updatedAt: document.updated ?? task.updatedAt,
      };
    });
}

export function plannerListTitles(): string[] {
  return parsePlannerFixtures()
    .filter((document) => document.kind === "task-list")
    .map((document) => document.title);
}
