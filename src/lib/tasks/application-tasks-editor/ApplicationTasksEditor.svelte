<script lang="ts">
  import PlusIcon from "@lucide/svelte/icons/plus";
  import {
    createFormConfig,
    customField,
    optionField,
    StructuredForm,
    textareaField,
  } from "@lapismd/design-core/forms";
  import { FormSectionHeader } from "@lapismd/design-core/forms";

  import type {
    ApplicationTask,
    ApplicationTaskPriority,
    JobApplication,
  } from '../../model';
  import ApplicationTaskWhenFormField from "../application-task-when-form-field/ApplicationTaskWhenFormField.svelte";

  let {
    application,
    closedTaskIds = [],
    onToggleTaskOpen = () => {},
    onSave = () => {},
  }: {
    application: JobApplication;
    closedTaskIds?: string[];
    onToggleTaskOpen?: (taskId: string) => void;
    onSave?: (application: JobApplication) => void;
  } = $props();

  const tasks = $derived(application.tasks ?? []);

  const statusOptions = [
    { value: "todo", label: "Todo" },
    { value: "waiting", label: "Waiting" },
    { value: "done", label: "Done" },
  ];

  const priorityOptions: Array<{
    value: ApplicationTaskPriority;
    label: string;
  }> = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ];

  const taskFormConfig = createFormConfig<ApplicationTask>({
    id: "application-task",
    fields: [
      optionField({
        id: "task-status",
        label: "Status",
        ariaLabel: "Task status",
        get: (task) => task.status ?? (task.done ? "done" : "todo"),
        set: (task, status) => {
          const done = status === "done";
          return {
            ...task,
            status: status as ApplicationTask["status"],
            done,
            completedAt: done ? new Date().toISOString() : undefined,
          };
        },
        options: statusOptions,
      }),
      customField<ApplicationTask, undefined, string | null>({
        id: "task-due-at",
        label: "Due At",
        align: "center",
        as: "div",
        get: (task) => normalizedDueAt(task.dueAt),
        set: (task, dueAt) => ({
          ...task,
          dueAt: dueAt || undefined,
        }),
        renderers: {
          edit: {
            component: ApplicationTaskWhenFormField,
            props: {
              mode: "due",
              variant: "pill",
            },
          },
        },
      }),
      optionField({
        id: "task-priority",
        label: "Priority",
        ariaLabel: "Task priority",
        get: (task) => task.priority ?? "medium",
        set: (task, priority) => ({
          ...task,
          priority: priority as ApplicationTaskPriority,
        }),
        options: priorityOptions,
      }),
      textareaField({
        id: "task-notes",
        label: "Notes",
        placeholder: "Add Notes",
        get: (task) => task.notes ?? "",
        set: (task, notes) => ({
          ...task,
          notes: notes || undefined,
        }),
      }),
    ],
  });

  function dateInputValue(value: string | undefined) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    return date.toISOString().slice(0, 10);
  }

  function normalizedDueAt(value: string | undefined) {
    return dateInputValue(value) || null;
  }

  function taskProgressFor(taskList: ApplicationTask[]) {
    return {
      done: taskList.filter((task) => task.done).length,
      total: taskList.length,
    };
  }

  function saveTasks(nextTasks: ApplicationTask[]) {
    const normalized = nextTasks.length ? nextTasks : undefined;
    const steps = normalized ? taskProgressFor(normalized) : undefined;
    void onSave({
      ...application,
      tasks: normalized,
      steps,
      updatedAt: new Date().toISOString(),
    });
  }

  function taskOpen(taskId: string) {
    return !closedTaskIds.includes(taskId);
  }

  function replaceTask(taskId: string, nextTask: ApplicationTask) {
    const timestamp = new Date().toISOString();
    saveTasks(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...nextTask,
              updatedAt: timestamp,
            }
          : task,
      ),
    );
  }

  function updateTask(taskId: string, patch: Partial<ApplicationTask>) {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) return;
    replaceTask(taskId, { ...task, ...patch });
  }

  function addTask() {
    const timestamp = new Date().toISOString();
    const task: ApplicationTask = {
      id: `task-${Date.now()}`,
      body: "New task",
      done: false,
      status: "todo",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    saveTasks([...tasks, task]);
  }

  function removeTask(taskId: string) {
    saveTasks(tasks.filter((task) => task.id !== taskId));
  }

  function moveTask(taskId: string, direction: -1 | 1) {
    const index = tasks.findIndex((task) => task.id === taskId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= tasks.length) return;
    const next = [...tasks];
    const [task] = next.splice(index, 1);
    next.splice(target, 0, task);
    saveTasks(next);
  }
</script>

<div class="tasks-form">
  {#each tasks as task, taskIndex (task.id)}
    <article class="task-section">
      <FormSectionHeader
        title={task.body || "New task"}
        index={taskIndex}
        total={tasks.length}
        open={taskOpen(task.id)}
        removeLabel="Remove task"
        onTitleChange={(body) => updateTask(task.id, { body })}
        onMove={(direction) => moveTask(task.id, direction)}
        onRemove={() => removeTask(task.id)}
        onToggle={() => onToggleTaskOpen(task.id)}
      />

      {#if taskOpen(task.id)}
        <div class="task-body">
          <StructuredForm
            value={task}
            config={taskFormConfig}
            onChange={(nextTask) =>
              replaceTask(task.id, nextTask as ApplicationTask)}
          />
        </div>
      {/if}
    </article>
  {/each}

  <button type="button" class="tasks-add-bottom" onclick={addTask}>
    <PlusIcon />
    Add Task
  </button>
</div>

<style>
  .tasks-form {
    display: grid;
    gap: 1.25rem;
  }

  .task-section {
    position: relative;
    overflow: visible;
  }

  .task-body {
    display: grid;
    gap: 0.35rem;
    padding: 0.75rem 0 0 1rem;
  }

  .tasks-add-bottom {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    width: 100%;
    min-height: 2.75rem;
    border: 1px solid var(--kanban-border);
    border-radius: 0.25rem;
    background: transparent;
    color: color-mix(in srgb, var(--kanban-muted) 75%, transparent);
    cursor: pointer;
    font: inherit;
    font-size: 0.85rem;
    margin-top: 0.35rem;
  }

  .tasks-add-bottom :global(svg) {
    width: 0.9rem;
    height: 0.9rem;
  }

  .tasks-add-bottom:hover,
  .tasks-add-bottom:focus-visible {
    border-color: color-mix(
      in srgb,
      var(--card-color) 38%,
      var(--kanban-border)
    );
    color: var(--kanban-foreground);
    outline: 0;
  }
</style>
