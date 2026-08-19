import type { ApplicationTaskAdapter, TaskPriority } from "./types";

/**
 * CV application data retained only to drive the extracted reference stories.
 * It is not part of the canonical Tasks resource contract.
 */
export type ApplicationStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected";

export type ApplicationColumn = {
  id: ApplicationStatus;
  title: string;
  color: string;
  description: string;
};

export type ApplicationReaction = {
  emoji: string;
  actor: string;
  createdAt: string;
  updatedAt?: string;
};

export type JobApplication = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  sortOrder: number;
  sourcePath: string;
  url?: string;
  location?: string;
  salary?: string;
  tags: string[];
  contacts: string[];
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
  followUpAt?: string;
  pinned?: boolean;
  comments?: number;
  boosts?: number;
  reactions?: ApplicationReaction[];
  steps?: {
    done: number;
    total: number;
  };
  tasks?: ApplicationTask[];
  notes: string;
};

export type ApplicationTaskPriority = TaskPriority;
export type ApplicationTask = ApplicationTaskAdapter;

export type ApplicationBoard = {
  id: string;
  title: string;
  description: string;
  columns: ApplicationColumn[];
  applications: JobApplication[];
};

export function buildPlannerApplicationSummaries(board: ApplicationBoard) {
  const colors = new Map(
    board.columns.map((column) => [column.id, column.color]),
  );
  return Object.fromEntries(
    board.applications.map((application) => [
      application.id,
      {
        title: application.company,
        subtitle: application.role,
        color: colors.get(application.status),
      },
    ]),
  );
}
