<script lang="ts">
  import PlusIcon from "@lucide/svelte/icons/plus";
  import { tick, type Snippet } from "svelte";
  import "./TaskQuickCreateRow.css";

  let {
    group,
    value = "",
    active = false,
    busy = false,
    shortcut = true,
    onActivate = () => {},
    onValueChange = () => {},
    onSubmit = () => {},
    onFocusOut = () => {},
    actions,
  }: {
    group: string;
    value?: string;
    active?: boolean;
    busy?: boolean;
    shortcut?: boolean;
    onActivate?: () => void | Promise<void>;
    onValueChange?: (value: string) => void;
    onSubmit?: () => void | Promise<void>;
    onFocusOut?: (event: FocusEvent) => void;
    actions?: Snippet;
  } = $props();

  let input = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (!active) return;
    void tick().then(() => input?.focus());
  });
</script>

{#if active}
  <form
    class="task-quick-create-row task-quick-create-row--editing"
    data-task-quick-create-editor={group}
    onsubmit={(event) => {
      event.preventDefault();
      if (!busy) void onSubmit();
    }}
    onfocusout={onFocusOut}
  >
    <span class="task-quick-create-row__box" aria-hidden="true">
      <PlusIcon />
    </span>
    <div class="task-quick-create-row__editor">
      <input
        bind:this={input}
        data-task-quick-create={group}
        {value}
        placeholder="New task"
        aria-label="New task"
        aria-keyshortcuts={shortcut ? "Meta+N Control+N" : undefined}
        disabled={busy}
        oninput={(event) => onValueChange(event.currentTarget.value)}
        onkeydown={(event) => {
          if (event.key !== "Enter" || event.isComposing) return;
          event.preventDefault();
          if (!busy) void onSubmit();
        }}
      />
      {@render actions?.()}
    </div>
  </form>
{:else}
  <div
    class="task-quick-create-row task-quick-create-row--collapsed"
    data-task-quick-create-collapsed={group}
    data-task-quick-create-trigger={group}
    role="button"
    tabindex="0"
    aria-label="New task"
    aria-keyshortcuts={shortcut ? "Meta+N Control+N" : undefined}
    onclick={() => void onActivate()}
    onkeydown={(event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void onActivate();
    }}
  >
    <span class="task-quick-create-row__box" aria-hidden="true">
      <PlusIcon />
    </span>
    <span
      class="task-quick-create-row__label"
      class:task-quick-create-row__label--draft={Boolean(value)}
    >
      {value || "New task"}
    </span>
    {#if shortcut && !value}
      <kbd class="task-quick-create-row__shortcut" aria-hidden="true">⌘N</kbd>
    {/if}
  </div>
{/if}
