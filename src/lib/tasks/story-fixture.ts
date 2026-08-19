import {
  catalogTasksFromPlannerFixtures,
  plannerListTitles,
  sampleApplicationBoard,
  type JobApplication,
  type ApplicationBoard,
  type Task,
} from "../model";

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

export function samplePlannerListTitles(): string[] {
  return plannerListTitles();
}

/** Planner catalog tasks parsed from Markdown fixtures. */
export function samplePlannerTasks(): Task[] {
  return catalogTasksFromPlannerFixtures();
}
