import type { CanonicalTaskStatus, ParsedTaskFile, TaskDocument } from "./task-document";

export type TaskView =
  | "inbox"
  | "today"
  | "anytime"
  | "upcoming"
  | "someday"
  | "completed"
  | "logbook"
  | "review";

export type TaskSummary = {
  id: string;
  path: string;
  title: string;
  kind: "task" | "task-list" | "task-list-navigation";
  status: CanonicalTaskStatus | "active" | "archived";
  inbox: boolean;
  startKind: "anytime" | "someday" | "date";
  startDate?: string;
  planDate?: string;
  planKind?: "anytime" | "morning" | "afternoon" | "evening" | "time";
  planTime?: string;
  durationMinutes?: number;
  deadline?: string;
  completedAt?: string;
  checklistTotal: number;
  checklistCompleted: number;
  commentCount: number;
};

export function isTaskDocument(document: ParsedTaskFile): document is TaskDocument {
  return document.kind === "task";
}

export function taskDocumentToSummary(document: ParsedTaskFile): TaskSummary {
  if (document.kind === "task-list-navigation") {
    return {
      id: document.id,
      path: document.path,
      title: document.title,
      kind: "task-list-navigation",
      status: "active",
      inbox: false,
      startKind: "anytime",
      checklistTotal: 0,
      checklistCompleted: 0,
      commentCount: 0,
    };
  }
  if (document.kind === "task-list") {
    return {
      id: document.id,
      path: document.path,
      title: document.title,
      kind: "task-list",
      status: document.list.status,
      inbox: false,
      startKind: "anytime",
      checklistTotal: 0,
      checklistCompleted: 0,
      commentCount: 0,
    };
  }
  return {
    id: document.id,
    path: document.path,
    title: document.title,
    kind: "task",
    status: document.task.status,
    inbox: document.task.inbox,
    startKind: document.task.start.kind,
    startDate:
      document.task.start.kind === "date" ? document.task.start.date : undefined,
    planDate: document.task.plan?.date,
    planKind: document.task.plan?.at,
    planTime: document.task.plan?.time,
    durationMinutes: document.task.plan?.durationMinutes,
    deadline: document.task.deadline,
    completedAt: document.task.completedAt,
    checklistTotal: document.checklist.length,
    checklistCompleted: document.checklist.filter((item) => item.checked).length,
    commentCount: document.task.comments.length,
  };
}

function isOpenTask(summary: TaskSummary): boolean {
  return summary.kind === "task" && summary.status === "open";
}

function startIsActionable(summary: TaskSummary, today: string): boolean {
  if (summary.startKind === "anytime") return true;
  if (summary.startKind === "date") {
    return Boolean(summary.startDate && summary.startDate <= today);
  }
  return false;
}

export function matchesTaskView(
  summary: TaskSummary,
  view: TaskView,
  today: string,
): boolean {
  if (summary.kind !== "task") return false;
  switch (view) {
    case "inbox":
      return isOpenTask(summary) && summary.inbox;
    case "today":
      return (
        isOpenTask(summary) &&
        ((Boolean(summary.planDate) && summary.planDate! <= today) ||
          (Boolean(summary.deadline) && summary.deadline! <= today))
      );
    case "anytime":
      return (
        isOpenTask(summary) &&
        startIsActionable(summary, today) &&
        !summary.planDate
      );
    case "upcoming":
      return (
        isOpenTask(summary) &&
        ((Boolean(summary.startDate) && summary.startDate! > today) ||
          (Boolean(summary.planDate) && summary.planDate! > today) ||
          (Boolean(summary.deadline) && summary.deadline! > today))
      );
    case "someday":
      return isOpenTask(summary) && summary.startKind === "someday";
    case "completed":
      return summary.status === "completed";
    case "logbook":
      return summary.status === "completed" || summary.status === "canceled";
    case "review":
      return (
        isOpenTask(summary) &&
        Boolean(summary.planDate) &&
        summary.planDate! < today
      );
    default:
      return false;
  }
}

export function selectTaskView(
  summaries: TaskSummary[],
  view: TaskView,
  today: string,
): TaskSummary[] {
  return summaries.filter((summary) => matchesTaskView(summary, view, today));
}
