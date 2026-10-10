<script lang="ts">
  import "./ApplicationTaskSidebarDetail.css";
  import CopyPlusIcon from "@lucide/svelte/icons/copy-plus";
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical";
  import LinkIcon from "@lucide/svelte/icons/link";
  import ListChecksIcon from "@lucide/svelte/icons/list-checks";
  import ListTodoIcon from "@lucide/svelte/icons/list-todo";
  import * as DropdownMenu from "@lapismd/design-core/shadcn/dropdown-menu";
  import PrinterIcon from "@lucide/svelte/icons/printer";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import {
    Message,
    MessageBubble,
    MessageList,
    MessageMetadata,
  } from "@lapismd/design-core/ai/chat";
  import { Button } from "@lapismd/design-core/shadcn/button";
  import * as ScrollArea from "@lapismd/design-core/shadcn/scroll-area";
  import type { Snippet } from "svelte";

  import type { ApplicationTask, Task } from "../../model";
  import { taskToApplicationTask } from "../../model";
  import ApplicationMarkdownPreview from "../../model/ReferenceMarkdownPreview.svelte";
  import type { TaskListPickerOptionInput } from "../application-task-area-picker";
  import ApplicationTaskCheckbox from "../application-task-checkbox/ApplicationTaskCheckbox.svelte";
  import ApplicationTaskMetadataActionBar from "../application-task-metadata-action-bar/ApplicationTaskMetadataActionBar.svelte";

  let {
    task,
    creatorLabel,
    extras,
    availableMenuActions = [],
    hideCompleted = false,
    areaOptions = [],
    closeAction,
    documentModeAction,
    documentBody,
    relatedActions,
    documentBodyEnabled = false,
    now = undefined,
    messages,
    onToggleDone = () => {},
    onUpdateTitle = () => {},
    onUpdateTask = () => {},
    onRemoveTask = () => {},
    onCopyLink,
    onMenuAction,
  }: {
    task: Task;
    creatorLabel?: string;
    extras?: Snippet;
    availableMenuActions?: string[];
    hideCompleted?: boolean;
    areaOptions?: TaskListPickerOptionInput[];
    closeAction?: Snippet;
    documentModeAction?: Snippet;
    documentBody?: Snippet;
    /** Host-owned navigation to resources related to this Task. */
    relatedActions?: Snippet;
    documentBodyEnabled?: boolean;
    now?: Date;
    messages?: Snippet;
    onToggleDone?: (task: Task) => void;
    onUpdateTitle?: (task: Task, title: string) => void;
    onUpdateTask?: (task: Task, patch: Partial<ApplicationTask>) => void;
    onRemoveTask?: (task: Task) => void;
    onCopyLink?: (task: Task) => void;
    onMenuAction?: (
      action:
        | "skip"
        | "print"
        | "duplicate"
        | "hide-completed"
        | "mark-all-incomplete",
      task: Task,
    ) => void;
  } = $props();

  let menuOpen = $state(false);
  let titleEditor = $state<HTMLElement | null>(null);

  const metadataTask = $derived(taskToApplicationTask(task));
  const createdRelative = $derived(formatCreatedRelative(task.createdAt));
  const statusTone = $derived(
    task.status === "done" ||
      task.status === "completed" ||
      task.status === "canceled" ||
      Boolean(task.completedAt)
      ? "done"
      : task.status === "waiting"
        ? "waiting"
        : "active",
  );

  function formatCreatedRelative(createdAt: string) {
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return "recently";
    const days = Math.max(
      0,
      Math.round(
        ((now ?? new Date()).getTime() - created.getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }

  function copyLink() {
    menuOpen = false;
    onCopyLink?.(task);
  }
  function runMenu(
    action:
      | "print"
      | "duplicate"
      | "hide-completed"
      | "mark-all-incomplete"
      | "skip",
  ) {
    menuOpen = false;
    onMenuAction?.(action, task);
  }

  function removeTask() {
    menuOpen = false;
    onRemoveTask(task);
  }

  $effect(() => {
    const title = task.title;
    const editor = titleEditor;
    if (!editor || document.activeElement === editor) return;
    if (editor.textContent !== title) {
      editor.textContent = title;
    }
  });

  function commitTitle() {
    const next = (titleEditor?.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!next || next === task.title) {
      if (titleEditor) titleEditor.textContent = task.title;
      return;
    }
    onUpdateTitle(task, next);
  }

  function handleTitleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      titleEditor?.blur();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (titleEditor) titleEditor.textContent = task.title;
      titleEditor?.blur();
    }
  }

  function updateTaskMetadata(nextTask: ApplicationTask) {
    onUpdateTask(task, {
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
      deadline: nextTask.deadline,
      inbox: nextTask.inbox,
    });
  }
</script>

<div
  class="task-sidebar-detail"
  data-task-sidebar-detail
  data-task-id={task.id}
  data-task-status={statusTone}
>
  <header class="task-sidebar-detail__chrome">
    <div class="task-sidebar-detail__top">
      <div class="task-sidebar-detail__top-start">
        {#if closeAction}
          {@render closeAction()}
        {/if}
      </div>
      <div class="task-sidebar-detail__top-end">
        {#if relatedActions}
          {@render relatedActions()}
        {/if}
        {#if documentModeAction}
          {@render documentModeAction()}
        {/if}
        <div class="task-sidebar-detail__menu-wrap">
          <DropdownMenu.Root bind:open={menuOpen}>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}<Button
                  {...props}
                  variant="ghost"
                  size="icon"
                  class="task-sidebar-detail__icon-button"
                  aria-label="Task actions"
                  title="Task actions"><EllipsisVerticalIcon /></Button
                >{/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content aria-label="Task actions">
              <DropdownMenu.Group>
                {#if availableMenuActions.includes("print")}<DropdownMenu.Item
                    onclick={() => runMenu("print")}
                    ><PrinterIcon />Print task</DropdownMenu.Item
                  >{/if}
                {#if onCopyLink}<DropdownMenu.Item onclick={copyLink}
                    ><LinkIcon />Copy link</DropdownMenu.Item
                  >{/if}
                {#if availableMenuActions.includes("duplicate")}<DropdownMenu.Item
                    onclick={() => runMenu("duplicate")}
                    ><CopyPlusIcon />Duplicate task</DropdownMenu.Item
                  >{/if}
                {#if availableMenuActions.includes("hide-completed")}<DropdownMenu.Item
                    onclick={() => runMenu("hide-completed")}
                    ><ListChecksIcon />{hideCompleted
                      ? "Show completed tasks"
                      : "Hide completed tasks"}</DropdownMenu.Item
                  >{/if}
                {#if availableMenuActions.includes("mark-all-incomplete")}<DropdownMenu.Item
                    onclick={() => runMenu("mark-all-incomplete")}
                    ><ListTodoIcon />Mark all incomplete</DropdownMenu.Item
                  >{/if}
                {#if availableMenuActions.includes("skip")}<DropdownMenu.Item
                    onclick={() => runMenu("skip")}
                    >Skip current occurrence</DropdownMenu.Item
                  >{/if}
              </DropdownMenu.Group>
              <DropdownMenu.Separator />
              <DropdownMenu.Group
                ><DropdownMenu.Item onclick={removeTask}
                  ><Trash2Icon />Delete task</DropdownMenu.Item
                ></DropdownMenu.Group
              >
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>
    </div>

    <div class="task-sidebar-detail__title-row">
      <ApplicationTaskCheckbox
        class="task-sidebar-detail__checkbox"
        size="md"
        checked={task.status === "done" ||
          task.status === "completed" ||
          task.status === "canceled" ||
          Boolean(task.completedAt)}
        status={task.status === "canceled" ? "canceled" : undefined}
        label={task.status === "done" ||
        task.status === "completed" ||
        task.status === "canceled" ||
        Boolean(task.completedAt)
          ? "Mark task incomplete"
          : "Mark task done"}
        onchange={() => onToggleDone(task)}
      />
      <div
        bind:this={titleEditor}
        class="task-sidebar-detail__title"
        contenteditable="plaintext-only"
        role="textbox"
        tabindex="0"
        aria-label="Task title"
        aria-multiline="false"
        spellcheck="true"
        onkeydown={handleTitleKeydown}
        onblur={commitTitle}
      ></div>
    </div>

    <div class="task-sidebar-detail__metadata-actions">
      <ApplicationTaskMetadataActionBar
        task={metadataTask}
        {areaOptions}
        {now}
        onChange={updateTaskMetadata}
      />
    </div>
  </header>

  <section class="task-sidebar-detail__body">
    {#if documentBodyEnabled && documentBody}
      {@render documentBody()}
    {:else}
      <ScrollArea.Root
        class="task-sidebar-detail__scroll"
        aria-label="Task notes and messages"
      >
        <div class="task-sidebar-detail__scroll-content">
          <div class="task-sidebar-detail__notes">
            {#if task.notes?.trim()}
              <ApplicationMarkdownPreview value={task.notes} compact />
            {:else}
              <p class="task-sidebar-detail__notes-empty">No notes yet.</p>
            {/if}
          </div>
          <p class="task-sidebar-detail__created">
            {#if creatorLabel}Created by {creatorLabel} •
            {/if}{createdRelative}
          </p>

          <div class="task-sidebar-detail__messages">
            <MessageList density="compact" aria-label="Task messages">
              {#if messages}
                {@render messages()}
              {/if}
            </MessageList>
          </div>
        </div>
      </ScrollArea.Root>
    {/if}
  </section>

  {#if extras}{@render extras()}{/if}
</div>
