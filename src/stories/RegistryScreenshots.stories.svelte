<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, userEvent, waitFor, within } from "storybook/test";
  import { workspaceA11y } from "./workspace-a11y";
  import PluginWorkspaceDemo from "./PluginWorkspaceDemo.svelte";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Registry Screenshots",
    component: PluginWorkspaceDemo,
    tags: ["registry-media", "visual-pending", "test"],
    parameters: { layout: "fullscreen", a11y: workspaceA11y },
  });

  async function ready(canvasElement: HTMLElement) {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId("plugin-workspace-demo")).toHaveAttribute("data-status", "ready"), { timeout: 20_000 });
    await canvas.findByRole("button", { name: "Review interview notes", exact: true });
    return canvas;
  }
</script>

<Story name="Daily planner" play={async ({ canvasElement }) => {
  const canvas = await ready(canvasElement);
  expect(canvas.getByRole("button", { name: "Tailor platform CV variant", exact: true })).toBeVisible();
}} />

<Story name="Task details" play={async ({ canvasElement }) => {
  await ready(canvasElement);
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Open task details for Review interview notes" }));
  await waitFor(() => expect(canvasElement.querySelector("[data-task-sidebar-detail]")).toBeVisible());
}} />
