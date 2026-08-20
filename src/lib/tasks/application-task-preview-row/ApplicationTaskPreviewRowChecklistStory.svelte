<script lang="ts">
  import type { ApplicationTask, ChecklistItem } from "../../model";
  import { noop } from "../story-fixture";
  import ApplicationTaskPreviewRow from "./ApplicationTaskPreviewRow.svelte";

  let {
    failUpdates = false,
    showExternalRefresh = false,
  }: {
    failUpdates?: boolean;
    showExternalRefresh?: boolean;
  } = $props();

  let task = $state<ApplicationTask>({
    id: "task-checklist",
    body: "Review interview notes",
    done: false,
    status: "todo",
    checklistTotal: 3,
    checklistCompleted: 1,
  });
  let checklist = $state<ChecklistItem[]>([
    { position: 1, text: "Pull the incident timeline", checked: true },
    {
      position: 2,
      text: "Note the Kubernetes upgrade cadence",
      checked: false,
    },
    { position: 3, text: "Prepare a mentoring example", checked: false },
  ]);
  let checklistRefreshVersion = $state(0);

  async function loadChecklist(): Promise<ChecklistItem[]> {
    return checklist.map((item) => ({ ...item }));
  }

  async function toggleChecklistItem(
    item: ChecklistItem,
    checked: boolean,
  ): Promise<ChecklistItem[]> {
    if (failUpdates) {
      await Promise.resolve();
      throw new Error("Checklist changed; reload and try again.");
    }
    checklist = checklist.map((entry) =>
      entry.position === item.position ? { ...entry, checked } : entry,
    );
    task = {
      ...task,
      checklistCompleted: checklist.filter((entry) => entry.checked).length,
    };
    return checklist.map((entry) => ({ ...entry }));
  }

  function refreshChecklistExternally() {
    checklist = checklist.map((entry) =>
      entry.position === 2
        ? { ...entry, text: "Confirm the updated upgrade cadence" }
        : entry,
    );
    checklistRefreshVersion += 1;
  }
</script>

<div class="task-story-frame task-story-frame--xl">
  {#if showExternalRefresh}
    <button type="button" onclick={refreshChecklistExternally}>
      Simulate external checklist edit
    </button>
  {/if}
  <ApplicationTaskPreviewRow
    {task}
    taskIndex={0}
    taskTotal={1}
    onToggleDone={noop}
    onLoadChecklist={loadChecklist}
    onToggleChecklistItem={toggleChecklistItem}
    {checklistRefreshVersion}
  />
</div>
