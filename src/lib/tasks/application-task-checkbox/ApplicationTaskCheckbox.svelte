<script lang="ts">
  import CircleXIcon from "@lucide/svelte/icons/circle-x";
  import "./ApplicationTaskCheckbox.css";

  type TaskCheckboxStatus = "open" | "completed" | "canceled";

  let {
    checked = false,
    label,
    status,
    size = "sm",
    disabled = false,
    class: className = "",
    onchange = () => {},
  }: {
    checked?: boolean;
    label: string;
    status?: TaskCheckboxStatus;
    size?: "sm" | "md";
    disabled?: boolean;
    class?: string;
    onchange?: (event: Event) => void;
  } = $props();

  const checkboxState = $derived(
    status === "canceled" ? "canceled" : checked ? "completed" : "open",
  );
  const renderedChecked = $derived(checked || checkboxState === "canceled");
</script>

<span
  class={["task-checkbox", className].filter(Boolean).join(" ")}
  data-task-checkbox
  data-task-checkbox-rail
  data-task-checkbox-state={checkboxState}
  data-size={size}
>
  <input
    type="checkbox"
    checked={renderedChecked}
    {disabled}
    aria-label={label}
    data-task-checkbox-state={checkboxState}
    onchange={onchange}
    onclick={(event) => event.stopPropagation()}
  />
  {#if checkboxState === "canceled"}
    <span class="task-checkbox__cancel-icon" aria-hidden="true">
      <CircleXIcon />
    </span>
  {/if}
</span>
