<script lang="ts">
  import type { TaskRepeat } from "../../model";
  import ApplicationTaskRepeatPicker from "../application-task-repeat-picker/ApplicationTaskRepeatPicker.svelte";

  let {
    value = undefined,
    update,
  }: {
    value?: TaskRepeat;
    update: (repeat: TaskRepeat | undefined) => void | Promise<void>;
  } = $props();
</script>

<ApplicationTaskRepeatPicker repeat={value} onSelect={(repeat) => void update(repeat)} />
