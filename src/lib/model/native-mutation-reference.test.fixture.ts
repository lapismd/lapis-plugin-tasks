import {
  parseTaskDocument,
  type ParsedTaskFile,
  type TaskRepeat,
} from "./task-document";
import {
  applyTaskMutation,
  cancelTaskDocument,
  completeTaskDocument,
  pauseTaskRecurrence,
  planTaskDocument,
  reopenTaskDocument,
  resumeTaskRecurrence,
  setTaskChecklistItemChecked,
  setTaskDeadline,
  setTaskInbox,
  setTaskRepeat,
  setTaskStart,
  setTaskTracking,
  skipOccurrence,
} from "./task-mutations";
import {
  capture,
  numeric,
  type Action,
  type MutationInput,
} from "./native-transform-reference.test.fixture";
export {
  captureMaterialization,
  captureCompletion,
  captureTracking,
  captureDayPart,
} from "./native-occurrence-reference.test.fixture";

function mutate(document: ParsedTaskFile, action: Action): ParsedTaskFile {
  const at = action.at!;
  switch (action.type) {
    case "checklist":
      return setTaskChecklistItemChecked(
        document,
        numeric(action.position)!,
        action.expectedText!,
        action.checked!,
      );
    case "complete":
      return completeTaskDocument(document, at, action.localDate);
    case "skip":
      return skipOccurrence(document, at, action.localDate);
    case "plan":
      return planTaskDocument(document, action.plan, at);
    case "start":
      return setTaskStart(document, action.start!, at);
    case "deadline":
      return setTaskDeadline(document, action.deadline, at);
    case "inbox":
      return setTaskInbox(document, action.inbox!, at);
    case "repeat":
      return setTaskRepeat(document, action.repeat, at);
    case "tracking":
      return setTaskTracking(document, action.tracking, at);
    case "pause":
      return pauseTaskRecurrence(document, at, action.localDate);
    case "resume":
      return resumeTaskRecurrence(document, at, action.localDate);
    case "cancel":
      return cancelTaskDocument(document, at);
    case "reopen":
      return reopenTaskDocument(document, at);
    default:
      throw new Error(`Unknown reference mutation: ${action.type}`);
  }
}
export function captureMutation(input: MutationInput): unknown {
  return capture(() => {
    let raw = input.raw;
    const steps = [];
    for (const action of input.actions) {
      let document: ParsedTaskFile | undefined;
      raw = applyTaskMutation(
        raw,
        input.path,
        (parsed) => (document = mutate(parsed, action)),
      );
      steps.push({
        document,
        raw,
        reparsed: parseTaskDocument(raw, input.path),
      });
    }
    return { raw, steps };
  });
}
export function captureNativeMutation(input: MutationInput): unknown {
  // Only newly constructed typed requests use the declared native value-field order.
  const fields = [
    "start",
    "rrule",
    "anchor",
    "missed",
    "rdate",
    "exdate",
    "resetChecklist",
    "paused",
    "pausedSince",
    "pauseRanges",
    "lastCompletedAt",
    "completionCount",
  ] as const;
  return captureMutation({
    ...input,
    actions: input.actions.map((action) =>
      action.type === "repeat" && action.repeat
        ? {
            ...action,
            repeat: Object.fromEntries(
              fields
                .filter((field) => action.repeat![field] !== undefined)
                .map((field) => [field, action.repeat![field]]),
            ) as TaskRepeat,
          }
        : action,
    ),
  });
}
