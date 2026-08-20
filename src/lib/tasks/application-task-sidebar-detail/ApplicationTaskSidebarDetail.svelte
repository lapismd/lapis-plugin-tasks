<script lang="ts">
  import "./ApplicationTaskSidebarDetail.css";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import CopyPlusIcon from "@lucide/svelte/icons/copy-plus";
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical";
  import LinkIcon from "@lucide/svelte/icons/link";
  import ListChecksIcon from "@lucide/svelte/icons/list-checks";
  import ListTodoIcon from "@lucide/svelte/icons/list-todo";
  import LogOutIcon from "@lucide/svelte/icons/log-out";
  import PrinterIcon from "@lucide/svelte/icons/printer";
  import SignalHighIcon from "@lucide/svelte/icons/signal-high";
  import SignalLowIcon from "@lucide/svelte/icons/signal-low";
  import SignalMediumIcon from "@lucide/svelte/icons/signal-medium";
  import TagIcon from "@lucide/svelte/icons/tag";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import UserIcon from "@lucide/svelte/icons/user";
  import {
    Message,
    MessageBubble,
    MessageList,
    MessageMetadata,
  } from "@lapismd/design-core/ai/chat";
  import { Button } from "@lapismd/design-core/shadcn/button";
  import * as ScrollArea from "@lapismd/design-core/shadcn/scroll-area";
  import type { Snippet } from "svelte";

  import type { Task } from "../../model";
  import { formatTaskScheduleLabel, getDueSummary } from "../../model";
  import ApplicationMarkdownPreview from "../../model/ReferenceMarkdownPreview.svelte";
  import ApplicationTaskCheckbox from "../application-task-checkbox/ApplicationTaskCheckbox.svelte";

  type ApplicationSummary = {
    title: string;
    subtitle?: string;
    color?: string;
  };

  let {
    task,
    application = null,
    creatorLabel = "Steve",
    closeAction,
    messages,
    onToggleDone = () => {},
    onUpdateTitle = () => {},
    onRemoveTask = () => {},
    onCopyLink = () => {},
    onMenuAction = () => {},
    onOpenApplication,
  }: {
    task: Task;
    application?: ApplicationSummary | null;
    creatorLabel?: string;
    closeAction?: Snippet;
    messages?: Snippet;
    onToggleDone?: (task: Task) => void;
    onUpdateTitle?: (task: Task, title: string) => void;
    onRemoveTask?: (task: Task) => void;
    onCopyLink?: (task: Task) => void;
    onOpenApplication?: (applicationId: string) => void;
    onMenuAction?: (
      action:
        | "unsubscribe"
        | "print"
        | "duplicate"
        | "hide-completed"
        | "mark-all-incomplete",
      task: Task,
    ) => void;
  } = $props();

  let menuOpen = $state(false);
  let titleEditor = $state<HTMLElement | null>(null);

  const dueSummary = $derived(getDueSummary(task.dueAt));
  const scheduleLabel = $derived.by(() => {
    if (dueSummary) return dueSummary.shortDate;
    return formatTaskScheduleLabel({
      when: task.when,
      planAt: task.planAt,
      scheduledAt: task.scheduledAt ?? task.planDate,
    });
  });
  const priorityLabel = $derived(
    task.priority === "high"
      ? "High"
      : task.priority === "low"
        ? "Low"
        : task.priority === "medium"
          ? "Medium"
          : null,
  );
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
      Math.round((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000)),
    );
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }

  function copyLink() {
    menuOpen = false;
    onCopyLink(task);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(`task://${task.id}`);
    }
  }

  function runMenu(
    action:
      | "unsubscribe"
      | "print"
      | "duplicate"
      | "hide-completed"
      | "mark-all-incomplete",
  ) {
    menuOpen = false;
    onMenuAction(action, task);
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
        <div class="task-sidebar-detail__menu-wrap">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            class="task-sidebar-detail__icon-button"
            aria-label="Task actions"
            title="Task actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onclick={(event) => {
              event.stopPropagation();
              menuOpen = !menuOpen;
            }}
          >
            <EllipsisVerticalIcon />
          </Button>
          {#if menuOpen}
            <div
              class="task-sidebar-detail__menu"
              role="menu"
              aria-label="Task actions"
            >
              <button
                type="button"
                class="task-sidebar-detail__menu-item"
                role="menuitem"
                onclick={() => runMenu("unsubscribe")}
              >
                <LogOutIcon />
                Unsubscribe
              </button>
              <button
                type="button"
                class="task-sidebar-detail__menu-item"
                role="menuitem"
                onclick={() => runMenu("print")}
              >
                <PrinterIcon />
                Print task
              </button>
              <button
                type="button"
                class="task-sidebar-detail__menu-item"
                role="menuitem"
                onclick={copyLink}
              >
                <LinkIcon />
                Copy link
              </button>
              <button
                type="button"
                class="task-sidebar-detail__menu-item"
                role="menuitem"
                onclick={() => runMenu("duplicate")}
              >
                <CopyPlusIcon />
                Duplicate task
              </button>
              <button
                type="button"
                class="task-sidebar-detail__menu-item"
                role="menuitem"
                onclick={() => runMenu("hide-completed")}
              >
                <ListChecksIcon />
                Hide completed tasks
              </button>
              <button
                type="button"
                class="task-sidebar-detail__menu-item"
                role="menuitem"
                onclick={() => runMenu("mark-all-incomplete")}
              >
                <ListTodoIcon />
                Mark all incomplete
              </button>
              <div class="task-sidebar-detail__menu-separator" role="separator"></div>
              <button
                type="button"
                class="task-sidebar-detail__menu-item task-sidebar-detail__menu-item--destructive"
                role="menuitem"
                onclick={removeTask}
              >
                <Trash2Icon />
                Delete task
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="task-sidebar-detail__title-row">
      <ApplicationTaskCheckbox
        class="task-sidebar-detail__checkbox"
        size="md"
        checked={
          task.status === "done" ||
          task.status === "completed" ||
          task.status === "canceled" ||
          Boolean(task.completedAt)
        }
        label={
          task.status === "done" ||
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

    <div class="task-sidebar-detail__chips">
      {#if application}
        {#if onOpenApplication && task.applicationId}
          {@const applicationId = task.applicationId}
          <button
            type="button"
            class="task-sidebar-detail__chip task-sidebar-detail__chip--action"
            aria-label={`Open ${application.title}`}
            onclick={() => onOpenApplication(applicationId)}
          >
            <span class="task-sidebar-detail__chip-emoji" aria-hidden="true"
              >💯</span
            >
            {application.title}
          </button>
        {:else}
          <span class="task-sidebar-detail__chip">
            <span class="task-sidebar-detail__chip-emoji" aria-hidden="true"
              >💯</span
            >
            {application.title}
          </span>
        {/if}
      {/if}
      {#if scheduleLabel}
        <span class="task-sidebar-detail__chip">
          <CalendarIcon />
          {scheduleLabel}
        </span>
      {/if}
      <span class="task-sidebar-detail__chip task-sidebar-detail__chip--dashed">
        <UserIcon />
        Assignee
      </span>
      {#if priorityLabel}
        <span class="task-sidebar-detail__chip">
          {#if task.priority === "high"}
            <SignalHighIcon />
          {:else if task.priority === "low"}
            <SignalLowIcon />
          {:else}
            <SignalMediumIcon />
          {/if}
          {priorityLabel}
        </span>
      {:else}
        <span
          class="task-sidebar-detail__chip task-sidebar-detail__chip--dashed"
        >
          <SignalMediumIcon />
          Priority
        </span>
      {/if}
      {#each task.areas as area (area)}
        <span class="task-sidebar-detail__chip">
          <TagIcon />
          {area}
        </span>
      {/each}
    </div>
  </header>

  <section class="task-sidebar-detail__body">
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
          Created by {creatorLabel} • {createdRelative}
        </p>

        <div class="task-sidebar-detail__messages">
          <MessageList density="compact" aria-label="Task messages">
            {#if messages}
              {@render messages()}
            {:else}
              <Message sender="user">
                {#snippet name()}Alex{/snippet}
                <MessageBubble>
                  Can we land this before Friday?
                  {#snippet metadata()}
                    <MessageMetadata timestamp="2d" />
                  {/snippet}
                </MessageBubble>
              </Message>
              <Message sender="user">
                {#snippet name()}Steve{/snippet}
                <MessageBubble>
                  Yes — wrapping the remaining polish today.
                  {#snippet metadata()}
                    <MessageMetadata timestamp="1d" />
                  {/snippet}
                </MessageBubble>
              </Message>
            {/if}
          </MessageList>
        </div>
      </div>
    </ScrollArea.Root>
  </section>

  <footer class="task-sidebar-detail__footer">
    <input
      type="text"
      class="task-sidebar-detail__message"
      placeholder="Leave a message..."
      aria-label="Leave a message"
    />
  </footer>
</div>
