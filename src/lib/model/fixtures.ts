import type {
  ApplicationBoard,
  ApplicationColumn,
  ApplicationTask,
  JobApplication,
} from "./application";
import type { CreateTaskInput, Task } from "./types";

const REFERENCE_TIMESTAMP = "2026-06-26T11:15:00.000Z";

function taskIdFromTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Builds the legacy fixture shape used only by the extracted CV catalog. */
export function createTask(input: CreateTaskInput): Task {
  const createdAt = input.createdAt ?? REFERENCE_TIMESTAMP;
  return {
    id: input.id ?? `reference-${taskIdFromTitle(input.title)}`,
    title: input.title.trim(),
    status: input.status ?? "todo",
    priority: input.priority,
    applicationId: input.applicationId,
    linkedTo: input.linkedTo,
    dueAt: input.dueAt ?? input.deadline,
    scheduledAt: input.scheduledAt ?? input.planDate,
    when: input.when,
    inbox: input.inbox,
    start: input.start,
    planDate: input.planDate,
    planAt: input.planAt,
    planDuration: input.planDuration,
    repeat: input.repeat,
    deadline: input.deadline ?? input.dueAt,
    listId: input.listId,
    areas: [...(input.areas ?? [])],
    tags: [...(input.tags ?? [])],
    completedAt: input.completedAt,
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
    order: input.order,
    todayOrder: input.todayOrder,
    areaOrder: input.areaOrder,
    sourcePath: input.sourcePath,
    checklistTotal: input.checklistTotal,
    checklistCompleted: input.checklistCompleted,
    notes: input.notes ?? "",
  };
}

const columns: ApplicationColumn[] = [
  {
    id: "saved",
    title: "Saved",
    color: "#8b8f97",
    description: "Roles being considered",
  },
  {
    id: "applied",
    title: "Applied",
    color: "#5b8def",
    description: "Submitted applications",
  },
  {
    id: "interview",
    title: "Interview",
    color: "#9b6ee8",
    description: "Active interviews",
  },
];

function applicationTasks(applicationId: string): ApplicationTask[] {
  return [
    {
      id: `${applicationId}-task-1`,
      body: "Tailor the CV for platform ownership",
      done: false,
      status: "todo",
      priority: "high",
      dueAt: "2026-07-02",
      when: "today",
      areas: ["Applications"],
      notes: "Emphasize reliability, Kubernetes, and payment continuity.",
      createdAt: "2026-06-20T09:00:00.000Z",
      updatedAt: REFERENCE_TIMESTAMP,
      order: 1024,
    },
    {
      id: `${applicationId}-task-2`,
      body: "Prepare interview examples",
      done: false,
      status: "waiting",
      priority: "medium",
      scheduledAt: "2026-07-05",
      when: "anytime",
      linkedTo: {
        type: "stage",
        ref: "technical-interview",
        stageId: "technical",
      },
      areas: ["Applications", "Prep"],
      notes: "Use the incident response and migration examples.",
      createdAt: "2026-06-21T09:00:00.000Z",
      updatedAt: REFERENCE_TIMESTAMP,
      order: 2048,
    },
    {
      id: `${applicationId}-task-3`,
      body: "Save the recruiter follow-up",
      done: true,
      status: "done",
      completedAt: "2026-06-25T16:30:00.000Z",
      areas: ["Applications"],
      createdAt: "2026-06-22T09:00:00.000Z",
      updatedAt: "2026-06-25T16:30:00.000Z",
      order: 3072,
    },
  ];
}

function application(
  id: string,
  company: string,
  role: string,
  status: JobApplication["status"],
): JobApplication {
  const tasks = applicationTasks(id);
  return {
    id,
    company,
    role,
    status,
    sortOrder: 1024,
    sourcePath: `reference/applications/${id}.md`,
    tags: ["platform", "reference"],
    contacts: ["Alex Morgan"],
    createdAt: "2026-06-20T09:00:00.000Z",
    updatedAt: REFERENCE_TIMESTAMP,
    steps: {
      done: tasks.filter((task) => task.done).length,
      total: tasks.length,
    },
    tasks,
    notes: "Synthetic reference fixture copied from the CV catalog boundary.",
  };
}

export const sampleApplicationBoard: ApplicationBoard = {
  id: "reference-application-board",
  title: "Applications",
  description: "Synthetic data for the extracted Tasks reference catalog.",
  columns,
  applications: [
    application(
      "nova-bank-platform-lead",
      "Nova Bank",
      "Staff Platform Engineer",
      "saved",
    ),
    application(
      "atlas-ai-infra",
      "Atlas AI",
      "Engineering Manager, Infrastructure",
      "applied",
    ),
    application(
      "helix-design-systems",
      "Helix",
      "Senior Product Designer",
      "interview",
    ),
  ],
};
