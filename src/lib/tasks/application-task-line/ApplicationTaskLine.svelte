<script lang="ts">
	import './ApplicationTaskLine.css';
  import CheckCircle2Icon from "@lucide/svelte/icons/check-circle-2";
  import CircleIcon from "@lucide/svelte/icons/circle";
  import CircleXIcon from "@lucide/svelte/icons/circle-x";
  import FlagIcon from "@lucide/svelte/icons/flag";
  import HourglassIcon from "@lucide/svelte/icons/hourglass";
  import * as Tooltip from "@lapismd/design-core/shadcn/tooltip";
  import type { Snippet } from "svelte";
  import type { ApplicationTask } from '../../model';
  import { getDueSummary, taskBodyExcerpt } from '../../model';
  import ApplicationTaskCheckbox from "../application-task-checkbox/ApplicationTaskCheckbox.svelte";

  let {
    task,
    variant = "list",
    showCheckbox = false,
    href,
    titleMode = "button",
    ariaExpanded,
    isOpenSurface = false,
    titleEditing = false,
    titleDraft = $bindable(""),
    titleInput = $bindable<HTMLInputElement | null>(null),
    titleEditor = $bindable<HTMLDivElement | null>(null),
    showDueIndicator = true,
    now = undefined,
    onTitleBlur = () => {},
    onTitleKeydown = () => {},
    onTitleClick = () => {},
    onTitleDoubleClick = () => {},
    onToggleDone = () => {},
    optionAction,
    expandedPanel,
  }: {
    task: ApplicationTask;
    variant?: "list" | "form";
    showCheckbox?: boolean;
    href?: string;
    titleMode?: "button" | "inline-edit" | "link" | "text";
    ariaExpanded?: boolean;
    isOpenSurface?: boolean;
    titleEditing?: boolean;
    titleDraft?: string;
    titleInput?: HTMLInputElement | null;
    titleEditor?: HTMLDivElement | null;
    showDueIndicator?: boolean;
    now?: Date;
    onTitleBlur?: () => void;
    onTitleKeydown?: (event: KeyboardEvent) => void;
    onTitleClick?: (event: MouseEvent) => void;
    onTitleDoubleClick?: (event: MouseEvent) => void;
    onToggleDone?: (taskId: string, event: Event) => void;
    optionAction?: string;
    expandedPanel?: Snippet;
  } = $props();

  const dueSummary = $derived(getDueSummary(task.dueAt, now));
  const titleExcerpt = $derived(taskBodyExcerpt(task.body));
  const effectiveStatus = $derived(
    task.status === "canceled"
      ? "canceled"
      : task.status === "waiting"
        ? "waiting"
        : task.status === "done" || task.status === "completed" || task.done
          ? "done"
          : "todo",
  );
  const checkboxStatus = $derived(
    task.status === "canceled"
      ? "canceled"
      : task.done
        ? "completed"
        : "open",
  );
  const showPriority = $derived(task.priority && task.priority !== "medium");
</script>

<div
  class="task-line"
  class:task-line--form={variant === "form"}
  class:task-line--done={task.done}
  class:task-line--open-surface={isOpenSurface}
>
  {#if showCheckbox}
    <ApplicationTaskCheckbox
      class="task-line__checkbox"
      checked={task.done}
      status={checkboxStatus}
      label={`Mark ${titleExcerpt} ${task.done ? "incomplete" : "complete"}`}
      onchange={(event) => onToggleDone(task.id, event)}
    />
  {:else}
    <div
      class="task-line__status-icon"
      class:task-line__status-icon--waiting={effectiveStatus === "waiting"}
      class:task-line__status-icon--done={effectiveStatus === "done"}
      class:task-line__status-icon--canceled={effectiveStatus === "canceled"}
      aria-hidden="true"
    >
      {#if effectiveStatus === "waiting"}
        <HourglassIcon />
      {:else if effectiveStatus === "done"}
        <CheckCircle2Icon />
      {:else if effectiveStatus === "canceled"}
        <CircleXIcon />
      {:else}
        <CircleIcon />
      {/if}
    </div>
  {/if}

  <div class="task-line__main">
    <div class="task-line__header">
      {#if isOpenSurface && showCheckbox}
        <input
          bind:this={titleInput}
          bind:value={titleDraft}
          type="text"
          class="task-line__title-input"
          aria-label="Task title"
          onblur={onTitleBlur}
          onkeydown={onTitleKeydown}
        />
      {:else if titleMode === "link" && href}
        <a
          class="task-line__title task-line__title--link"
          {href}
          onclick={(event) => onTitleClick(event)}
        >
          <span class="task-line__title-text">{titleExcerpt}</span>
        </a>
      {:else if titleMode === "inline-edit"}
        {#if titleEditing}
          <div
            bind:this={titleEditor}
            class="task-line__title task-line__title-editor"
            contenteditable="plaintext-only"
            role="textbox"
            tabindex="0"
            aria-label="Task title"
            aria-multiline="false"
            spellcheck="true"
            data-swipe-item-gesture-ignore
            oninput={(event) => {
              titleDraft = event.currentTarget.textContent ?? "";
            }}
            onblur={onTitleBlur}
            onkeydown={onTitleKeydown}
            onclick={(event) => event.stopPropagation()}
            ondblclick={(event) => onTitleDoubleClick(event)}
          ></div>
        {:else}
          <button
            type="button"
            class="task-line__title"
            aria-expanded={ariaExpanded}
            data-swipe-item-gesture-ignore
            onclick={(event) => onTitleClick(event)}
            ondblclick={(event) => onTitleDoubleClick(event)}
          >
            <span class="task-line__title-text">{titleExcerpt}</span>
          </button>
        {/if}
      {:else if titleMode === "button"}
        <button
          type="button"
          class="task-line__title"
          aria-expanded={ariaExpanded}
          onclick={(event) => onTitleClick(event)}
          ondblclick={(event) => onTitleDoubleClick(event)}
        >
          <span class="task-line__title-text">{titleExcerpt}</span>
        </button>
      {:else}
        <span class="task-line__title">
          <span class="task-line__title-text">{titleExcerpt}</span>
        </span>
      {/if}

      {#if !isOpenSurface}
      <div class="task-line__meta">
        {#if optionAction}
          <span class="task-line__option-action">{optionAction}</span>
        {/if}
        {#if effectiveStatus === "waiting"}
          <span class="task-line__status-chip task-line__status-chip--waiting">
            <HourglassIcon />
            <span>Waiting</span>
          </span>
        {/if}
        {#if showPriority}
          <span
            class="task-line__priority"
            class:task-line__priority--high={task.priority === "high"}
            class:task-line__priority--low={task.priority === "low"}
            aria-label={`${task.priority} priority`}
          ></span>
        {/if}
        {#if showDueIndicator && dueSummary && !task.done}
          <Tooltip.Provider delayDuration={250}>
            <Tooltip.Root>
              <Tooltip.Trigger
                type="button"
                class={`task-line__due task-line__due--${dueSummary.tone}`}
                aria-label={`Due ${dueSummary.shortDate}, ${dueSummary.distance}`}
              >
                <FlagIcon />
                <span class="task-line__due-distance">
                  {dueSummary.distance}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content
                sideOffset={6}
                class="task-line__due-tooltip"
              >
                Due {dueSummary.fullDate}
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        {/if}
      </div>
      {/if}
    </div>

    {#if isOpenSurface && expandedPanel}
      {@render expandedPanel()}
    {/if}
  </div>
</div>
