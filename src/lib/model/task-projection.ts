import type { AppDatabaseTaskRecord } from "@lapis-notes/api/app-database";
import {
  TASK_PROJECTION_VERSION,
  type ParsedTaskFile,
} from "./task-document";

export function projectTask(document: ParsedTaskFile): AppDatabaseTaskRecord {
  if (document.kind === "task-list") {
    return {
      documentPath: document.path,
      documentId: document.id,
      kind: "task-list",
      title: document.title,
      status: document.list.status,
      inbox: false,
      startKind: "anytime",
      checklistTotal: 0,
      checklistCompleted: 0,
      commentCount: 0,
      projectionVersion: TASK_PROJECTION_VERSION,
    };
  }
  return {
    documentPath: document.path,
    documentId: document.id,
    kind: "task",
    title: document.title,
    status: document.task.status,
    inbox: document.task.inbox,
    startKind: document.task.start.kind,
    startDate:
      document.task.start.kind === "date" ? document.task.start.date : null,
    planDate: document.task.plan?.date ?? null,
    planKind: document.task.plan?.at ?? null,
    planTime: document.task.plan?.time ?? null,
    durationMinutes: document.task.plan?.durationMinutes ?? null,
    deadline: document.task.deadline ?? null,
    completedAt: document.task.completedAt ?? null,
    repeatStrategy: document.task.repeat?.strategy ?? null,
    repeatFrequency: document.task.repeat?.frequency ?? null,
    repeatInterval: document.task.repeat?.interval ?? null,
    repeatAnchor: document.task.repeat?.anchor ?? null,
    checklistTotal: document.checklist.length,
    checklistCompleted: document.checklist.filter((item) => item.checked).length,
    commentCount: document.task.comments.length,
    projectionVersion: TASK_PROJECTION_VERSION,
  };
}
