<script lang="ts">
  import { FrontmatterEditor } from "@lapismd/mira/preview";
  import { FrontmatterController } from "@lapismd/mira/preview/frontmatter";
  import * as ScrollArea from "@lapismd/design-core/shadcn/scroll-area";
  import { untrack, type ComponentProps, type Snippet } from "svelte";
  import ReferenceMarkdownPreview from "../lib/model/ReferenceMarkdownPreview.svelte";
  import TaskDetailExtras from "../lib/tasks/TaskDetailExtras.svelte";
  import { ApplicationTaskSidebarDetail } from "../lib/tasks";
  import {
    editableTaskMetadata,
    sidebarTask,
    type SavedTask,
  } from "./task-data";

  type DetailPatch = Parameters<
    NonNullable<
      ComponentProps<typeof ApplicationTaskSidebarDetail>["onUpdateTask"]
    >
  >[1];

  let {
    selected,
    disabled,
    canUse,
    write,
    onMetadataChange,
    complete,
    closeAction,
  }: {
    selected: SavedTask;
    disabled: boolean;
    canUse: (name: string) => boolean;
    write: (name: string, fields: Record<string, unknown>) => Promise<void>;
    onMetadataChange: (patch: DetailPatch) => void;
    complete: () => void;
    closeAction?: Snippet;
  } = $props();

  const task = $derived(sidebarTask(selected));
  const inboxEditable = $derived(!disabled && canUse("tasks_inbox"));
  const properties = new FrontmatterController({
    async onRecordChange({ record }) {
      if (
        inboxEditable &&
        typeof record.inbox === "boolean" &&
        record.inbox !== (task.inbox ?? false)
      ) {
        await write("tasks_inbox", { inbox: record.inbox });
      }
      properties.syncRecord({ inbox: task.inbox ?? false });
    },
  });

  $effect(() => {
    const inbox = task.inbox ?? false;
    untrack(() => properties.syncRecord({ inbox }));
  });

  // Mira renders a full property editor. The MCP view exposes only the
  // Inbox value and has no grant to rename, add, or retype properties.
  function limitPropertyControls(node: HTMLElement, editable: boolean) {
    function syncControls() {
      for (const button of node.querySelectorAll<HTMLButtonElement>(
        ".metadata-add-property, .metadata-property-type-button",
      )) {
        button.disabled = true;
      }
      for (const name of node.querySelectorAll<HTMLInputElement>(
        ".metadata-property-key input",
      )) {
        name.readOnly = true;
        name.tabIndex = -1;
      }
      const inbox = node.querySelector<HTMLInputElement>(
        '[data-property="inbox"] input[type="checkbox"]',
      );
      if (inbox) inbox.disabled = !editable;
    }

    const observer = new MutationObserver(syncControls);
    observer.observe(node, { childList: true, subtree: true });
    syncControls();
    return {
      update(next: boolean) {
        editable = next;
        syncControls();
      },
      destroy: () => observer.disconnect(),
    };
  }
</script>

<ApplicationTaskSidebarDetail
  regionLabel="Selected task"
  busy={disabled}
  {task}
  {closeAction}
  controls={{
    title: false,
    menu: false,
    completion: !disabled && task.status === "open" && canUse("tasks_complete"),
    editableMetadata: editableTaskMetadata(canUse, disabled),
  }}
  documentBodyEnabled
  onUpdateTask={(_, patch) => onMetadataChange(patch)}
  onToggleDone={(_, event) => {
    (event.currentTarget as HTMLInputElement).checked = task.status !== "open";
    complete();
  }}
>
  {#snippet extras()}
    <TaskDetailExtras {task} snapshotComments={selected.task.task.comments} />
  {/snippet}
  {#snippet documentBody()}
    <ScrollArea.Root aria-label="Task properties and notes">
      <div class="task-sidebar-detail__scroll-content">
        <div
          class="mira"
          data-mira-theme="obsidian"
          use:limitPropertyControls={inboxEditable}
        >
          <FrontmatterEditor controller={properties} open={false} />
        </div>
        {#if task.notes.trim()}
          <ReferenceMarkdownPreview value={task.notes} compact />
        {/if}
      </div>
    </ScrollArea.Root>
  {/snippet}
</ApplicationTaskSidebarDetail>
