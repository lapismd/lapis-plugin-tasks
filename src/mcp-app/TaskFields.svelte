<script lang="ts">
  import { Checkbox } from "@lapismd/design-core/shadcn/checkbox";
  import * as Collapsible from "@lapismd/design-core/shadcn/collapsible";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import * as ScrollArea from "@lapismd/design-core/shadcn/scroll-area";
  import { Button } from "@lapismd/design-core/shadcn/button";
  import type { ComponentProps, Snippet } from "svelte";
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
      <Collapsible.Root>
        <Collapsible.Trigger>
          {#snippet child({ props })}
            <Button {...props} variant="ghost">
              <ChevronRightIcon aria-hidden="true" />
              Properties
            </Button>
          {/snippet}
        </Collapsible.Trigger>
        <Collapsible.Content>
          {#if canUse("tasks_inbox")}
            <label>
              <Checkbox
                checked={task.inbox ?? false}
                {disabled}
                onCheckedChange={(inbox) =>
                  void write("tasks_inbox", { inbox })}
              />
              In Inbox
            </label>
          {:else}
            <p>{task.inbox ? "In Inbox" : "Outside Inbox"}</p>
          {/if}
        </Collapsible.Content>
      </Collapsible.Root>
      {#if task.notes.trim()}
        <ReferenceMarkdownPreview value={task.notes} compact />
      {/if}
    </ScrollArea.Root>
  {/snippet}
</ApplicationTaskSidebarDetail>
