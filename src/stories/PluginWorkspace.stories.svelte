<script lang="ts" module>
  import type { App } from "@lapis-notes/api";
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, userEvent, waitFor, within } from "storybook/test";

  import PluginWorkspaceDemo from "./PluginWorkspaceDemo.svelte";
  import { PluginWorkspaceExample } from "./PluginWorkspace.example-sources";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Shell",
    component: PluginWorkspaceDemo,
    tags: ["visual-pending"],
    parameters: {
      layout: "fullscreen",
      a11y: {
        test: "off",
      },
      docs: {
        canvas: { className: "workspace-shell-docs-canvas" },
        source: {
          code: PluginWorkspaceExample,
          language: "svelte",
          type: "code",
        },
        story: { height: "700px", inline: false },
      },
    },
  });

  function storyApp(canvasElement: HTMLElement): App {
    const root = canvasElement.querySelector<
      HTMLElement & { __lapisApp?: App }
    >('[data-testid="plugin-workspace-demo"]');
    if (!root?.__lapisApp) {
      throw new Error("The plugin workspace story has no active Lapis app");
    }
    return root.__lapisApp;
  }

  async function waitForReady(canvasElement: HTMLElement) {
    const canvas = within(canvasElement);
    await waitFor(
      () => {
        expect(canvas.getByTestId("plugin-workspace-status")).toHaveTextContent(
          "ready",
        );
        expect(
          canvas
            .getByTestId("plugin-workspace-demo")
            .querySelector('[data-app-shell-ready="true"]'),
        ).toBeTruthy();
      },
      { timeout: 10_000 },
    );
    return canvas;
  }
</script>

<Story
  name="Desktop Workspace"
  args={{ displayMode: "desktop" }}
  parameters={{
    docs: {
      description: {
        story:
          "Boot the public Lapis App with TasksPlugin, then restore a main-area tasks leaf from the seeded planner vault.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    canvasElement.style.height = "100%";
    canvasElement.style.maxHeight = "100%";
    canvasElement.style.overflow = "hidden";
    const canvas = await waitForReady(canvasElement);

    const app = storyApp(canvasElement);
    expect(app.plugins.isPluginEnabled("lapis-file-explorer")).toBe(true);
    expect(app.plugins.isPluginEnabled("search")).toBe(true);
    expect(app.plugins.isPluginEnabled("tasks")).toBe(true);
    expect(app.workspace.getLeavesOfType("file-explorer")).toHaveLength(1);
    expect(app.workspace.getLeavesOfType("search")).toHaveLength(1);
    expect(app.workspace.getLeavesOfType("tasks")).toHaveLength(1);
    expect(app.workspace.activeLeaf?.view.getViewType()).toBe("tasks");
    expect(canvas.getByRole("complementary", { name: "Left sidebar" })).toBeVisible();
    expect(
      canvas.getByRole("button", { name: "Open Tasks" }),
    ).toBeVisible();
    expect(
      await canvas.findByText("Tailor platform CV variant"),
    ).toBeVisible();
    expect(canvas.getByTestId("tasks-planner")).toBeVisible();
    expect(
      canvasElement.querySelector(
        '[data-hint-target-id="ribbon:tasks:Open Tasks"]',
      ),
    ).toBeVisible();

    const complete = canvas.getByRole("checkbox", {
      name: "Mark Tailor platform CV variant complete",
    });
    await userEvent.click(complete);
    await waitFor(async () => {
      const file = app.vault.getFileByPath("inbox/today-1.md");
      expect(file).toBeTruthy();
      const raw = await app.vault.cachedRead(file!);
      expect(raw).toContain("status: completed");
    });

    await userEvent.click(canvas.getByRole("button", { name: "Upcoming" }));
    expect(await canvas.findByText("Draft design critique")).toBeVisible();
    expect(canvas.getByText("Prepare model serving examples")).toBeVisible();
  }}
/>

<Story
  name="Mobile Workspace"
  args={{ displayMode: "mobile" }}
  parameters={{
    docs: {
      description: {
        story:
          "Boot the same app-backed Tasks workspace in the public Lapis mobile shell so the planner, Explorer, and Search can be reviewed at a phone-width frame.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    canvasElement.style.height = "100%";
    canvasElement.style.maxHeight = "100%";
    canvasElement.style.overflow = "hidden";
    const canvas = await waitForReady(canvasElement);

    const app = storyApp(canvasElement);
    expect(app.plugins.isPluginEnabled("lapis-file-explorer")).toBe(true);
    expect(app.plugins.isPluginEnabled("search")).toBe(true);
    expect(app.plugins.isPluginEnabled("tasks")).toBe(true);
    expect(canvasElement.querySelector('[data-ui-component="workspace-mobile"]')).toBeVisible();
    expect(app.workspace.getLeavesOfType("tasks")).toHaveLength(1);
    expect(
      await canvas.findByText("Tailor platform CV variant"),
    ).toBeVisible();
    expect(canvas.getByLabelText("Mobile left sidebar")).toBeInTheDocument();
    expect(canvas.getByLabelText("Mobile right sidebar")).toBeInTheDocument();
  }}
/>
