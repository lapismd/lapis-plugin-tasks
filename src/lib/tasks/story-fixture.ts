import {
  sampleApplicationBoard,
  type JobApplication,
  type ApplicationBoard,
} from "../model";
import { createTask, type Task } from "../model";

export { sampleApplicationBoard };

export function sampleBoardApplication(
  board: ApplicationBoard = sampleApplicationBoard,
): JobApplication {
  const application = board.applications[0];
  if (!application) throw new Error("sampleApplicationBoard has no applications");
  return application;
}

export function noop() {}

export const samplePlannerApplicationSummaries = {
  "nova-bank-platform-lead": {
    title: "Nova Bank",
    subtitle: "Staff Platform Engineer",
  },
  "atlas-ai-infra": {
    title: "Atlas AI",
    subtitle: "Engineering Manager, Infrastructure",
  },
  "helix-design-systems": {
    title: "Helix",
    subtitle: "Senior Product Designer",
  },
} as const;

/** Rich fixture set for TaskPlanner and application task stories. */
export function samplePlannerTasks(): Task[] {
  const base = "2026-07-";
  return [
    createTask({
      id: "story-task-today-1",
      title: "Tailor platform CV variant",
      status: "todo",
      when: "today",
      dueAt: `${base}02`,
      areas: ["Applications"],
      applicationId: "nova-bank-platform-lead",
      createdAt: "2026-06-20T09:00:00.000Z",
      updatedAt: "2026-06-26T11:15:00.000Z",
    }),
    createTask({
      id: "story-task-today-2",
      title: "Review interview notes",
      status: "todo",
      when: "today",
      dueAt: `${base}02`,
      areas: ["Applications"],
      applicationId: "atlas-ai-infra",
      createdAt: "2026-06-21T09:00:00.000Z",
      updatedAt: "2026-06-26T12:00:00.000Z",
      notes: [
        "## Atlas AI loop",
        "",
        "Capture the strongest signals from the infra interview before drafting the follow-up.",
        "",
        "### What landed well",
        "",
        "- Framing reliability work as product leverage, not only ops toil",
        "- Concrete ownership of the multi-region failover story",
        "- Clear trade-off discussion around build vs buy for the control plane",
        "",
        "### Follow-ups",
        "",
        "1. Pull the incident timeline from the shared doc and trim it to three beats",
        "2. Note the Kubernetes upgrade cadence they mentioned for Q3",
        "3. Prepare one sharper example of mentoring across platform + app teams",
        "",
        "### Working draft",
        "",
        "The panel responded well when the story stayed concrete: who felt the outage,",
        "what changed in the runbook, and how the next upgrade window was protected.",
        "Keep the rewrite focused on decision quality and cross-team coordination",
        "instead of a laundry list of tools.",
        "",
        "> Re-read the whiteboard notes before sending anything externally.",
        "",
        "Also skim the earlier recruiter thread for any constraints on timeline or",
        "comp that should shape the thank-you note.",
      ].join("\n"),
    }),
    createTask({
      id: "story-task-evening",
      title: "Send follow-up email",
      status: "todo",
      when: "this-evening",
      dueAt: `${base}02`,
      areas: ["Applications"],
      applicationId: "nova-bank-platform-lead",
      createdAt: "2026-06-22T09:00:00.000Z",
      updatedAt: "2026-06-26T13:00:00.000Z",
    }),
    createTask({
      id: "story-task-upcoming-1",
      title: "Prepare model serving examples",
      status: "todo",
      when: "anytime",
      dueAt: `${base}05`,
      areas: ["Applications"],
      applicationId: "atlas-ai-infra",
      createdAt: "2026-06-17T15:30:00.000Z",
      updatedAt: "2026-06-25T16:40:00.000Z",
    }),
    createTask({
      id: "story-task-upcoming-2",
      title: "Draft design critique",
      status: "todo",
      when: "anytime",
      dueAt: `${base}08`,
      areas: ["Docs"],
      applicationId: "helix-design-systems",
      createdAt: "2026-06-18T10:00:00.000Z",
      updatedAt: "2026-06-25T10:00:00.000Z",
    }),
    createTask({
      id: "story-task-anytime-1",
      title: "Update portfolio case study",
      status: "todo",
      when: "anytime",
      areas: ["CV"],
      createdAt: "2026-06-10T08:00:00.000Z",
      updatedAt: "2026-06-20T08:00:00.000Z",
    }),
    createTask({
      id: "story-task-anytime-2",
      title: "Organize reference letters",
      status: "todo",
      when: "anytime",
      areas: ["Applications", "CV"],
      createdAt: "2026-06-11T08:00:00.000Z",
      updatedAt: "2026-06-21T08:00:00.000Z",
    }),
    createTask({
      id: "story-task-docs-1",
      title: "Write flashcards for system design",
      status: "todo",
      when: "today",
      dueAt: `${base}02`,
      areas: ["Docs"],
      createdAt: "2026-06-19T08:00:00.000Z",
      updatedAt: "2026-06-24T08:00:00.000Z",
    }),
    createTask({
      id: "story-task-someday",
      title: "Explore conference talks",
      status: "todo",
      when: "someday",
      areas: ["CV"],
      createdAt: "2026-05-01T08:00:00.000Z",
      updatedAt: "2026-06-01T08:00:00.000Z",
    }),
    createTask({
      id: "story-task-done",
      title: "Submit Nova Bank application",
      status: "done",
      when: "today",
      dueAt: "2026-06-28",
      areas: ["Applications"],
      applicationId: "nova-bank-platform-lead",
      createdAt: "2026-06-15T08:00:00.000Z",
      updatedAt: "2026-06-28T18:00:00.000Z",
    }),
  ];
}
