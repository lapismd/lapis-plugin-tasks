<script lang="ts">
  import CheckCircle2Icon from "@lucide/svelte/icons/check-circle-2";
  import CircleIcon from "@lucide/svelte/icons/circle";
  import CircleXIcon from "@lucide/svelte/icons/circle-x";
  import SignalHighIcon from "@lucide/svelte/icons/signal-high";
  import SignalLowIcon from "@lucide/svelte/icons/signal-low";
  import SignalMediumIcon from "@lucide/svelte/icons/signal-medium";
  import {
    createFormConfig,
    customField,
    StructuredForm,
  } from "@lapismd/design-core/forms";
  import type { InlineOptionPickerOption } from "@lapismd/design-core/forms";
  import type {
    ApplicationTask,
    ApplicationTaskPriority,
  } from "../../model";
  import type { TaskListPickerOptionInput } from "../application-task-area-picker";
  import ApplicationTaskAreaFormField from "../application-task-area-form-field/ApplicationTaskAreaFormField.svelte";
  import ApplicationTaskInlineOptionFormField from "../application-task-inline-option-form-field/ApplicationTaskInlineOptionFormField.svelte";
  import ApplicationTaskAtFormField from "../application-task-at-form-field/ApplicationTaskAtFormField.svelte";
  import ApplicationTaskRepeatFormField from "../application-task-repeat-form-field/ApplicationTaskRepeatFormField.svelte";
  import ApplicationTaskWhenFormField from "../application-task-when-form-field/ApplicationTaskWhenFormField.svelte";
  import "./ApplicationTaskMetadataActionBar.css";

  let {
    task,
    areaOptions = [],
    now = undefined,
    class: className = "",
    onChange = () => {},
  }: {
    task: ApplicationTask;
    areaOptions?: TaskListPickerOptionInput[];
    now?: Date;
    class?: string;
    onChange?: (task: ApplicationTask) => void;
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

  const metadataFormConfig = $derived.by(() =>
    createFormConfig<ApplicationTask>({
      id: "application-task-metadata-action-bar",
      fields: [
        customField<ApplicationTask, undefined, string>({
          id: "task-metadata-status",
          label: "Status",
          get: (value) =>
            value.status === "canceled"
              ? "canceled"
              : value.status === "completed" ||
                  value.status === "done" ||
                  value.done
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
          id: "task-metadata-priority",
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
          id: "task-metadata-due-at",
          label: "Due At",
          get: (value) => value.dueAt ?? null,
          set: (value, dueAt) => ({
            ...value,
            dueAt: dueAt || undefined,
            deadline: dueAt || undefined,
          }),
          renderers: {
            edit: {
              component: ApplicationTaskWhenFormField,
              wrapper: "none",
              props: ({ root }) => ({
                mode: "due",
                pickerId: `task-due-picker-${root.id}`,
                variant: "footer",
                now,
              }),
            },
          },
        }),
        customField<
          ApplicationTask,
          undefined,
          Pick<
            ApplicationTask,
            "scheduledAt" | "when" | "start" | "planDate" | "planAt"
          >
        >({
          id: "task-metadata-when",
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
                pickerId: `task-when-picker-${root.id}`,
                now,
              }),
            },
          },
        }),
        customField<
          ApplicationTask,
          undefined,
          Pick<
            ApplicationTask,
            "scheduledAt" | "when" | "start" | "planDate" | "planAt"
          >
        >({
          id: "task-metadata-at",
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
                pickerId: `task-at-picker-${root.id}`,
              }),
            },
          },
        }),
        customField<ApplicationTask, undefined, string[]>({
          id: "task-metadata-area",
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
          id: "task-metadata-repeat",
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
    }),
  );
</script>

<div
  class={["application-task-metadata-action-bar", className]
    .filter(Boolean)
    .join(" ")}
  data-task-metadata-action-bar
>
  <StructuredForm
    value={task}
    config={metadataFormConfig}
    onChange={(nextTask) => onChange(nextTask as ApplicationTask)}
  />
</div>
