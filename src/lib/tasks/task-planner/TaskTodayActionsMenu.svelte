<script lang="ts">
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical";
  import ListChecksIcon from "@lucide/svelte/icons/list-checks";
  import ListRestartIcon from "@lucide/svelte/icons/list-restart";
  import TimerOffIcon from "@lucide/svelte/icons/timer-off";
  import { Button } from "@lapismd/design-core/shadcn/button";
  import * as DropdownMenu from "@lapismd/design-core/shadcn/dropdown-menu";
  import "./TaskTodayActionsMenu.css";

  let {
    hideCompletedTasks,
    hideOverdueTasks,
    completedTaskCount,
    markAllIncompletePending = false,
    onHideCompletedTasksChange,
    onHideOverdueTasksChange,
    onMarkAllIncomplete,
  }: {
    hideCompletedTasks: boolean;
    hideOverdueTasks: boolean;
    completedTaskCount: number;
    markAllIncompletePending?: boolean;
    onHideCompletedTasksChange: (hidden: boolean) => void;
    onHideOverdueTasksChange: (hidden: boolean) => void | Promise<void>;
    onMarkAllIncomplete: () => void | Promise<void>;
  } = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon-sm"
        class="tasks-today-actions__trigger"
        aria-label="Today actions"
        title="Today actions"
      >
        <EllipsisVerticalIcon aria-hidden="true" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content
    class="tasks-today-actions__content"
    align="end"
    aria-label="Today actions"
  >
    <DropdownMenu.CheckboxItem
      class="tasks-today-actions__item"
      checked={hideCompletedTasks}
      onCheckedChange={(checked) =>
        onHideCompletedTasksChange(checked === true)}
    >
      <ListChecksIcon aria-hidden="true" />
      <span>Hide completed tasks</span>
    </DropdownMenu.CheckboxItem>
    <DropdownMenu.Item
      class="tasks-today-actions__item"
      disabled={completedTaskCount === 0 || markAllIncompletePending}
      onSelect={() => void onMarkAllIncomplete()}
    >
      <ListRestartIcon aria-hidden="true" />
      <span>Mark all incomplete</span>
    </DropdownMenu.Item>
    <DropdownMenu.CheckboxItem
      class="tasks-today-actions__item"
      checked={hideOverdueTasks}
      onCheckedChange={(checked) =>
        void onHideOverdueTasksChange(checked === true)}
    >
      <TimerOffIcon aria-hidden="true" />
      <span>Hide overdue tasks</span>
    </DropdownMenu.CheckboxItem>
  </DropdownMenu.Content>
</DropdownMenu.Root>
