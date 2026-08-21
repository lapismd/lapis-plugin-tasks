<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, userEvent, within } from "storybook/test";
  import TaskOccurrenceHistory from "./TaskOccurrenceHistory.svelte";
  import { trackedHistoryStoryRows } from "./history-story-fixtures";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Tracking/Occurrence History",
    component: TaskOccurrenceHistory,
    tags: ["visual-pending"],
  });
</script>

<Story
  name="Tracked history and filters"
  tags={["test"]}
  args={{ rows: trackedHistoryStoryRows }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    await userEvent.click(canvas.getByRole("button", { name: "Completed" }));
    await expect(canvas.getAllByRole("listitem")).toHaveLength(1);
    await expect(canvas.getByText("8 glasses")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Missed" }));
    await expect(canvas.getAllByRole("listitem")).toHaveLength(2);
    await expect(canvas.getByText("unrecorded")).toBeVisible();
  }}
/>
