<script lang="ts">
  import { Button } from "@lapismd/design-core/shadcn/button";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import FolderIcon from "@lucide/svelte/icons/folder";
  import FolderKanbanIcon from "@lucide/svelte/icons/folder-kanban";
  import * as ColumnCanvas from "@lapismd/design-core/shadcn/column-canvas";
  import * as ContextMenu from "@lapismd/design-core/shadcn/context-menu";
  import { Input } from "@lapismd/design-core/shadcn/input";
  import { SvelteSet } from "svelte/reactivity";
  import type {
    ListTreeDropTarget,
    TaskListCreateInput,
    TaskListNavNode,
    TaskListNavigationSnapshot,
  } from "../../model";

  let {
    tree,
    selectedId = null,
    isSelected,
    taskDropEnabled = true,
    activeDropTargetId = null,
    onSelect,
    onExpand,
    onDrop,
    onRenameList,
    onRenameSection,
    onOpenNote,
    onEditNavigation,
    onCreateList,
    onUnpinList,
    onArchiveList,
    onDeleteList,
  }: {
    tree: TaskListNavigationSnapshot;
    selectedId?: string | null;
    isSelected: (id: string) => boolean;
    taskDropEnabled?: boolean;
    activeDropTargetId?: string | null;
    onSelect: (id: string) => void;
    onExpand?: (id: string) => void;
    onDrop?: (sourcePath: string, target: ListTreeDropTarget) => void;
    onRenameList?: (path: string, title: string) => void;
    onRenameSection?: (from: string, to: string) => void;
    onOpenNote?: (path: string) => void;
    onEditNavigation?: () => void;
    onCreateList?: (input: TaskListCreateInput) => void;
    onUnpinList?: (path: string) => void;
    onArchiveList?: (path: string) => void;
    onDeleteList?: (path: string) => void;
  } = $props();

  let expandedLists = new SvelteSet<string>();
  let collapsedSections = new SvelteSet<string>();
  let draggingPath = $state<string | null>(null);
  let dropKey = $state<string | null>(null);
  let editingKey = $state<string | null>(null);

  const canDrag = $derived(Boolean(onDrop));

  function sectionKey(title: string) {
    return `section:${title}`;
  }

  function listDropId(id: string) {
    return `planner-sidebar-list:${id}`;
  }

  function isSectionOpen(title: string) {
    return !collapsedSections.has(sectionKey(title));
  }

  function toggleSection(title: string) {
    const key = sectionKey(title);
    if (collapsedSections.has(key)) collapsedSections.delete(key);
    else collapsedSections.add(key);
  }

  function isListOpen(id: string) {
    return expandedLists.has(id);
  }

  function toggleList(node: TaskListNavNode) {
    if (expandedLists.has(node.id)) expandedLists.delete(node.id);
    else {
      expandedLists.add(node.id);
      if (!node.children.length && node.hasChildren) onExpand?.(node.id);
    }
  }

  function expandForDrop(key: string, list?: TaskListNavNode) {
    if (list) {
      expandedLists.add(list.id);
      if (!list.children.length && list.hasChildren) onExpand?.(list.id);
      return;
    }
    collapsedSections.delete(key);
  }

  function focusRename(node: HTMLElement) {
    const input = node.querySelector("input");
    if (!input) return;
    queueMicrotask(() => {
      input.focus();
      input.select();
    });
  }

  function dragPayload(event: DragEvent, path: string) {
    event.dataTransfer?.setData("text/lapis-list-path", path);
    event.dataTransfer?.setData("text/plain", path);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    draggingPath = path;
  }

  function sourcePath(event: DragEvent) {
    return (
      event.dataTransfer?.getData("text/lapis-list-path") ||
      event.dataTransfer?.getData("text/plain") ||
      draggingPath
    );
  }

  function allowDrop(event: DragEvent, key: string, list?: TaskListNavNode) {
    if (!canDrag || !draggingPath) return;
    event.preventDefault();
    dropKey = key;
    expandForDrop(key, list);
  }

  function dropOnSection(event: DragEvent, section: string) {
    event.preventDefault();
    const path = sourcePath(event);
    dropKey = null;
    draggingPath = null;
    if (!path || !onDrop) return;
    onDrop(path, { kind: "section", section });
  }

  function dropOnList(event: DragEvent, node: TaskListNavNode) {
    event.preventDefault();
    const path = sourcePath(event);
    dropKey = null;
    draggingPath = null;
    if (!path || !onDrop || path === node.path) return;
    onDrop(path, { kind: "nest", parentPath: node.path });
  }

  function endDrag() {
    draggingPath = null;
    dropKey = null;
  }

  function startRename(key: string) {
    editingKey = key;
  }

  function cancelRename() {
    editingKey = null;
  }

  function commitListRename(node: TaskListNavNode, value: string) {
    editingKey = null;
    const next = value.trim();
    if (!next || next === node.title) return;
    onRenameList?.(node.path, next);
  }

  function commitSectionRename(from: string, value: string) {
    editingKey = null;
    const next = value.trim();
    if (!next || next === from || from === "All lists") return;
    onRenameSection?.(from, next);
  }

  function sectionCount(lists: TaskListNavNode[]) {
    return lists.reduce((total, list) => total + list.count, 0);
  }

  const hasListMenu = $derived(
    Boolean(
      onOpenNote ||
      onRenameList ||
      onCreateList ||
      onUnpinList ||
      onArchiveList ||
      onDeleteList,
    ),
  );

  function canUnpin(node: TaskListNavNode) {
    return Boolean(onUnpinList && node.section && !node.parentId);
  }
</script>

<div class="task-list-tree__heading">
  <p class="task-column-canvas-story__section-label">Lists</p>
  <div class="task-list-tree__heading-actions">
    {#if onEditNavigation}
      <Button
        variant="ghost"
        size="icon-xs"
        class="task-list-tree__heading-action"
        aria-label="Edit lists navigation"
        title="Edit lists navigation"
        onclick={onEditNavigation}><PencilIcon /></Button
      >
    {/if}
    {#if onCreateList}
      <Button
        variant="ghost"
        size="icon-xs"
        class="task-list-tree__heading-action"
        aria-label="New list"
        title="New list"
        onclick={() => onCreateList?.({})}><PlusIcon /></Button
      >
    {/if}
  </div>
</div>
<ul class="task-list-tree" data-list-tree>
  {#each tree.sections as section (section.title)}
    {@render sectionFolder(section.title, section.lists, false)}
  {/each}
  {#if tree.unpinned.length}
    {@render sectionFolder("All lists", tree.unpinned, true)}
  {/if}
</ul>

{#snippet sectionRow(
  title: string,
  lists: TaskListNavNode[],
  allLists: boolean,
  key: string,
  open: boolean,
  editing: boolean,
  triggerProps: Record<string, unknown>,
)}
  <div
    {...triggerProps}
    class={[
      "task-list-tree__row",
      typeof triggerProps.class === "string" ? triggerProps.class : "",
    ]
      .filter(Boolean)
      .join(" ")}
    class:task-list-tree__row--drop={dropKey === key}
    class:task-list-tree__row--folder={true}
    role="group"
    data-tree-depth="0"
    data-list-section={title}
    data-drop={dropKey === key || undefined}
    ondragover={(event) => allowDrop(event, key)}
    ondrop={(event) => dropOnSection(event, title)}
  >
    <button
      type="button"
      class="task-list-tree__disclosure"
      class:task-list-tree__disclosure--open={open}
      aria-expanded={open}
      aria-label={open
        ? `Collapse ${title} section`
        : `Expand ${title} section`}
      onclick={(event) => {
        event.stopPropagation();
        toggleSection(title);
      }}
    >
      <ChevronRightIcon aria-hidden="true" />
    </button>
    {#if editing}
      <span class="task-list-tree__rename" {@attach focusRename}>
        <Input
          class="task-list-tree__rename-input"
          value={title}
          aria-label={`Rename ${title} section`}
          onkeydown={(event) => {
            if (event.code === "Enter") {
              event.preventDefault();
              commitSectionRename(title, event.currentTarget.value);
            }
            if (event.code === "Escape") cancelRename();
          }}
          onblur={(event) =>
            commitSectionRename(title, event.currentTarget.value)}
        />
      </span>
    {:else}
      <ColumnCanvas.Item
        aria-label={`${title} section`}
        onclick={() => toggleSection(title)}
        onkeydown={(event) => {
          if (event.code === "Enter" && !allLists && onRenameSection) {
            event.preventDefault();
            startRename(key);
          }
        }}
      >
        <span class="task-column-canvas-story__nav-item">
          <FolderIcon aria-hidden="true" />
          <span>{title}</span>
        </span>
      </ColumnCanvas.Item>
      <small class="task-list-tree__count">{sectionCount(lists)}</small>
    {/if}
  </div>
{/snippet}

{#snippet sectionFolder(
  title: string,
  lists: TaskListNavNode[],
  allLists: boolean,
)}
  {@const key = sectionKey(title)}
  {@const open = isSectionOpen(title)}
  {@const editing = editingKey === key}
  <li class="task-list-tree__item" style:--task-list-tree-depth={0}>
    {#if editing || !(onRenameSection || onCreateList)}
      {@render sectionRow(title, lists, allLists, key, open, editing, {})}
    {:else}
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          {#snippet child({ props })}
            {@render sectionRow(
              title,
              lists,
              allLists,
              key,
              open,
              editing,
              props,
            )}
          {/snippet}
        </ContextMenu.Trigger>
        <ContextMenu.Content aria-label={`${title} section actions`}>
          {#if onCreateList}
            <ContextMenu.Item
              onclick={() =>
                onCreateList({
                  section: allLists ? undefined : title,
                })}
            >
              New list
            </ContextMenu.Item>
          {/if}
          {#if !allLists && onRenameSection}
            <ContextMenu.Item onclick={() => startRename(key)}>
              Rename
            </ContextMenu.Item>
          {/if}
        </ContextMenu.Content>
      </ContextMenu.Root>
    {/if}
    {#if open}
      <div class="task-list-tree__branch">
        <span class="task-list-tree__guide" aria-hidden="true" data-list-guide
        ></span>
        <ul class="task-list-tree__sublist" data-list-sublist={title}>
          {#each lists as node (node.id)}
            {@render listRow(node, 1)}
          {/each}
        </ul>
      </div>
    {/if}
  </li>
{/snippet}

{#snippet listChrome(
  node: TaskListNavNode,
  depth: number,
  open: boolean,
  editing: boolean,
  nestable: boolean,
  selected: boolean,
  dropId: string,
  triggerProps: Record<string, unknown>,
)}
  <div
    {...triggerProps}
    class={[
      "task-list-tree__row",
      typeof triggerProps.class === "string" ? triggerProps.class : "",
    ]
      .filter(Boolean)
      .join(" ")}
    class:task-list-tree__row--drop={dropKey === `list:${node.id}` ||
      (taskDropEnabled && activeDropTargetId === dropId)}
    class:task-list-tree__row--dragging={draggingPath === node.path}
    role="group"
    data-tree-depth={depth}
    data-list-id={node.id}
    data-list-path={node.path}
    data-drop={dropKey === `list:${node.id}` || undefined}
    data-planner-drop-id={taskDropEnabled ? dropId : undefined}
    data-planner-drop-mode={taskDropEnabled ? "valid" : undefined}
    data-planner-drop-active={taskDropEnabled && activeDropTargetId === dropId
      ? true
      : undefined}
    data-planner-drop-data={taskDropEnabled
      ? JSON.stringify({
          type: "planner-sidebar-list",
          listId: node.id,
          title: node.title,
        })
      : undefined}
    draggable={canDrag && !editing}
    ondragstart={(event) => dragPayload(event, node.path)}
    ondragend={endDrag}
    ondragover={(event) => allowDrop(event, `list:${node.id}`, node)}
    ondrop={(event) => dropOnList(event, node)}
  >
    {#if nestable}
      <button
        type="button"
        class="task-list-tree__disclosure"
        class:task-list-tree__disclosure--open={open}
        aria-expanded={open}
        aria-label={open ? `Collapse ${node.title}` : `Expand ${node.title}`}
        onpointerdown={(event) => event.stopPropagation()}
        onclick={(event) => {
          event.stopPropagation();
          toggleList(node);
        }}
      >
        <ChevronRightIcon aria-hidden="true" />
      </button>
    {:else}
      <span class="task-list-tree__disclosure-spacer"></span>
    {/if}
    {#if editing}
      <span class="task-list-tree__rename" {@attach focusRename}>
        <Input
          class="task-list-tree__rename-input"
          value={node.title}
          aria-label={`Rename ${node.title}`}
          onkeydown={(event) => {
            if (event.code === "Enter") {
              event.preventDefault();
              commitListRename(node, event.currentTarget.value);
            }
            if (event.code === "Escape") cancelRename();
          }}
          onblur={(event) => commitListRename(node, event.currentTarget.value)}
        />
      </span>
    {:else}
      <ColumnCanvas.Item
        aria-label={node.title}
        {selected}
        onclick={() => onSelect(node.id)}
        onkeydown={(event) => {
          if (event.code === "Enter" && selected && onRenameList) {
            event.preventDefault();
            startRename(`list:${node.id}`);
          }
        }}
      >
        <span class="task-column-canvas-story__nav-item">
          <FolderKanbanIcon aria-hidden="true" />
          <span>{node.title}</span>
        </span>
      </ColumnCanvas.Item>
      <small class="task-list-tree__count">{node.count}</small>
    {/if}
  </div>
{/snippet}

{#snippet listRow(node: TaskListNavNode, depth: number)}
  {@const open = isListOpen(node.id)}
  {@const editing = editingKey === `list:${node.id}`}
  {@const dropId = listDropId(node.id)}
  {@const nestable = node.hasChildren || node.children.length > 0}
  {@const selected = isSelected(node.id) || selectedId === node.id}
  <li class="task-list-tree__item" style:--task-list-tree-depth={depth}>
    {#if editing || !hasListMenu}
      {@render listChrome(
        node,
        depth,
        open,
        editing,
        nestable,
        selected,
        dropId,
        {},
      )}
    {:else}
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          {#snippet child({ props })}
            {@render listChrome(
              node,
              depth,
              open,
              editing,
              nestable,
              selected,
              dropId,
              props,
            )}
          {/snippet}
        </ContextMenu.Trigger>
        <ContextMenu.Content aria-label={`${node.title} list actions`}>
          {#if onOpenNote}
            <ContextMenu.Item onclick={() => onOpenNote(node.path)}>
              Open note
            </ContextMenu.Item>
          {/if}
          {#if onRenameList}
            <ContextMenu.Item onclick={() => startRename(`list:${node.id}`)}>
              Rename
            </ContextMenu.Item>
          {/if}
          {#if onCreateList}
            <ContextMenu.Item
              onclick={() => {
                expandedLists.add(node.id);
                onCreateList({ nestUnderPath: node.path });
              }}
            >
              New nested list
            </ContextMenu.Item>
          {/if}
          {#if canUnpin(node)}
            <ContextMenu.Item onclick={() => onUnpinList?.(node.path)}>
              Unpin
            </ContextMenu.Item>
          {/if}
          {#if onArchiveList || onDeleteList}
            <ContextMenu.Separator />
          {/if}
          {#if onArchiveList}
            <ContextMenu.Item onclick={() => onArchiveList(node.path)}>
              Archive
            </ContextMenu.Item>
          {/if}
          {#if onDeleteList}
            <ContextMenu.Item
              variant="destructive"
              onclick={() => onDeleteList(node.path)}
            >
              Delete
            </ContextMenu.Item>
          {/if}
        </ContextMenu.Content>
      </ContextMenu.Root>
    {/if}
    {#if open && node.children.length}
      <div class="task-list-tree__branch">
        <span class="task-list-tree__guide" aria-hidden="true" data-list-guide
        ></span>
        <ul class="task-list-tree__sublist" data-list-sublist={node.title}>
          {#each node.children as child (child.id)}
            {@render listRow(child, depth + 1)}
          {/each}
        </ul>
      </div>
    {/if}
  </li>
{/snippet}

<style>
  .task-list-tree__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* Center the 24px action over the 20px count, whose trailing inset is 1rem. */
    padding: 0.5rem 0.875rem 0.25rem 0.55rem;
  }

  .task-list-tree__heading .task-column-canvas-story__section-label {
    padding: 0;
  }

  .task-list-tree__heading-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .task-list-tree__heading-actions :global(.task-list-tree__heading-action) {
    color: var(--ui-tasks-muted);
  }

  .task-list-tree__heading-actions
    :global(.task-list-tree__heading-action:hover),
  .task-list-tree__heading-actions
    :global(.task-list-tree__heading-action:focus-visible) {
    background: var(--sidebar-accent, var(--ui-tasks-muted-surface));
    color: var(--sidebar-accent-foreground, var(--ui-tasks-foreground));
  }
</style>
