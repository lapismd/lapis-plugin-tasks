<script lang="ts">
  import "./ApplicationTaskCheckbox.css";

  let {
    checked = false,
    label,
    size = "sm",
    disabled = false,
    class: className = "",
    onchange = () => {},
  }: {
    checked?: boolean;
    label: string;
    size?: "sm" | "md";
    disabled?: boolean;
    class?: string;
    onchange?: (event: Event) => void;
  } = $props();
</script>

<span
  class={["task-checkbox", className].filter(Boolean).join(" ")}
  data-task-checkbox
  data-task-checkbox-rail
  data-size={size}
>
  <input
    type="checkbox"
    {checked}
    {disabled}
    aria-label={label}
    onchange={onchange}
    onclick={(event) => event.stopPropagation()}
  />
</span>
