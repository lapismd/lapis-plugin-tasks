<script lang="ts">
  import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import FolderKanbanIcon from "@lucide/svelte/icons/folder-kanban";
  import GripVerticalIcon from "@lucide/svelte/icons/grip-vertical";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";

  let {
    title,
    target,
    selected = false,
    expanded = false,
    canExpand = true,
    canDrag = false,
    canDelete = false,
    onSelect,
    onOpen,
    onToggleExpanded,
    onDelete,
  }: {
    title: string;
    target: string;
    selected?: boolean;
    expanded?: boolean;
    canExpand?: boolean;
    canDrag?: boolean;
    canDelete?: boolean;
    onSelect: () => void;
    onOpen: () => void | Promise<void>;
    onToggleExpanded?: () => void | Promise<void>;
    onDelete?: () => void | Promise<void>;
  } = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (event.code !== "Enter" && event.code !== "Space") return;
    event.preventDefault();
    onSelect();
  }
</script>

<div
  class="task-list-items-list-row"
  class:task-list-items-list-row--selected={selected}
  data-task-list-row
  data-task-list-target={target}
  data-selected={selected ? "true" : undefined}
  role="button"
  tabindex="0"
  aria-label={title}
  aria-pressed={selected}
  aria-expanded={canExpand ? expanded : undefined}
  onclick={() => onSelect()}
  ondblclick={(event) => {
    event.preventDefault();
    void onOpen();
  }}
  onkeydown={handleKeydown}
>
  <div class="task-list-items-list-row__primary">
    {#if canExpand}
      <button
        type="button"
        class="task-list-items-list-row__disclosure"
        aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
        onclick={(event) => {
          event.stopPropagation();
          void onToggleExpanded?.();
        }}
      >
        {#if expanded}
          <ChevronDownIcon aria-hidden="true" />
        {:else}
          <ChevronRightIcon aria-hidden="true" />
        {/if}
      </button>
    {/if}
    <span
      class="task-list-items-list-row__icon"
      data-task-list-row-icon
      aria-hidden="true"
    >
      <FolderKanbanIcon />
    </span>
    <span class="task-list-items-list-row__content">
      <strong title={target}>{title}</strong>
    </span>
  </div>
  <div class="task-list-items-list-row__actions">
    {#if canDrag}
      <button
        type="button"
        class="task-list-items-list-row__drag"
        data-task-drag-handle
        aria-label={`Reorder list ${title}`}
        title={`Reorder ${title}`}
      >
        <GripVerticalIcon aria-hidden="true" />
      </button>
    {/if}
    {#if canDelete && onDelete}
      <button
        type="button"
        class="task-list-items-list-row__delete"
        aria-label={`Delete list ${title}`}
        title={`Delete ${title}`}
        onclick={(event) => {
          event.stopPropagation();
          void onDelete?.();
        }}
      >
        <Trash2Icon aria-hidden="true" />
      </button>
    {/if}
    <button
      type="button"
      class="task-list-items-list-row__open"
      aria-label={`Open list ${title} to the right`}
      title="Open list to the right"
      onclick={(event) => {
        event.stopPropagation();
        void onOpen();
      }}
    >
      <ArrowRightIcon aria-hidden="true" />
    </button>
  </div>
</div>
