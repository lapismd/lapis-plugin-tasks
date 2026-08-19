<script lang="ts">
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import FolderKanbanIcon from "@lucide/svelte/icons/folder-kanban";
  import * as ColumnCanvas from "@lapismd/design-core/shadcn/column-canvas";
  import { SvelteSet } from "svelte/reactivity";
  import type {
    ListTreeDropTarget,
    TaskListNavNode,
    TaskListNavigationSnapshot,
  } from "../../model";

  let {
    tree,
    selectedId = null,
    isSelected,
    onSelect,
    onExpand,
    onDrop,
  }: {
    tree: TaskListNavigationSnapshot;
    selectedId?: string | null;
    isSelected: (id: string) => boolean;
    onSelect: (id: string) => void;
    onExpand?: (id: string) => void;
    onDrop?: (sourcePath: string, target: ListTreeDropTarget) => void;
  } = $props();

  let expanded = new SvelteSet<string>();
  let draggingPath = $state<string | null>(null);
  let dropKey = $state<string | null>(null);

  const canDrag = $derived(Boolean(onDrop));

  function isExpanded(id: string) {
    return expanded.has(id);
  }

  function toggle(node: TaskListNavNode) {
    if (expanded.has(node.id)) expanded.delete(node.id);
    else {
      expanded.add(node.id);
      if (!node.children.length && node.hasChildren) onExpand?.(node.id);
    }
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

  function allowDrop(event: DragEvent, key: string) {
    if (!canDrag || !draggingPath) return;
    event.preventDefault();
    dropKey = key;
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
</script>

<p class="task-column-canvas-story__section-label">Lists</p>
{#each tree.sections as section (section.title)}
  <p
    class="task-column-canvas-story__section-label task-list-tree__section"
    class:task-list-tree__section--drop={dropKey === `section:${section.title}`}
    data-list-section={section.title}
    ondragover={(event) => allowDrop(event, `section:${section.title}`)}
    ondrop={(event) => dropOnSection(event, section.title)}
  >
    {section.title}
  </p>
  {#each section.lists as node (node.id)}
    {@render listRow(node, 0)}
  {/each}
{/each}
{#if tree.unpinned.length}
  <p
    class="task-column-canvas-story__section-label task-list-tree__section"
    class:task-list-tree__section--drop={dropKey === "section:All lists"}
    data-list-section="All lists"
    ondragover={(event) => allowDrop(event, "section:All lists")}
    ondrop={(event) => dropOnSection(event, "All lists")}
  >
    All lists
  </p>
  {#each tree.unpinned as node (node.id)}
    {@render listRow(node, 0)}
  {/each}
{/if}

{#snippet listRow(node: TaskListNavNode, depth: number)}
  {@const open = isExpanded(node.id)}
  <div
    class="task-list-tree__row"
    class:task-list-tree__row--drop={dropKey === `list:${node.id}`}
    class:task-list-tree__row--dragging={draggingPath === node.path}
    style:--task-list-tree-depth={depth}
    role="listitem"
    data-list-id={node.id}
    data-list-path={node.path}
    data-list-depth={depth}
    draggable={canDrag}
    ondragstart={(event) => dragPayload(event, node.path)}
    ondragend={endDrag}
    ondragover={(event) => allowDrop(event, `list:${node.id}`)}
    ondrop={(event) => dropOnList(event, node)}
  >
    {#if node.hasChildren || node.children.length}
      <button
        type="button"
        class="task-list-tree__disclosure"
        class:task-list-tree__disclosure--open={open}
        aria-expanded={open}
        aria-label={open ? `Collapse ${node.title}` : `Expand ${node.title}`}
        onclick={(event) => {
          event.stopPropagation();
          toggle(node);
        }}
      >
        <ChevronRightIcon aria-hidden="true" />
      </button>
    {:else}
      <span class="task-list-tree__disclosure-spacer"></span>
    {/if}
    <ColumnCanvas.Item
      aria-label={node.title}
      selected={isSelected(node.id) || selectedId === node.id}
      onclick={() => onSelect(node.id)}
    >
      <span class="task-column-canvas-story__nav-item">
        <FolderKanbanIcon aria-hidden="true" />
        <span>{node.title}</span>
        <small>{node.count}</small>
      </span>
    </ColumnCanvas.Item>
  </div>
  {#if open}
    {#each node.children as child (child.id)}
      {@render listRow(child, depth + 1)}
    {/each}
  {/if}
{/snippet}