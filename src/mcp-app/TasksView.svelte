<script lang="ts">
  import {
    ApplicationPlannerTaskRow,
    TaskTrackingCompletionPrompt,
  } from "../lib/tasks";
  import * as ColumnCanvas from "@lapismd/design-core/shadcn/column-canvas";
  import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
  import { Button } from "@lapismd/design-core/shadcn/button";
  import { onMount, type ComponentProps } from "svelte";
  import { z } from "zod";
  import {
    connectView,
    ToolFailure,
    toolValue,
    type ToolBridge,
  } from "./bridge";
  import {
    allowedTools,
    checkboxPermissions,
    completionResult,
    invocationId,
    listInput,
    listResult,
    localDate,
    planKind,
    sidebarTask,
    promptTask,
    savedTask,
    plannerTask,
    type ListedTask,
    writeResult,
    type SavedTask,
  } from "./task-data";
  import TaskFields from "./TaskFields.svelte";

  let bridge: ToolBridge;
  let listArgs = $state.raw<z.infer<typeof listInput>>();
  let list = $state.raw<z.infer<typeof listResult>>();
  let selected = $state.raw<SavedTask>();
  let selectedPath = $state("");
  let details = $state<"inline" | "column">();
  const canvas = ColumnCanvas.createColumnCanvasController({
    columns: {
      planner: {
        defaultWidth: 510,
        minWidth: 320,
        maxWidth: null,
        resizable: true,
      },
      detail: {
        defaultWidth: 340,
        minWidth: 280,
        maxWidth: null,
        pathLevel: 1,
        closeable: true,
      },
    },
  });
  let tools = $state.raw<string[]>([]);
  let canCall = $state(false);
  let busy = $state(true);
  let readingTask = $state(false);
  let prompt = $state(false);
  let error = $state("");
  let notice = $state("");
  let stale = $state(false);
  let uncertain = $state<{ id: string; path: string }>();

  onMount(() => {
    bridge = connectView("Lapis Tasks", {
      input(value) {
        listArgs = listInput.safeParse(value).data;
      },
      result(result) {
        try {
          list = toolValue(result, listResult);
          tools =
            allowedTools.safeParse(result._meta?.["io.lapismd/availableTools"])
              .data ?? [];
        } catch {
          error = "The tasks could not be read.";
        }
        busy = false;
      },
      ready(available) {
        canCall = available;
      },
      failed(message) {
        error = message;
        busy = false;
      },
    });
    return () => {
      bridge.stop();
      void canvas.dispose();
    };
  });

  function canUse(name: string) {
    return canCall && tools.includes(name);
  }

  async function readTask(vault: string, path: string) {
    const next = toolValue(
      await bridge.call("tasks_get", { vault_id: vault, path }),
      savedTask,
    );
    if (next.task.path !== path || next.snapshot.path !== path) {
      throw new Error("Unexpected task identity");
    }
    return next;
  }

  async function loadTask(vault: string, path: string) {
    selected = await readTask(vault, path);
    stale = false;
  }

  async function select(path: string) {
    if (busy || uncertain || !listArgs || !canCall) return;
    selectedPath = path;
    if (details === "column" && canvas.pathAt(0) !== path)
      canvas.select(0, path);
    selected = undefined;
    readingTask = true;
    busy = true;
    error = "";
    notice = "";
    try {
      await loadTask(listArgs.vault_id, path);
    } catch {
      error = "The saved task could not be read.";
    } finally {
      readingTask = false;
      busy = false;
    }
  }

  function closeDetails() {
    details = undefined;
    canvas.clear();
  }

  function requestDetails(path: string, presentation: "inline" | "column") {
    const movingWhileReading = readingTask && selectedPath === path;
    if ((busy && !movingWhileReading) || prompt || uncertain || !canCall)
      return;
    if (details === presentation && selectedPath === path) {
      closeDetails();
      return;
    }
    details = presentation;
    if (presentation === "inline") canvas.clear();
    else if (movingWhileReading) canvas.select(0, path);
    if (!movingWhileReading) void select(path);
  }

  function selectRow(path: string) {
    if (busy || prompt || uncertain || !canCall) return;
    if (details === "column" && selectedPath !== path) void select(path);
    else if (!details) selectedPath = path;
  }

  async function prepareWrite(path: string, name: string) {
    if (busy || prompt || uncertain || !canUse(name)) return false;
    if (selected?.snapshot.path !== path) {
      if (details === "inline") closeDetails();
      await select(path);
    }
    return selected?.snapshot.path === path && !stale && canUse(name);
  }

  async function toggleTask(row: ListedTask, event: Event) {
    (event.currentTarget as HTMLInputElement).checked = row.status !== "open";
    if (row.status !== "open") return;
    if (await prepareWrite(row.documentPath, "tasks_complete")) complete();
  }

  type SchedulePatch = Parameters<
    NonNullable<
      ComponentProps<typeof ApplicationPlannerTaskRow>["onUpdateTask"]
    >
  >[1];

  async function updateSchedule(row: ListedTask, patch: SchedulePatch) {
    if (
      busy ||
      prompt ||
      uncertain ||
      !canUse("tasks_plan") ||
      !Object.hasOwn(patch, "planDate")
    )
      return;
    if (patch.start === "someday") {
      error =
        "This view can change planned dates. Use Lapis Tasks to move a task to Someday.";
      return;
    }
    if (!(await prepareWrite(row.documentPath, "tasks_plan"))) return;
    await writePlan(patch.planDate, patch.planAt, plannerTask(row).planAt);
  }

  async function writePlan(
    date: string | undefined,
    at: string | undefined,
    previousAt: string | undefined,
  ) {
    const current = selected?.task.task.plan;
    if (!date) {
      await write("tasks_plan", { plan: null });
      return;
    }
    const picked = at !== previousAt ? at : undefined;
    const named = planKind.safeParse(picked).data;
    const time =
      picked && /^([01]\d|2[0-3]):[0-5]\d$/.test(picked) ? picked : undefined;
    await write("tasks_plan", {
      plan: {
        ...current,
        date,
        at: time ? "time" : (named ?? current?.at ?? "anytime"),
        ...(picked ? { time: time ?? null } : {}),
      },
    });
  }

  async function updateDetail(patch: SchedulePatch) {
    if (!selected || busy || prompt || stale || uncertain) return;
    const current = sidebarTask(selected);
    if (patch.deadline !== current.deadline) {
      await write("tasks_deadline", { deadline: patch.deadline ?? null });
    } else if (patch.start === "someday" && current.start !== "someday") {
      error = "Use Lapis Tasks to move a task to Someday.";
    } else if (
      patch.planDate !== current.planDate ||
      patch.planAt !== current.planAt
    ) {
      await writePlan(patch.planDate, patch.planAt, current.planAt);
    }
  }

  async function loadChecklist(path: string) {
    if (!listArgs || !canCall)
      throw new Error("Checklist details are unavailable.");
    return (await readTask(listArgs.vault_id, path)).task.checklist;
  }

  async function loadList() {
    if (!listArgs) return;
    const result = await bridge.call("tasks_list", listArgs);
    list = toolValue(result, listResult);
    tools =
      allowedTools.safeParse(result._meta?.["io.lapismd/availableTools"])
        .data ?? [];
  }

  async function refresh() {
    if (busy || !listArgs) return;
    busy = true;
    error = "";
    try {
      await loadList();
    } catch {
      error = "The tasks could not be refreshed.";
    } finally {
      busy = false;
    }
  }

  async function afterWrite(vault: string, path: string, message: string) {
    notice = message;
    try {
      await loadTask(vault, path);
      await loadList();
    } catch {
      error = "Some task data could not be refreshed.";
    }
  }

  async function write(name: string, fields: Record<string, unknown>) {
    const current = selected;
    if (!current || !listArgs || busy || stale || uncertain || !canUse(name))
      return;
    const vault = listArgs.vault_id;
    const path = current.snapshot.path;
    const id = invocationId();
    const at = new Date();
    const completing = name === "tasks_complete";
    busy = true;
    prompt = false;
    notice = "";
    error = "";
    try {
      const result = await bridge.call(name, {
        ...fields,
        vault_id: vault,
        path,
        expected_version: current.snapshot.version,
        invocation_id: id,
        at: at.toISOString(),
        ...(completing ? { localDate: localDate(at) } : {}),
      });
      if (completing) {
        const receipt = toolValue(result, completionResult).operation;
        if (
          receipt?.request_id !== id ||
          receipt.path !== path ||
          receipt.disposition !== "completed"
        ) {
          throw new Error("Completion requires journal confirmation");
        }
      } else {
        toolValue(result, writeResult);
      }
      stale = true;
      await afterWrite(
        vault,
        path,
        completing ? "Task completed." : "Task updated.",
      );
    } catch (cause) {
      stale = true;
      if (cause instanceof ToolFailure && cause.effect === "not_started") {
        error =
          cause.code === "CONFLICT"
            ? "The task changed or is open for editing. Reload the saved task before trying again."
            : "The server refused the task change. Reload the saved task before trying again.";
      } else if (completing) {
        uncertain = { id, path };
        error =
          "Completion could not be confirmed. Check its status before making another change.";
      } else {
        error = `The change could not be confirmed. Reload the saved task. Request ID: ${id}`;
      }
    } finally {
      busy = false;
    }
  }

  function complete() {
    if (
      selected?.task.task.status !== "open" ||
      busy ||
      stale ||
      uncertain ||
      !canUse("tasks_complete")
    )
      return;
    const tracking = selected.task.task.tracking;
    if (tracking && tracking.type !== "boolean") prompt = true;
    else void write("tasks_complete", {});
  }

  async function checkCompletion() {
    const request = uncertain;
    if (busy || !request || !listArgs || !canUse("tasks_inspect")) return;
    const vault = listArgs.vault_id;
    busy = true;
    error = "";
    try {
      const result = await bridge.call("tasks_inspect", {
        vault_id: vault,
        request_id: request.id,
      });
      const receipt = toolValue(result, completionResult).operation;
      if (
        receipt?.request_id === request.id &&
        receipt.path === request.path &&
        receipt.disposition === "completed"
      ) {
        await afterWrite(vault, request.path, "Task completed.");
        uncertain = undefined;
      } else {
        error = `Completion status: ${receipt?.disposition ?? "no receipt found"}. Use Tasks recovery in Lapis to review this request.`;
      }
    } catch {
      error =
        "Completion status is unavailable. Use Tasks recovery in Lapis to review this request.";
    } finally {
      busy = false;
    }
  }
</script>

{#snippet closeColumn()}
  <ColumnCanvas.Close onclick={closeDetails} />
{/snippet}

{#snippet detailFields(closeAction: import("svelte").Snippet)}
  {#if selected?.snapshot.path === selectedPath}
    <TaskFields
      {selected}
      disabled={busy || stale || Boolean(uncertain)}
      {canUse}
      {write}
      {complete}
      {closeAction}
      onMetadataChange={(patch) => void updateDetail(patch)}
    />
  {/if}
{/snippet}

<main class="tasks-app">
  {#if notice}<p class="message" role="status">{notice}</p>{/if}
  {#if error}<p class="message" role="alert">{error}</p>{/if}
  {#if selectedPath && !uncertain && (stale || (details && !selected)) && canCall && !busy}
    <Button size="sm" variant="outline" onclick={() => select(selectedPath)}
      >Reload saved task</Button
    >
  {/if}
  {#if uncertain}
    <p>Request ID: <code>{uncertain.id}</code></p>
    {#if canUse("tasks_inspect")}
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onclick={checkCompletion}>Check completion status</Button
      >
    {/if}
  {/if}
  <ColumnCanvas.Root
    controller={canvas}
    class="tasks-canvas"
    aria-label="Task planner"
    compactBreakpoint={640}
  >
    <ColumnCanvas.Column id="planner" columnTitle="Lapis Tasks">
      <ColumnCanvas.Header>
        <ColumnCanvas.Title>Lapis Tasks</ColumnCanvas.Title>
        {#if canCall && listArgs}
          <ColumnCanvas.HeaderActions>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Refresh tasks"
              title="Refresh tasks"
              disabled={busy}
              onclick={refresh}
            >
              <RefreshCwIcon aria-hidden="true" />
            </Button>
          </ColumnCanvas.HeaderActions>
        {/if}
      </ColumnCanvas.Header>
      <ColumnCanvas.Body>
        <div class="task-list">
          {#if list}
            {@const rows = list.items.filter((item) => item.kind === "task")}
            {#if rows.length}
              <ul aria-label="Tasks" inert={Boolean(uncertain)}>
                {#each rows as row (row.documentPath)}
                  <li
                    use:checkboxPermissions={row.status === "open" &&
                      !busy &&
                      !prompt &&
                      canUse("tasks_complete") &&
                      !(stale && selectedPath === row.documentPath)}
                  >
                    {#snippet closeInline()}
                      <Button size="sm" variant="ghost" onclick={closeDetails}
                        >Close inline details</Button
                      >
                    {/snippet}
                    {#snippet inlineDetails()}
                      {@render detailFields(closeInline)}
                    {/snippet}
                    <ApplicationPlannerTaskRow
                      task={plannerTask(row)}
                      selected={selectedPath === row.documentPath}
                      selectionPosition={selectedPath === row.documentPath
                        ? "single"
                        : null}
                      overdue={row.status === "open" &&
                        Boolean(
                          row.planDate && row.planDate < localDate(new Date()),
                        )}
                      expanded={details === "inline" &&
                        selectedPath === row.documentPath}
                      reorderable={false}
                      deletable={false}
                      editable={canUse("tasks_plan") &&
                        !(
                          selectedPath === row.documentPath &&
                          (stale || details === "inline")
                        )}
                      selectOnSurfaceClick
                      onSelectTask={() => selectRow(row.documentPath)}
                      onRequestOpen={(_, source) =>
                        requestDetails(
                          row.documentPath,
                          source === "details-button" ? "column" : "inline",
                        )}
                      notesContent={inlineDetails}
                      onToggleDone={(_, event) => void toggleTask(row, event)}
                      onUpdateTask={(_, patch) =>
                        void updateSchedule(row, patch)}
                      onLoadChecklist={() => loadChecklist(row.documentPath)}
                    />
                  </li>
                {/each}
              </ul>
            {:else}
              <p>No tasks in this view.</p>
            {/if}
            {#if list.truncated}<p>Showing a limited set of tasks.</p>{/if}
          {:else if busy}
            <p role="status">Reading tasks…</p>
          {/if}
        </div>
      </ColumnCanvas.Body>
    </ColumnCanvas.Column>
    <ColumnCanvas.Column id="detail" columnTitle="Task details">
      {@render detailFields(closeColumn)}
    </ColumnCanvas.Column>
  </ColumnCanvas.Root>

  {#if prompt && selected}
    <TaskTrackingCompletionPrompt
      task={promptTask(selected)}
      onCancel={() => (prompt = false)}
      onConfirm={(value) => write("tasks_complete", { trackedValue: value })}
    />
  {/if}
</main>

<style>
  .tasks-app {
    max-inline-size: none;
    padding: 0;
  }

  .tasks-app :global(.tasks-canvas) {
    --ui-column-canvas-background: var(--mcp-canvas);
    --ui-column-canvas-column-background: var(--mcp-canvas);
    block-size: 27rem;
  }

  .task-list,
  .tasks-app > :global(.message) {
    padding-inline: 0.75rem;
  }

  ul {
    padding: 0;
    margin: 0;
    list-style: none;
  }
</style>
