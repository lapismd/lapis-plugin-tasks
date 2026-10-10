<script lang="ts">
  import { Button } from "@lapismd/design-core/shadcn/button";
  import { Textarea } from "@lapismd/design-core/shadcn/textarea";
  import * as Chat from "@lapismd/design-core/ai/chat";
  import * as Accordion from "@lapismd/design-core/shadcn/accordion";
  import * as Empty from "@lapismd/design-core/shadcn/empty";
  import CheckIcon from "@lucide/svelte/icons/check";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import * as ToggleGroup from "@lapismd/design-core/shadcn/toggle-group";
  import {
    addPlannerDays,
    todayDateOnly,
    filterTaskOccurrenceHistory,
    deriveTaskOccurrenceStatistics,
    type Task,
    type TaskComment,
    type TaskRepository,
    type TaskOccurrenceHistoryRow,
    type TaskOccurrenceHistoryFilter,
  } from "../model";
  let {
    task,
    repository,
    revision = 0,
    onBeforeMutation,
    onRefresh,
  }: {
    task: Task;
    repository: TaskRepository;
    revision?: number;
    onBeforeMutation: () => Promise<void>;
    onRefresh: () => void | Promise<void>;
  } = $props();
  let comments = $state<TaskComment[]>([]);
  let openSections = $state<string[]>(["comments"]);
  let rows = $state<TaskOccurrenceHistoryRow[]>([]);
  let draft = $state("");
  let editId = $state<string | null>(null);
  let editDraft = $state("");
  let days = $state("30");
  let filter = $state<TaskOccurrenceHistoryFilter>("all");
  let error = $state<string | null>(null);
  let busy = $state(false);
  let generation = 0;
  const today = $derived(todayDateOnly(repository.now()));
  const filteredRows = $derived(filterTaskOccurrenceHistory(rows, filter));
  const statistics = $derived(
    deriveTaskOccurrenceStatistics(
      rows,
      today as `${number}-${number}-${number}`,
    ),
  );
  async function load(path: string, period: string) {
    const current = ++generation;
    try {
      const document = await repository.getTaskDocument(path);
      const history =
        document.task.tracking && document.task.repeat
          ? await repository.occurrenceHistory(
              addPlannerDays(
                today,
                1 - Number(period),
              ) as `${number}-${number}-${number}`,
              today as `${number}-${number}-${number}`,
              today as `${number}-${number}-${number}`,
            )
          : [];
      if (current !== generation) return;
      comments = document.task.comments;
      rows = history.filter((row) => row.taskId === task.id);
    } catch (cause) {
      if (current === generation)
        error = cause instanceof Error ? cause.message : String(cause);
    }
  }
  $effect(() => {
    revision;
    const path = task.sourcePath;
    const period = days;
    if (path) void load(path, period);
  });
  async function mutate(action: () => Promise<void>) {
    if (busy) return;
    busy = true;
    error = null;
    try {
      await onBeforeMutation();
      await action();
      await onRefresh();
      await load(task.sourcePath!, days);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busy = false;
    }
  }
  async function post(value: string) {
    if (busy || !value.trim()) return;
    // The shared composer clears after submit; restore only an unpersisted draft.
    const submittedDraft = draft;
    let saved = false;
    await mutate(async () => {
      await repository.addComment(task.sourcePath!, value);
      saved = true;
    });
    if (!saved) draft = submittedDraft;
  }
</script>

<section
  class="task-detail-extras"
  aria-label={`${task.title} comments and history`}
>
  {#if error}<p role="alert">{error}</p>{/if}
  <Accordion.Root type="multiple" bind:value={openSections}>
    {#if task.tracking && task.repeat}
      <Accordion.Item value="history">
        <Accordion.Trigger
          level={2}
          indicatorPosition="start"
          indicatorVariant="disclosure">History</Accordion.Trigger
        >
        <Accordion.Content>
          <ToggleGroup.Root
            type="single"
            value={days}
            onValueChange={(value) => {
              if (value) days = value;
            }}
            aria-label="History period"
          >
            {#each ["7", "30", "90"] as period}<ToggleGroup.Item value={period}
                >{period} days</ToggleGroup.Item
              >{/each}
          </ToggleGroup.Root>
          <p class="task-detail-extras__muted">
            Statistics for the last {days} days
          </p>
          <dl class="task-detail-extras__statistics">
            <div>
              <dt>Current streak in range</dt>
              <dd>{statistics.currentStreak}</dd>
            </div>
            <div>
              <dt>Longest streak in range</dt>
              <dd>{statistics.longestStreak}</dd>
            </div>
            <div>
              <dt>Completion rate</dt>
              <dd>
                {statistics.completionRate === null
                  ? "No finished occurrences"
                  : `${Math.round(statistics.completionRate * 100)}%`}
              </dd>
            </div>
            {#if statistics.total !== undefined}<div>
                <dt>Total</dt>
                <dd>{statistics.total} {statistics.unit ?? ""}</dd>
              </div>{/if}
            {#if statistics.average !== undefined}<div>
                <dt>Average</dt>
                <dd>
                  {Number(statistics.average.toFixed(2))}
                  {statistics.unit ?? ""}
                </dd>
              </div>{/if}
            <div>
              <dt>Latest completion in range</dt>
              <dd>{statistics.lastCompletedDate ?? "None"}</dd>
            </div>
          </dl>
          <ToggleGroup.Root
            type="single"
            value={filter}
            onValueChange={(value) => {
              if (value) filter = value as TaskOccurrenceHistoryFilter;
            }}
            aria-label="Task history outcomes"
          >
            <ToggleGroup.Item value="all">All</ToggleGroup.Item
            ><ToggleGroup.Item value="completed">Completed</ToggleGroup.Item
            ><ToggleGroup.Item value="missed">Missed</ToggleGroup.Item>
          </ToggleGroup.Root>
          <ul class="task-detail-extras__history">
            {#each filteredRows as row (row.id)}<li>
                <time>{row.occurrenceDate}</time><span
                  >{row.outcome}{row.value != null
                    ? ` · ${row.value} ${row.unit ?? ""}`
                    : row.durationMinutes != null
                      ? ` · ${row.durationMinutes} minutes`
                      : ""}</span
                >
              </li>{/each}
          </ul>
          {#if !filteredRows.length}<p class="task-detail-extras__muted">
              No occurrences in this period.
            </p>{/if}
        </Accordion.Content>
      </Accordion.Item>
    {/if}
    <Accordion.Item value="comments">
      <Accordion.Trigger
        level={2}
        indicatorPosition="start"
        indicatorVariant="disclosure"
        >Comments {comments.length
          ? `(${comments.length})`
          : ""}</Accordion.Trigger
      >
      <Accordion.Content>
        <Chat.MessageList
          density="compact"
          aria-label={`${task.title} comments`}
          isEmpty={!comments.length}
        >
          {#snippet emptyState()}
            <Empty.Root>
              <Empty.Header>
                <Empty.Title>No comments yet</Empty.Title>
                <Empty.Description
                  >Leave a local comment below.</Empty.Description
                >
              </Empty.Header>
            </Empty.Root>
          {/snippet}
          {#each comments as comment (comment.id)}
            <Chat.Message
              sender="user"
              aria-label="Local comment"
              data-task-comment-id={comment.id}
              data-resolved={comment.resolved || undefined}
            >
              <Chat.MessageBubble>
                {#if editId === comment.id}
                  <Textarea
                    aria-label="Edit comment"
                    bind:value={editDraft}
                    disabled={busy}
                  />
                  <div class="task-detail-extras__actions">
                    <Button
                      size="sm"
                      disabled={busy || !editDraft.trim()}
                      onclick={() =>
                        void mutate(async () => {
                          await repository.updateComment(
                            task.sourcePath!,
                            comment.id,
                            { text: editDraft },
                            comment,
                          );
                          editId = null;
                        })}>Save comment</Button
                    >
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onclick={() => (editId = null)}>Cancel</Button
                    >
                  </div>
                {:else}
                  <span class="task-detail-extras__comment-text"
                    ><Chat.TokenizedText text={comment.text} /></span
                  >
                {/if}
              </Chat.MessageBubble>
              {#snippet metadata()}
                <Chat.MessageMetadata>
                  {#snippet timestamp()}<time datetime={comment.at}
                      >{new Date(comment.at).toLocaleString()}</time
                    >{/snippet}
                  {#snippet footer()}
                    <span class="task-detail-extras__actions">
                      {#if comment.editedAt}<span>Edited</span>{/if}
                      {#if comment.resolved}<span>Resolved</span>{/if}
                      {#if editId !== comment.id}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={busy}
                          aria-label="Edit comment"
                          title="Edit comment"
                          onclick={() => {
                            editId = comment.id;
                            editDraft = comment.text;
                          }}><PencilIcon /></Button
                        >
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={busy}
                          aria-label={comment.resolved
                            ? "Reopen comment"
                            : "Resolve comment"}
                          title={comment.resolved
                            ? "Reopen comment"
                            : "Resolve comment"}
                          onclick={() =>
                            void mutate(() =>
                              repository.updateComment(
                                task.sourcePath!,
                                comment.id,
                                { resolved: !comment.resolved },
                                comment,
                              ),
                            )}
                        >
                          {#if comment.resolved}<RotateCcwIcon
                            />{:else}<CheckIcon />{/if}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={busy}
                          aria-label="Delete comment"
                          title="Delete comment"
                          onclick={() =>
                            void mutate(() =>
                              repository.removeComment(
                                task.sourcePath!,
                                comment,
                              ),
                            )}><Trash2Icon /></Button
                        >
                      {/if}
                    </span>
                  {/snippet}
                </Chat.MessageMetadata>
              {/snippet}
            </Chat.Message>
          {/each}
        </Chat.MessageList>
        <Chat.Composer
          bind:value={draft}
          density="compact"
          placeholder="Leave a comment…"
          disabled={busy}
          onSubmit={(value) => void post(value)}
        >
          {#snippet input()}
            <Chat.ComposerInput
              bind:value={draft}
              label="Local comment"
              placeholder="Leave a comment…"
              disabled={busy}
              hasHistory={false}
              pasteAsToken={false}
            />
          {/snippet}
        </Chat.Composer>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>
</section>

<style>
  .task-detail-extras {
    padding: 0.75rem 1rem;
    font: inherit;
  }
  .task-detail-extras__muted {
    color: var(--muted-foreground);
    font-size: 0.8rem;
  }
  .task-detail-extras__comment-text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .task-detail-extras__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  .task-detail-extras__statistics {
    display: grid;
    gap: 0.25rem;
    font-size: 0.85rem;
  }
  .task-detail-extras__statistics div,
  .task-detail-extras__history li {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .task-detail-extras__statistics dd {
    margin: 0;
  }
  .task-detail-extras__history {
    list-style: none;
    padding: 0;
    font-size: 0.85rem;
  }
</style>
