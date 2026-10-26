<script lang="ts" module>
  import type { App } from "@lapis-notes/api";
  import type { NativeTaskOperation } from "@lapis-notes/api/native-tasks";
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, userEvent, waitFor, within } from "storybook/test";
  import PluginWorkspaceDemo from "./PluginWorkspaceDemo.svelte";
  import { openNativeTaskRecovery } from "../lib/native-task-recovery-menu";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Native recovery",
    component: PluginWorkspaceDemo,
    tags: ["visual-pending", "test"],
    parameters: {
      layout: "fullscreen",
      a11y: { test: "error", config: { rules: [
        { id: "nested-interactive", enabled: false },
        { id: "aria-hidden-focus", enabled: false },
      ] } },
    },
  });
</script>

<Story
  name="Inspect interrupted update"
  args={{ displayMode: "desktop" }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(canvas.getByTestId("plugin-workspace-status")).toHaveTextContent("ready"), { timeout: 10_000 });
    const root = canvas.getByTestId("plugin-workspace-demo") as HTMLElement & { __lapisApp: App };
    const reference = { requestId: "d5ab7890-0000-4000-8000-000000000001", path: "inbox/today-1.md", action: "complete", at: "2026-10-26T09:00:00Z" };
    let inspections = 0;
    openNativeTaskRecovery(root.__lapisApp, {
      inspect: async (requestId) => {
        expect(requestId).toBe(reference.requestId);
        inspections++;
        return { disposition: "completed", daily: null, last_failure: null } as NativeTaskOperation;
      },
    }, () => [reference], async () => { throw new Error("Inspection must not alter references"); });
    await userEvent.click(await page.findByRole("option", { name: /inbox\/today-1.md · complete/ }));
    await waitFor(() => expect(inspections).toBe(1));
    await waitFor(() => expect(page.getByText(/Native journal recorded completed/)).toBeVisible());
    expect(page.getByText(/Current files may have changed/)).toBeVisible();
    expect(page.getByRole("option", { name: "Open current task: inbox/today-1.md" })).toBeVisible();
    expect(page.getByRole("option", { name: "Forget this inspected reference (does not change files or retry)" })).toBeVisible();
  }}
/>
