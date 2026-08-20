<script lang="ts">
	import './ApplicationTasksPreview.css';
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import { onDestroy } from "svelte";
  import { referenceAnchorId, formatTaskReference } from "@lapismd/design-core/forms";

  import type { ApplicationTask, JobApplication } from '../../model';
  import {
    TASK_PREVIEW_CLOSE_ANIMATION_MS,
    TASK_PREVIEW_EXPAND_ANIMATION_MS,
    TASK_PREVIEW_SHELL_TRANSITION_MS,
    taskPreviewCloseAnimationMs,
  } from '../../model';
  import ApplicationTaskPreviewRow from "../application-task-preview-row/ApplicationTaskPreviewRow.svelte";

  type TaskSection = "open" | "completed";

  let {
    application,
    onSave = () => {},
  }: {
    application: JobApplication;
    onSave?: (application: JobApplication) => void;
  } = $props();

  let taskDraft = $state("");
  let expandedTaskId = $state<string | null>(null);
  let closingTaskId = $state<string | null>(null);
  let pendingExpandedTaskId = $state<string | null>(null);
  let listElement = $state<HTMLElement | null>(null);
  let completedOpen = $state(false);
  let draggingTask = $state<{ group: TaskSection; index: number } | null>(null);
  let closeAnimationTimer: ReturnType<typeof setTimeout> | null = null;

  const tasks = $derived(application.tasks ?? []);
  const openTasks = $derived(tasks.filter((task) => !task.done));
  const completedTasks = $derived(tasks.filter((task) => task.done));
  const taskProgress = $derived.by(() => {
    if (!tasks.length) return null;
    return {
      done: completedTasks.length,
      total: tasks.length,
    };
  });

  onDestroy(() => {
    cancelCloseAnimation();
    finishDrag();
  });

  function arrayMove<T>(values: T[], from: number, to: number) {
    const next = [...values];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }

  function mergeTaskSections(open: ApplicationTask[], completed: ApplicationTask[]) {
    return [...open, ...completed];
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

  function taskReferenceAnchor(taskId: string) {
    return referenceAnchorId(formatTaskReference(application.id, taskId));
  }

  function addTask() {
    const body = taskDraft.trim();
    if (!body) return;
    const timestamp = new Date().toISOString();
    const taskId = `task-${Date.now()}`;
    saveTasks([
      ...openTasks,
      {
        id: taskId,
        body,
        done: false,
        status: "todo",
        createdAt: timestamp,
      },
      ...completedTasks,
    ]);
    taskDraft = "";
    expandedTaskId = taskId;
    closingTaskId = null;
    pendingExpandedTaskId = null;
  }

  function toggleTask(taskId: string) {
    const timestamp = new Date().toISOString();
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) return;

    const done = !task.done;
    if (done && expandedTaskId === taskId) {
      clearExpansion();
    }

    const nextTask = {
      ...task,
      done,
      status: done ? ("done" as const) : ("todo" as const),
      completedAt: done ? (task.completedAt ?? timestamp) : undefined,
      updatedAt: timestamp,
    };

    const nextOpen = openTasks.filter((entry) => entry.id !== taskId);
    const nextCompleted = completedTasks.filter((entry) => entry.id !== taskId);
    if (done) {
      saveTasks(mergeTaskSections(nextOpen, [...nextCompleted, nextTask]));
      return;
    }

    saveTasks(mergeTaskSections([...nextOpen, nextTask], nextCompleted));
  }

  function updateTask(taskId: string, patch: Partial<ApplicationTask>) {
    const timestamp = new Date().toISOString();
    const nextTasks = tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            ...patch,
            updatedAt: timestamp,
          }
        : task,
    );

    const updated = nextTasks.find((task) => task.id === taskId);
    if (!updated) return;

    if (updated.done && expandedTaskId === taskId) {
      clearExpansion();
    }

    const nextOpen = nextTasks.filter((task) => !task.done);
    const nextCompleted = nextTasks.filter((task) => task.done);
    saveTasks(mergeTaskSections(nextOpen, nextCompleted));
  }

  function removeTask(taskId: string) {
    if (expandedTaskId === taskId) {
      clearExpansion();
    }
    saveTasks(tasks.filter((task) => task.id !== taskId));
  }

  function moveTask(taskId: string, direction: -1 | 1, group: TaskSection) {
    const section = group === "open" ? [...openTasks] : [...completedTasks];
    const index = section.findIndex((task) => task.id === taskId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= section.length) return;

    const nextSection = arrayMove(section, index, target);
    saveTasks(
      group === "open"
        ? mergeTaskSections(nextSection, completedTasks)
        : mergeTaskSections(openTasks, nextSection),
    );
  }

  function reorderTaskSection(group: TaskSection, from: number, to: number) {
    const section = group === "open" ? [...openTasks] : [...completedTasks];
    if (
      from < 0 ||
      to < 0 ||
      from >= section.length ||
      to >= section.length ||
      from === to
    ) {
      return;
    }

    const nextSection = arrayMove(section, from, to);
    saveTasks(
      group === "open"
        ? mergeTaskSections(nextSection, completedTasks)
        : mergeTaskSections(openTasks, nextSection),
    );
  }

  function startTaskDrag(
    event: PointerEvent,
    group: TaskSection,
    index: number,
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    draggingTask = { group, index };
    window.addEventListener("pointermove", handleTaskPointerMove);
    window.addEventListener("pointerup", finishDrag, { once: true });
    window.addEventListener("pointercancel", finishDrag, { once: true });
  }

  function handleTaskPointerMove(event: PointerEvent) {
    if (!draggingTask) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const item = element?.closest("[data-sortable-item]") as HTMLElement | null;
    if (!item || item.dataset.sortableGroup !== draggingTask.group) return;

    const targetIndex = Number(item.dataset.sortableIndex);
    if (!Number.isInteger(targetIndex) || targetIndex < 0) return;
    if (targetIndex === draggingTask.index) return;

    reorderTaskSection(draggingTask.group, draggingTask.index, targetIndex);
    draggingTask = { ...draggingTask, index: targetIndex };
  }

  function finishDrag() {
    draggingTask = null;
    window.removeEventListener("pointermove", handleTaskPointerMove);
    window.removeEventListener("pointerup", finishDrag);
    window.removeEventListener("pointercancel", finishDrag);
  }

  function cancelCloseAnimation() {
    if (closeAnimationTimer) {
      clearTimeout(closeAnimationTimer);
      closeAnimationTimer = null;
    }
  }

  function finishClosingExpandedTask() {
    closeAnimationTimer = null;
    const nextTaskId = pendingExpandedTaskId;
    closingTaskId = null;
    pendingExpandedTaskId = null;
    if (nextTaskId) {
      expandedTaskId = nextTaskId;
    }
  }

  function startClosingExpandedTask(nextTaskId: string | null) {
    cancelCloseAnimation();

    if (!expandedTaskId) {
      closingTaskId = null;
      pendingExpandedTaskId = null;
      if (nextTaskId) {
        expandedTaskId = nextTaskId;
      }
      return;
    }

    closingTaskId = expandedTaskId;
    pendingExpandedTaskId = nextTaskId;
    expandedTaskId = null;

    closeAnimationTimer = setTimeout(
      finishClosingExpandedTask,
      taskPreviewCloseAnimationMs(listElement?.ownerDocument.defaultView ?? window),
    );
  }

  function clearExpansion() {
    cancelCloseAnimation();
    expandedTaskId = null;
    closingTaskId = null;
    pendingExpandedTaskId = null;
  }

  function requestOpenTask(taskId: string) {
    if (expandedTaskId === taskId) {
      startClosingExpandedTask(null);
      return;
    }

    if (closingTaskId) {
      pendingExpandedTaskId = taskId;
      return;
    }

    if (expandedTaskId) {
      startClosingExpandedTask(taskId);
      return;
    }

    expandedTaskId = taskId;
  }

  function requestDismissExpandedTask() {
    if (expandedTaskId) {
      startClosingExpandedTask(null);
      return;
    }
    pendingExpandedTaskId = null;
  }

  function shouldKeepExpandedOpen(target: Element) {
    if (
      target.closest(
        '[data-task-preview-state="expanded"], [data-task-preview-state="closing"]',
      )
    ) {
      return true;
    }

    if (
      target.closest(
        [
          "dialog",
          "[popover]",
          "[role='alertdialog']",
          "[role='dialog']:not(.application-detail-screen)",
          "[data-slot='dialog-content']",
          "[data-slot='dialog-overlay']",
          "[data-slot='alert-dialog-content']",
          "[data-slot='alert-dialog-overlay']",
          "[data-task-due-picker]",
          "[data-task-when-picker]",
          "[data-task-at-picker]",
          "[data-task-area-picker]",
          ".task-when-picker",
          ".task-when-picker__panel",
          ".task-at-picker",
          ".task-at-picker__panel",
          ".application-task-area-picker__panel",
        ].join(","),
      )
    ) {
      return true;
    }

    return false;
  }

  function handleOutsideExpandedTask(event: Event) {
    if (!expandedTaskId || !(event.target instanceof Element)) return;
    if (shouldKeepExpandedOpen(event.target)) return;
    requestDismissExpandedTask();
  }

  $effect(() => {
    if (!expandedTaskId) return;

    document.addEventListener("pointerdown", handleOutsideExpandedTask, true);
    document.addEventListener("focusin", handleOutsideExpandedTask, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideExpandedTask, true);
      document.removeEventListener("focusin", handleOutsideExpandedTask, true);
    };
  });
</script>

<div
  bind:this={listElement}
  class="task-preview-list"
  role="list"
  aria-label="Application task list"
  style={`--task-preview-close-ms: ${TASK_PREVIEW_CLOSE_ANIMATION_MS}ms; --task-preview-expand-ms: ${TASK_PREVIEW_EXPAND_ANIMATION_MS}ms; --task-preview-shell-ms: ${TASK_PREVIEW_SHELL_TRANSITION_MS}ms`}
>
  {#each openTasks as task, taskIndex (task.id)}
    <div id={taskReferenceAnchor(task.id)} tabindex="-1">
      <ApplicationTaskPreviewRow
        {task}
        taskIndex={taskIndex}
        taskTotal={openTasks.length}
        sortableGroup="open"
        dragging={draggingTask?.group === "open" &&
          draggingTask.index === taskIndex}
        isExpanded={expandedTaskId === task.id}
        isClosing={closingTaskId === task.id}
        onDragStart={(event) => startTaskDrag(event, "open", taskIndex)}
        onRequestOpen={requestOpenTask}
        onToggleDone={toggleTask}
        onUpdateTask={updateTask}
        onRemoveTask={removeTask}
        onMoveTask={(taskId, direction) => moveTask(taskId, direction, "open")}
      />
    </div>
  {/each}

  <form
    class="task-preview-add-shell"
    onsubmit={(event) => {
      event.preventDefault();
      addTask();
    }}
  >
    <div class="task-preview-add">
      <span class="task-preview-add__box" aria-hidden="true"></span>
      <div class="task-preview-add__main">
        <input
          bind:value={taskDraft}
          placeholder="Add a step..."
          aria-label="New task"
        />
        <button type="submit" class="task-preview-add__submit" aria-label="Add task">
          <PlusIcon />
        </button>
      </div>
    </div>
  </form>

  {#if completedTasks.length > 0}
    <details class="task-preview-completed" bind:open={completedOpen}>
      <summary class="task-preview-completed__summary">
        <span>Completed</span>
        <span class="task-preview-completed__count">{completedTasks.length}</span>
        <ChevronDownIcon class="task-preview-completed__chevron" />
      </summary>
      <div class="task-preview-completed__list" role="list">
        {#each completedTasks as task, taskIndex (task.id)}
          <div id={taskReferenceAnchor(task.id)} tabindex="-1">
            <ApplicationTaskPreviewRow
              {task}
              taskIndex={taskIndex}
              taskTotal={completedTasks.length}
              sortableGroup="completed"
              dragging={draggingTask?.group === "completed" &&
                draggingTask.index === taskIndex}
              isExpanded={expandedTaskId === task.id}
              isClosing={closingTaskId === task.id}
              onDragStart={(event) => startTaskDrag(event, "completed", taskIndex)}
              onRequestOpen={requestOpenTask}
              onToggleDone={toggleTask}
              onUpdateTask={updateTask}
              onRemoveTask={removeTask}
              onMoveTask={(taskId, direction) =>
                moveTask(taskId, direction, "completed")}
            />
          </div>
        {/each}
      </div>
    </details>
  {/if}

  {#if taskProgress}
    <strong class="task-preview-progress">
      <CheckIcon />
      {taskProgress.done}/{taskProgress.total}
    </strong>
  {/if}
</div>

