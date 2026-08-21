<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, userEvent, waitFor, within } from "storybook/test";
  import TaskTrackingCompletionPrompt from "./TaskTrackingCompletionPrompt.svelte";
  import TaskTrackingCompletionPromptStory from "./TaskTrackingCompletionPromptStory.svelte";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Tracking/Completion Prompt",
    component: TaskTrackingCompletionPrompt,
    tags: ["visual-pending"],
  });
</script>

<Story
  name="Quantitative completion"
  tags={["test"]}
  play={async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = page.getByRole("dialog", { name: "Complete Drink water" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Complete" }));
    await expect(within(dialog).getByRole("alert")).toHaveTextContent("zero or greater");
    await userEvent.type(within(dialog).getByRole("spinbutton", { name: "Count glasses" }), "8");
    await userEvent.click(within(dialog).getByRole("button", { name: "Complete" }));
    await waitFor(() => expect(within(canvasElement).getByTestId("recorded-value")).toHaveTextContent("8"));
  }}
>
  {#snippet template()}
    <TaskTrackingCompletionPromptStory />
  {/snippet}
</Story>
