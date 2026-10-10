<script lang="ts">
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical";
  import { Button } from "@lapismd/design-core/shadcn/button";
  import * as DropdownMenu from "@lapismd/design-core/shadcn/dropdown-menu";
  // Keep the same compact header/menu styling as Today's actions.
  import "./TaskTodayActionsMenu.css";
  import "./TaskLogbookActionsMenu.css";

  let { value = $bindable("all") }: { value?: string } = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon-sm"
        class="tasks-today-actions__trigger"
        aria-label="Logbook actions"
        title="Logbook actions"
      >
        <EllipsisVerticalIcon aria-hidden="true" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content
    class="tasks-today-actions__content"
    align="end"
    aria-label="Logbook actions"
  >
    <DropdownMenu.RadioGroup bind:value aria-label="Logbook status">
      <DropdownMenu.RadioItem
        class="tasks-today-actions__item tasks-logbook-actions__item"
        value="all"><span>All</span></DropdownMenu.RadioItem
      >
      <DropdownMenu.RadioItem
        class="tasks-today-actions__item tasks-logbook-actions__item"
        value="completed"><span>Completed</span></DropdownMenu.RadioItem
      >
      <DropdownMenu.RadioItem
        class="tasks-today-actions__item tasks-logbook-actions__item"
        value="canceled"><span>Canceled</span></DropdownMenu.RadioItem
      >
    </DropdownMenu.RadioGroup>
  </DropdownMenu.Content>
</DropdownMenu.Root>
