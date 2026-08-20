<script lang="ts" module>
  import type { App } from "@lapis-notes/api";
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";

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
    expect(canvas.getByRole("button", { name: "Applications" })).toBeVisible();
    expect(canvas.getByRole("button", { name: "Docs" })).toBeVisible();
    expect(canvas.getByRole("button", { name: "CV" })).toBeVisible();
    expect(
      canvas.getByRole("button", { name: "Collapse Applications section" }),
    ).toBeVisible();
    expect(canvas.getByRole("button", { name: "Collapse Docs section" })).toBeVisible();
    expect(canvas.getByRole("button", { name: "Collapse CV section" })).toBeVisible();
    const docsSublist = canvasElement.querySelector('[data-list-sublist="Docs"]');
    const docsGuide = docsSublist
      ?.closest(".task-list-tree__branch")
      ?.querySelector("[data-list-guide]");
    const docsChevron = canvasElement.querySelector(
      '[data-list-section="Docs"] .task-list-tree__disclosure svg',
    );
    expect(docsSublist).toBeVisible();
    expect(docsGuide).toBeTruthy();
    expect(docsChevron).toBeTruthy();
    const guideBox = docsGuide!.getBoundingClientRect();
    expect(guideBox.width).toBeGreaterThan(0);
    const chevronBox = docsChevron!.getBoundingClientRect();
    const guideCenter = guideBox.left + guideBox.width / 2;
    const chevronTip = chevronBox.left + chevronBox.width / 2;
    expect(Math.abs(guideCenter - chevronTip)).toBeLessThan(1);
    expect(canvasElement.querySelector('[data-list-section="Docs"]')).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Expand Docs" }));
    expect(await canvas.findByRole("button", { name: "Writing" })).toBeVisible();
    const inboxDrop = canvasElement.querySelector(
      '[data-planner-drop-id="planner-sidebar:inbox"]',
    );
    expect(inboxDrop).toBeVisible();
    expect(inboxDrop?.getAttribute("data-planner-drop-data")).toContain(
      "planner-sidebar-bucket",
    );
    expect(
      canvasElement.querySelector(
        '[data-hint-target-id="ribbon:tasks:Open Tasks"]',
      ),
    ).toBeVisible();

    expect(
      canvas.getByRole("progressbar", { name: "Checklist progress: 1 of 3" }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Show checklist for Review interview notes",
      }),
    );
    const cadenceItem = await canvas.findByRole("checkbox", {
      name: "Note the Kubernetes upgrade cadence",
    });
    await userEvent.click(cadenceItem);
    await waitFor(async () => {
      const file = app.vault.getFileByPath("inbox/today-2.md");
      expect(file).toBeTruthy();
      expect(await app.vault.cachedRead(file!)).toContain(
        "- [x] Note the Kubernetes upgrade cadence",
      );
    });
    await userEvent.click(cadenceItem);
    await waitFor(async () => {
      const file = app.vault.getFileByPath("inbox/today-2.md");
      expect(file).toBeTruthy();
      expect(await app.vault.cachedRead(file!)).toContain(
        "- [ ] Note the Kubernetes upgrade cadence",
      );
    });

    const writing = canvas.getByRole("button", { name: "Writing" });
    const applications = canvas.getByRole("button", { name: "Applications" });
    const dataTransfer = new DataTransfer();
    fireEvent.dragStart(writing.closest("[data-list-path]") ?? writing, {
      dataTransfer,
    });
    fireEvent.dragOver(applications.closest("[data-list-path]") ?? applications, {
      dataTransfer,
    });
    fireEvent.drop(applications.closest("[data-list-path]") ?? applications, {
      dataTransfer,
    });
    await waitFor(async () => {
      const docs = app.vault.getFileByPath("lists/docs.md");
      const apps = app.vault.getFileByPath("lists/applications.md");
      expect(docs).toBeTruthy();
      expect(apps).toBeTruthy();
      expect(await app.vault.cachedRead(docs!)).not.toContain("./writing.md");
      expect(await app.vault.cachedRead(apps!)).toContain("./writing.md");
    });

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

    await userEvent.pointer({
      keys: "[MouseRight]",
      target: canvas.getByRole("button", { name: "Applications" }),
    });
    const menu = within(canvasElement.ownerDocument.body);
    expect(await menu.findByRole("menuitem", { name: "Open note" })).toBeVisible();
    expect(menu.getByRole("menuitem", { name: "Rename" })).toBeVisible();
    expect(menu.getByRole("menuitem", { name: "New nested list" })).toBeVisible();
    expect(menu.getByRole("menuitem", { name: "Unpin" })).toBeVisible();
    expect(menu.getByRole("menuitem", { name: "Archive" })).toBeVisible();
    expect(menu.getByRole("menuitem", { name: "Delete" })).toBeVisible();
    await userEvent.click(menu.getByRole("menuitem", { name: "Open note" }));
    await waitFor(() => {
      expect(app.workspace.getActiveFile()?.path).toBe("lists/applications.md");
    });
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
