<script lang="ts">
  import * as Dialog from "@lapismd/design-core/shadcn/dialog";
  import { parseDurationMinutes, type Task } from "../../model";

  let {
    task,
    onCancel = () => {},
    onConfirm = () => {},
  }: {
    task: Task;
    onCancel?: () => void;
    onConfirm?: (value: number) => void | Promise<void>;
  } = $props();

  const tracking = $derived(task.tracking);
  const kind = $derived(tracking?.type ?? "boolean");
  const unit = $derived(
    tracking && (tracking.type === "count" || tracking.type === "number")
      ? tracking.unit
      : "",
  );
  const target = $derived(
    tracking?.type === "duration"
      ? tracking.target
      : tracking && (tracking.type === "count" || tracking.type === "number")
        ? tracking.target
        : undefined,
  );
  let value = $state("");
  let error = $state<string | null>(null);
  let saving = $state(false);

  function parsedValue(): number | null {
    const input = String(value).trim();
    if (kind === "duration") {
      const minutes = parseDurationMinutes(input);
      if (!minutes) {
        error = "Enter a duration such as 30m or 1h15m.";
        return null;
      }
      return minutes;
    }
    const numeric = Number(input);
    if (!input || !Number.isFinite(numeric) || numeric < 0) {
      error = "Enter a value of zero or greater.";
      return null;
    }
    if (kind === "count" && !Number.isInteger(numeric)) {
      error = "Enter a whole-number count.";
      return null;
    }
    return numeric;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (saving) return;
    error = null;
    const parsed = parsedValue();
    if (parsed === null) return;
    saving = true;
    try {
      await onConfirm(parsed);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
      saving = false;
    }
  }
</script>

<Dialog.Root
  open
  onOpenChange={(open) => {
    if (!open && !saving) onCancel();
  }}
>
  <Dialog.Content
    class="task-tracking-completion"
    aria-label={`Complete ${task.title}`}
    showCloseButton={false}
  >
    <form onsubmit={submit}>
      <header>
        <h2>Complete {task.title}</h2>
        <p>
          {#if kind === "duration"}
            Record the time spent{target ? ` (target ${target})` : ""}.
          {:else}
            Record the {kind}{unit ? ` in ${unit}` : ""}{target !== undefined ? ` (target ${target})` : ""}.
          {/if}
        </p>
      </header>
      <label>
        <span>{kind === "duration" ? "Duration" : kind === "count" ? "Count" : "Value"}</span>
        <div class="task-tracking-completion__input">
          <input
            type={kind === "duration" ? "text" : "number"}
            inputmode={kind === "duration" ? "text" : "decimal"}
            min={kind === "duration" ? undefined : 0}
            step={kind === "count" ? 1 : "any"}
            placeholder={kind === "duration" ? "30m" : target !== undefined ? String(target) : "0"}
            aria-describedby={error ? "task-tracking-completion-error" : undefined}
            bind:value
            oninput={() => (error = null)}
          />
          {#if unit}<span>{unit}</span>{/if}
        </div>
      </label>
      {#if error}
        <p id="task-tracking-completion-error" class="task-tracking-completion__error" role="alert">
          {error}
        </p>
      {/if}
      <footer>
        <button type="button" class="task-tracking-completion__cancel" disabled={saving} onclick={onCancel}>
          Cancel
        </button>
        <button type="submit" class="task-tracking-completion__confirm" disabled={saving}>
          {saving ? "Saving…" : "Complete"}
        </button>
      </footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(.task-tracking-completion) {
    width: min(24rem, calc(100vw - 2rem));
    padding: 1.1rem;
  }

  form,
  header,
  label {
    display: grid;
    gap: 0.45rem;
  }

  form {
    gap: 1rem;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    color: var(--ui-text-primary, #111827);
    font-size: 1rem;
  }

  header p,
  label > span {
    color: var(--ui-text-secondary, #6b7280);
    font-size: 0.82rem;
  }

  .task-tracking-completion__input {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-height: 2.5rem;
    padding: 0 0.75rem;
    border: 1px solid var(--ui-border, #d1d5db);
    border-radius: 0.55rem;
  }

  input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--ui-text-primary, #111827);
    font: inherit;
  }

  .task-tracking-completion__input > span {
    color: var(--ui-text-secondary, #6b7280);
    font-size: 0.82rem;
  }

  .task-tracking-completion__error {
    color: var(--ui-danger-text, #b91c1c);
    font-size: 0.78rem;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.55rem;
  }

  button {
    min-height: 2.25rem;
    padding: 0 0.8rem;
    border: 1px solid var(--ui-border, #d1d5db);
    border-radius: 0.5rem;
    font: inherit;
    cursor: pointer;
  }

  .task-tracking-completion__cancel {
    background: transparent;
    color: var(--ui-text-primary, #111827);
  }

  .task-tracking-completion__confirm {
    border-color: var(--ui-accent, #4f46e5);
    background: var(--ui-accent, #4f46e5);
    color: var(--ui-accent-contrast, white);
  }
</style>
