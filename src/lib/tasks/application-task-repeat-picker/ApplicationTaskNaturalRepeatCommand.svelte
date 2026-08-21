<script lang="ts">
  import Repeat2Icon from "@lucide/svelte/icons/repeat-2";
  import * as Command from "@lapismd/design-core/shadcn/command";
  import {
    buildNaturalTaskRepeatSuggestions,
    type TaskNaturalRepeatSuggestion,
  } from "../../model";

  let {
    id = undefined,
    value = $bindable(""),
    ariaLabel = "Describe recurrence",
    placeholder = "Every weekday",
    compact = false,
    onSelect = () => {},
  }: {
    id?: string;
    value?: string;
    ariaLabel?: string;
    placeholder?: string;
    compact?: boolean;
    onSelect?: (suggestion: TaskNaturalRepeatSuggestion) => void | Promise<void>;
  } = $props();

  const suggestions = $derived(buildNaturalTaskRepeatSuggestions(value));
  const commandClass = $derived(
    compact
      ? "task-repeat-picker__natural-rule task-repeat-picker__natural-rule--compact"
      : "task-repeat-picker__natural-rule",
  );
</script>

<Command.Root
  class={commandClass}
  label={ariaLabel}
  shouldFilter={false}
  loop
>
  <Command.Input
    {id}
    bind:value
    aria-label={ariaLabel}
    {placeholder}
  />
  {#if value.trim()}
    <Command.List aria-label="Natural-language recurrence matches">
      {#if suggestions.length}
        <Command.Group value="matches">
          {#each suggestions as suggestion (suggestion.rrule)}
            <Command.Item
              value={suggestion.rrule}
              onSelect={() => void onSelect(suggestion)}
            >
              <Repeat2Icon aria-hidden="true" />
              <span>{suggestion.label}</span>
              <Command.Shortcut>{suggestion.rrule}</Command.Shortcut>
            </Command.Item>
          {/each}
        </Command.Group>
      {:else}
        <Command.Empty forceMount>
          No recurrence match
        </Command.Empty>
      {/if}
    </Command.List>
  {/if}
</Command.Root>
