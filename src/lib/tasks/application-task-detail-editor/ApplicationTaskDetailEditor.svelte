<script lang="ts">
  import "./ApplicationTaskDetailEditor.css";
  import CheckCircle2Icon from "@lucide/svelte/icons/check-circle-2";
  import CircleIcon from "@lucide/svelte/icons/circle";
  import CircleXIcon from "@lucide/svelte/icons/circle-x";
  import SignalHighIcon from "@lucide/svelte/icons/signal-high";
  import SignalLowIcon from "@lucide/svelte/icons/signal-low";
  import SignalMediumIcon from "@lucide/svelte/icons/signal-medium";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import {
    createFormConfig,
    customField,
    StructuredForm,
    autosizeTextarea,
    type InlineOptionPickerOption,
  } from "@lapismd/design-core/forms";
  import { tick } from "svelte";

  import type { ApplicationTask, ApplicationTaskPriority } from "../../model";
  import { formatCompletedTimestamp } from "../../model";
  import ApplicationTaskAreaFormField from "../application-task-area-form-field/ApplicationTaskAreaFormField.svelte";
  import ApplicationTaskInlineOptionFormField from "../application-task-inline-option-form-field/ApplicationTaskInlineOptionFormField.svelte";
  import ApplicationTaskAtFormField from "../application-task-at-form-field/ApplicationTaskAtFormField.svelte";
  import ApplicationTaskRepeatFormField from "../application-task-repeat-form-field/ApplicationTaskRepeatFormField.svelte";
  import ApplicationTaskWhenFormField from "../application-task-when-form-field/ApplicationTaskWhenFormField.svelte";
  import ApplicationMarkdownPreview from "../../model/ReferenceMarkdownPreview.svelte";

  let {
    task,
    areaOptions = [],
    showRemove = false,
    now = undefined,
    onUpdateTask = () => {},
    onRemoveTask = () => {},
  }: {
    task: ApplicationTask;
    areaOptions?: string[];
    showRemove?: boolean;
    now?: Date;
    onUpdateTask?: (taskId: string, patch: Partial<ApplicationTask>) => void;
    onRemoveTask?: (taskId: string) => void;
  } = $props();

  const statusOptions: InlineOptionPickerOption[] = [
    {
      value: "open",
      label: "Open",
      icon: CircleIcon,
      accent: "var(--kanban-foreground, var(--foreground))",
    },
    {
      value: "completed",
      label: "Completed",
      icon: CheckCircle2Icon,
      accent: "#3d9a5f",
    },
    {
      value: "canceled",
      label: "Canceled",
      icon: CircleXIcon,
      accent: "#e5484d",
    },
  ];

  const priorityOptions: InlineOptionPickerOption[] = [
    {
      value: "low",
      label: "Low",
      icon: SignalLowIcon,
      accent: "#6b9bd1",
    },
    {
      value: "medium",
      label: "Medium",
      icon: SignalMediumIcon,
      accent: "var(--kanban-muted, var(--muted-foreground))",
    },
    {
      value: "high",
      label: "High",
      icon: SignalHighIcon,
      accent: "#e5484d",
    },
  ];

  const footerFormConfig = createFormConfig<ApplicationTask>({
    id: "application-task-detail-footer",
    fields: [
      customField<ApplicationTask, undefined, string>({
        id: "task-detail-status",
        label: "Status",
        get: (value) =>
          value.status === "canceled"
            ? "canceled"
            : value.status === "completed" || value.status === "done" || value.done
              ? "completed"
              : "open",
        set: (value, status) => {
          const completed = status === "completed";
          return {
            ...value,
            status: status as ApplicationTask["status"],
            done: completed,
            completedAt: completed
              ? (value.completedAt ?? new Date().toISOString())
              : undefined,
          };
        },
        renderers: {
          edit: {
            component: ApplicationTaskInlineOptionFormField,
            wrapper: "none",
            props: {
              options: statusOptions,
              ariaLabel: "Task status",
            },
          },
        },
      }),
      customField<ApplicationTask, undefined, string>({
        id: "task-detail-priority",
        label: "Priority",
        get: (value) => value.priority ?? "medium",
        set: (value, priority) => ({
          ...value,
          priority: priority as ApplicationTaskPriority,
        }),
        renderers: {
          edit: {
            component: ApplicationTaskInlineOptionFormField,
            wrapper: "none",
            props: {
              options: priorityOptions,
              ariaLabel: "Task priority",
            },
          },
        },
      }),
      customField<ApplicationTask, undefined, string | null>({
        id: "task-detail-due-at",
        label: "Due At",
        get: (value) => value.dueAt ?? null,
        set: (value, dueAt) => ({
          ...value,
          dueAt: dueAt || undefined,
        }),
        renderers: {
          edit: {
            component: ApplicationTaskWhenFormField,
            wrapper: "none",
            props: ({ root }) => ({
              mode: "due",
              pickerId: `task-detail-due-picker-${root.id}`,
              variant: "footer",
            }),
          },
        },
      }),
      customField<
        ApplicationTask,
        undefined,
        Pick<ApplicationTask, "scheduledAt" | "when" | "start" | "planDate" | "planAt">
      >({
        id: "task-detail-when",
        label: "When",
        get: (value) => ({
          scheduledAt: value.scheduledAt,
          when: value.when,
          start: value.start,
          planDate: value.planDate,
          planAt: value.planAt,
        }),
        set: (value, schedule) => ({
          ...value,
          scheduledAt: schedule.scheduledAt,
          when: schedule.when,
          start: schedule.start,
          planDate: schedule.planDate,
          planAt: schedule.planAt,
        }),
        renderers: {
          edit: {
            component: ApplicationTaskWhenFormField,
            wrapper: "none",
            props: ({ root }) => ({
              pickerId: `task-detail-when-picker-${root.id}`,
            }),
          },
        },
      }),
      customField<
        ApplicationTask,
        undefined,
        Pick<ApplicationTask, "scheduledAt" | "when" | "start" | "planDate" | "planAt">
      >({
        id: "task-detail-at",
        label: "At",
        get: (value) => ({
          scheduledAt: value.scheduledAt,
          when: value.when,
          start: value.start,
          planDate: value.planDate,
          planAt: value.planAt,
        }),
        set: (value, schedule) => ({
          ...value,
          scheduledAt: schedule.scheduledAt,
          when: schedule.when,
          start: schedule.start,
          planDate: schedule.planDate,
          planAt: schedule.planAt,
        }),
        renderers: {
          edit: {
            component: ApplicationTaskAtFormField,
            wrapper: "none",
            props: ({ root }) => ({
              pickerId: `task-detail-at-picker-${root.id}`,
            }),
          },
        },
      }),
      customField<ApplicationTask, undefined, string[]>({
        id: "task-detail-area",
        label: "Area",
        get: (value) => value.areas ?? [],
        set: (value, areas) => ({
          ...value,
          areas,
          listId: areas[0],
        }),
        renderers: {
          edit: {
            component: ApplicationTaskAreaFormField,
            wrapper: "none",
            props: () => ({
              options: areaOptions,
              ariaLabel: "Task area",
            }),
          },
        },
      }),
      customField<ApplicationTask, undefined, ApplicationTask>({
        id: "task-detail-repeat",
        label: "Repeat",
        get: (value) => value,
        set: (_value, nextTask) => nextTask,
        renderers: {
          edit: {
            component: ApplicationTaskRepeatFormField,
            wrapper: "none",
            props: () => ({ now }),
          },
        },
      }),
    ],
  });

  let notesEditing = $state(false);
  let notesDraft = $state("");
  let notesInput = $state<HTMLTextAreaElement | null>(null);

  $effect(() => {
    if (!notesEditing) {
      notesDraft = task.notes ?? "";
    }
  });

  function saveNotes() {
    notesEditing = false;
    const nextNotes = notesDraft.trim();
    const currentNotes = task.notes?.trim() ?? "";
    if (nextNotes === currentNotes) return;
    onUpdateTask(task.id, { notes: nextNotes || undefined });
  }

  function openNotesEditor() {
    notesEditing = true;
    notesDraft = task.notes ?? "";
    void tick().then(() => notesInput?.focus());
  }

  function updateFooterTask(nextTask: ApplicationTask) {
    onUpdateTask(task.id, {
      status: nextTask.status,
      done: nextTask.done,
      completedAt: nextTask.completedAt,
      priority: nextTask.priority,
      dueAt: nextTask.dueAt,
      scheduledAt: nextTask.scheduledAt,
      when: nextTask.when,
      start: nextTask.start,
      planDate: nextTask.planDate,
      planAt: nextTask.planAt,
      areas: nextTask.areas,
      listId: nextTask.listId,
      repeat: nextTask.repeat,
      unparsedRepeat: nextTask.unparsedRepeat,
      tracking: nextTask.tracking,
      effectiveOccurrenceDate: nextTask.effectiveOccurrenceDate,
      effectiveOccurrenceState: nextTask.effectiveOccurrenceState,
      effectiveForDate: nextTask.effectiveForDate,
    });
  }
</script>

<div
  class="task-detail-editor"
  data-task-detail-editor
  data-task-preview-surface="true"
  role="group"
  aria-label={`Details for ${task.body}`}
>
  <div class="task-detail-editor__notes">
    {#if notesEditing}
      <textarea
        bind:this={notesInput}
        bind:value={notesDraft}
        rows="1"
        class="task-detail-editor__notes-input"
        placeholder="Notes"
        aria-label="Task notes"
        use:autosizeTextarea={notesDraft}
        onblur={saveNotes}
        onkeydown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            notesDraft = task.notes ?? "";
            notesEditing = false;
            notesInput?.blur();
          }
        }}
      ></textarea>
    {:else if task.notes?.trim()}
      <button
        type="button"
        class="task-detail-editor__notes-preview"
        onclick={openNotesEditor}
      >
        <ApplicationMarkdownPreview value={task.notes} compact />
      </button>
    {:else}
      <button
        type="button"
        class="task-detail-editor__notes-placeholder"
        onclick={openNotesEditor}
      >
        Notes
      </button>
    {/if}
  </div>

  <footer class="task-detail-editor__footer">
    <div class="task-detail-editor__footer-meta">
      <StructuredForm
        value={task}
        config={footerFormConfig}
        onChange={(nextTask) => updateFooterTask(nextTask as ApplicationTask)}
      />
      {#if task.done && task.completedAt}
        <span class="task-detail-editor__completed">
          Completed {formatCompletedTimestamp(task.completedAt)}
        </span>
      {/if}
    </div>

    {#if showRemove}
      <div class="task-detail-editor__footer-actions">
        <button
          type="button"
          aria-label={`Remove task ${task.body}`}
          onclick={() => onRemoveTask(task.id)}
        >
          <Trash2Icon />
        </button>
      </div>
    {/if}
  </footer>
</div>
