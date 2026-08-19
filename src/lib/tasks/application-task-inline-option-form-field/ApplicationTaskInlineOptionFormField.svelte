<script lang="ts">
  import {
    InlineOptionPicker,
    type InlineOptionPickerOption,
  } from "@lapismd/design-core/forms";

  let {
    value = "",
    update,
    options = [],
    ariaLabel = "Task option",
  }: {
    value?: string;
    update: (value: string) => void | Promise<void>;
    options?: InlineOptionPickerOption[];
    ariaLabel?: string;
  } = $props();
</script>

<InlineOptionPicker
  {value}
  {options}
  {ariaLabel}
  onChange={(nextValue) => void update(nextValue)}
/>

