<script lang="ts">
  import TaskTrackingCompletionPrompt from "./TaskTrackingCompletionPrompt.svelte";

  const task = {
    id: "hydrate",
    title: "Drink water",
    status: "open" as const,
    tracking: { type: "count" as const, unit: "glasses", target: 8 },
    areas: [],
    tags: [],
    notes: "",
    createdAt: "2026-08-21T08:00:00Z",
    updatedAt: "2026-08-21T08:00:00Z",
  };
  let recordedValue = $state<number | null>(null);
</script>

<TaskTrackingCompletionPrompt
  task={task}
  onConfirm={(value) => {
    recordedValue = value;
  }}
/>
<output data-testid="recorded-value">{recordedValue ?? ""}</output>
