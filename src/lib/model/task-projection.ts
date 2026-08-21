import type { AppDatabaseTaskRecord } from "@lapis-notes/api/app-database";
import {
  TASK_PROJECTION_VERSION,
  type ParsedTaskFile,
} from "./task-document";
import { resolveEffectiveOccurrence } from "./effective-occurrence";
import { todayDateOnly } from "./task-dates";
import type { LocalDateString } from "./recurrence-engine";

export function projectTask(
  document: ParsedTaskFile,
  today = todayDateOnly(),
): AppDatabaseTaskRecord {
  if (document.kind === "task-list-navigation") {
    return {
      documentPath: document.path,
      documentId: document.id,
      kind: "task-list-navigation" as AppDatabaseTaskRecord["kind"],
      title: document.title,
      status: "active",
      inbox: false,
      startKind: "anytime",
      checklistTotal: 0,
      checklistCompleted: 0,
      commentCount: 0,
      projectionVersion: TASK_PROJECTION_VERSION,
    };
  }
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
  const effective = document.task.repeat
    ? resolveEffectiveOccurrence(
        document.task.repeat,
        document.task.plan?.date as LocalDateString | undefined,
        today as LocalDateString,
      )
    : null;
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
    repeat: document.task.repeat ?? null,
    tracking: document.task.tracking ?? null,
    effectiveOccurrenceDate: effective?.date ?? null,
    effectiveOccurrenceState: effective?.state ?? null,
    effectiveForDate: effective?.effectiveForDate ?? null,
    checklistTotal: document.checklist.length,
    checklistCompleted: document.checklist.filter((item) => item.checked).length,
    commentCount: document.task.comments.length,
    projectionVersion: TASK_PROJECTION_VERSION,
  };
}
