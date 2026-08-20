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

  async function showDailyAgendaChecklistSummary(
    canvasElement: HTMLElement,
    canvas: ReturnType<typeof within>,
  ) {
    const tasksTab = canvas.queryByRole("button", {
      name: "Tasks",
      exact: true,
    });
    if (tasksTab && tasksTab.getAttribute("aria-pressed") !== "true") {
      await userEvent.click(tasksTab);
    }
    let todayButton: HTMLElement | undefined;
    await waitFor(() => {
      todayButton = canvas
        .getAllByRole("button", { name: "Today", exact: true })
        .find(
          (button) =>
            getComputedStyle(button).pointerEvents !== "none" &&
            button.getClientRects().length > 0,
        );
      expect(todayButton).toBeDefined();
    });
    await userEvent.click(todayButton!);
    const daySections = Array.from(
      canvasElement.querySelectorAll<HTMLElement>("[data-day-section]"),
    );
    expect(daySections.map((section) => section.dataset.daySection)).toEqual([
      "anytime",
      "morning",
      "afternoon",
      "evening",
      "done",
    ]);
    expect(
      canvasElement.querySelector(".tasks-planner__agenda-heading"),
    ).not.toBeInTheDocument();
    const disclosure = await canvas.findByRole("button", {
      name: "Show checklist for Review interview notes",
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(
      canvas.queryByRole("group", {
        name: "Checklist for Review interview notes",
      }),
    ).not.toBeInTheDocument();
    expect(
      canvas.getByRole("progressbar", { name: "Checklist progress: 1 of 3" }),
    ).toBeVisible();
  }

  async function exerciseMarkdownNativeList(
    canvasElement: HTMLElement,
    canvas: ReturnType<typeof within>,
  ) {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Applications" }),
    );
    const intro = await canvas.findByText(
      "Track application work here. The Markdown heading and task run remain in their authored position.",
    );
    expect(intro).toBeVisible();
    expect(
      canvas.getByText(
        "Keep interview preparation and follow-up context beneath the live task list.",
      ),
    ).toBeVisible();
    expect(canvasElement.querySelector("[data-structural-task-run]")).toBeVisible();
    const surface = canvasElement.querySelector<HTMLElement>(
      "[data-task-markdown-surface]",
    );
    expect(surface).toHaveAttribute("data-editing", "false");
    const redundantTitle = surface!.querySelector<HTMLElement>(
      'h1[data-task-markdown-redundant-title="true"]',
    );
    expect(redundantTitle).not.toBeNull();
    expect(redundantTitle).not.toBeVisible();
    const readingBlock = surface!.querySelector<HTMLElement>(
      "[data-structural-task-run]",
    )!;
    const readingSourceButton = within(readingBlock).getByRole("button", {
      name: "Edit task run source",
      exact: true,
    });
    expect(
      readingBlock.getBoundingClientRect().right -
        readingSourceButton.getBoundingClientRect().right,
    ).toBeLessThan(16);
    const documentBackground = getComputedStyle(surface!).backgroundColor;
    expect(documentBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(
      getComputedStyle(
        surface!.querySelector<HTMLElement>(".mira-markdown-preview")!,
      ).backgroundColor,
    ).toBe(documentBackground);

    const taskTitle = canvas.getByRole("button", {
      name: "Review interview notes",
      exact: true,
    });
    const initiallySelectedRow = taskTitle.closest<HTMLElement>(
      ".application-planner-task-row",
    );
    expect(initiallySelectedRow).not.toBeNull();
    await fireEvent.click(initiallySelectedRow!);
    expect(initiallySelectedRow).toHaveAttribute("data-planner-selected", "true");
    expect(
      canvasElement.querySelector("[data-task-sidebar-detail]"),
    ).not.toBeInTheDocument();

    await userEvent.click(taskTitle);
    await waitFor(() => {
      expect(
        surface.querySelector('[role="textbox"][aria-label="Task title"]'),
      ).toHaveFocus();
    });
    await userEvent.keyboard("{Escape}");

    const taskRow = canvas
      .getByRole("button", {
        name: "Review interview notes",
        exact: true,
      })
      .closest<HTMLElement>(".application-planner-task-row");
    expect(taskRow).not.toBeNull();
    const checkboxRect = taskRow!
      .querySelector<HTMLElement>("[data-task-checkbox]")!
      .getBoundingClientRect();
    const titleRect = taskRow!
      .querySelector<HTMLElement>(".task-line__title")!
      .getBoundingClientRect();
    expect(
      Math.abs(
        checkboxRect.top + checkboxRect.height / 2 -
          (titleRect.top + titleRect.height / 2),
      ),
    ).toBeLessThan(2);
    await fireEvent.dblClick(taskRow!);
    expect(
      surface.querySelector('input[aria-label="Task title"]'),
    ).toBeVisible();
    await fireEvent.dblClick(taskRow!);

    await userEvent.click(
      canvas.getByRole("button", {
        name: "Open task details for Review interview notes",
        exact: true,
      }),
    );
    await waitFor(() => {
      expect(canvasElement.querySelector("[data-task-sidebar-detail]"))
        .toBeVisible();
    });
    const taskDetail = canvasElement.querySelector<HTMLElement>(
      "[data-task-sidebar-detail]",
    )!;
    expect(taskDetail.querySelector("[data-task-markdown-surface]")).toBeVisible();
    const redundantTaskTitle = taskDetail.querySelector<HTMLElement>(
      'h1[data-task-markdown-redundant-title="true"]',
    );
    expect(redundantTaskTitle).not.toBeNull();
    expect(redundantTaskTitle).not.toBeVisible();
    expect(
      within(taskDetail).getByRole("textbox", { name: "Task title" }),
    ).toHaveTextContent("Review interview notes");
    await userEvent.click(
      within(taskDetail).getByRole("button", {
        name: "Edit Review interview notes",
      }),
    );
    await waitFor(() =>
      expect(taskDetail.querySelector("[data-task-markdown-surface]"))
        .toHaveAttribute("data-editing", "true"),
    );
    await userEvent.click(
      within(taskDetail).getByRole("button", {
        name: "Read Review interview notes",
      }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Close detail column", exact: true }),
    );
    await waitFor(() => {
      expect(canvasElement.querySelector("[data-task-sidebar-detail]"))
        .not.toBeInTheDocument();
    });

    await userEvent.click(
      canvas.getByRole("button", { name: "Edit Applications", exact: true }),
    );
    await waitFor(() => expect(surface).toHaveAttribute("data-editing", "true"));
    const liveBlock = canvasElement.querySelector<HTMLElement>(
      ".task-list-items-widget [data-structural-task-run]",
    );
    expect(liveBlock).toBeVisible();
    const liveSourceButton = within(liveBlock!).getByRole("button", {
      name: "Edit task run source",
      exact: true,
    });
    expect(
      liveBlock!.getBoundingClientRect().right -
        liveSourceButton.getBoundingClientRect().right,
    ).toBeLessThan(16);
    expect(
      getComputedStyle(surface!.querySelector<HTMLElement>(".cm-editor")!)
        .backgroundColor,
    ).toBe(documentBackground);
    expect(
      getComputedStyle(surface!.querySelector<HTMLElement>(".cm-scroller")!)
        .backgroundColor,
    ).toBe(documentBackground);
    const editorScroller = surface!.querySelector<HTMLElement>(".cm-scroller")!;
    const editorScrollerStyle = getComputedStyle(editorScroller);
    expect(Number.parseFloat(editorScrollerStyle.paddingTop)).toBeGreaterThan(0);
    expect(Number.parseFloat(editorScrollerStyle.paddingLeft)).toBeGreaterThan(0);
    expect(
      liveBlock!.querySelector<HTMLElement>(".application-planner-task-row")!
        .getBoundingClientRect().height,
    ).toBeLessThan(80);
    expect(
      getComputedStyle(
        liveBlock!.querySelector<HTMLElement>(
          ".application-planner-task-row",
        )!,
      ).backgroundColor,
    ).not.toBe("rgba(0, 0, 0, 0)");
    const liveCanvas = within(liveBlock!);
    await userEvent.click(
      liveCanvas.getByRole("button", { name: "New task", exact: true }),
    );
    expect(
      liveCanvas.getByRole("group", { name: "New task options", exact: true }),
    ).toBeVisible();
    expect(
      liveCanvas.getByRole("button", { name: "Set due date", exact: true }),
    ).toBeVisible();
    expect(
      liveCanvas.getByRole("button", { name: "Set priority", exact: true }),
    ).toBeVisible();
    expect(
      liveCanvas.getByRole("button", { name: "Set when", exact: true }),
    ).toBeVisible();
    await userEvent.click(
      liveBlock!.querySelector<HTMLElement>(".task-list-items-block__rows")!,
    );
    expect(
      canvasElement.querySelector(
        ".task-list-items-widget [data-structural-task-run]",
      ),
    ).toBeVisible();
    const notesLine = Array.from(
      surface!.querySelectorAll<HTMLElement>(".cm-line"),
    ).find((line) => line.textContent?.trim() === "## Notes");
    expect(notesLine).toBeDefined();
    notesLine!.scrollIntoView({ block: "center" });
    await waitFor(() => expect(notesLine).toHaveClass("cm-header-2"));
    let notesClicked = false;
    notesLine!.addEventListener("click", () => (notesClicked = true), {
      once: true,
    });
    await userEvent.click(
      notesLine!.querySelector<HTMLElement>(".cm-heading:not(.cm-meta)")!,
    );
    expect(notesClicked).toBe(true);
    expect(surface!.querySelector(".cm-content")).toHaveFocus();
    expect(notesLine).toHaveClass("cm-header-2");
    await userEvent.click(
      canvas.getByRole("button", { name: "Edit task run source", exact: true }),
    );
    await waitFor(() => {
      expect(
        canvasElement.querySelector(
          ".task-list-items-widget [data-structural-task-run]",
        ),
      ).not.toBeInTheDocument();
    });
    await userEvent.click(
      canvas.getByRole("button", { name: "Read Applications", exact: true }),
    );
    await waitFor(() => expect(surface).toHaveAttribute("data-editing", "false"));
    await waitFor(() => {
      expect(canvasElement.querySelector("[data-structural-task-run]"))
        .toBeVisible();
    });
  }

  async function exerciseLiveEditMutations(
    canvasElement: HTMLElement,
    canvas: ReturnType<typeof within>,
    app: App,
  ) {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Applications" }),
    );
    const surface = canvasElement.querySelector<HTMLElement>(
      "[data-task-markdown-surface]",
    )!;
    const listFile = app.vault.getFileByPath("lists/applications.md")!;
    const taskFile = app.vault.getFileByPath("inbox/today-2.md")!;
    const originalListSource = await app.vault.cachedRead(listFile);

    await userEvent.click(
      canvas.getByRole("button", { name: "Edit Applications", exact: true }),
    );
    await waitFor(() => expect(surface).toHaveAttribute("data-editing", "true"));

    function liveBlock() {
      return canvasElement.querySelector<HTMLElement>(
        ".task-list-items-widget [data-structural-task-run]",
      )!;
    }

    async function expectListSource(expected = originalListSource) {
      await waitFor(async () => {
        expect(await app.vault.cachedRead(listFile)).toBe(expected);
        expect(surface).toHaveAttribute("data-editing", "true");
        expect(liveBlock()).toBeVisible();
      });
    }

    async function editTitle(from: string, to: string) {
      const block = liveBlock();
      await userEvent.click(
        within(block).getByRole("button", { name: from, exact: true }),
      );
      const editor = within(block).getByRole("textbox", {
        name: "Task title",
        exact: true,
      });
      editor.textContent = to;
      await fireEvent.input(editor);
      await userEvent.keyboard("{Enter}");
      await waitFor(() => {
        expect(
          within(liveBlock()).getByRole("button", { name: to, exact: true }),
        ).toBeVisible();
      });
    }

    await editTitle("Review interview notes", "Review interview notes updated");
    await waitFor(async () => {
      expect(await app.vault.cachedRead(taskFile)).toContain(
        "# Review interview notes updated",
      );
    });
    await expectListSource();

    await editTitle("Review interview notes updated", "Review interview notes");
    await waitFor(async () => {
      expect(await app.vault.cachedRead(taskFile)).toContain(
        "# Review interview notes",
      );
    });
    await expectListSource();

    await userEvent.click(
      within(liveBlock()).getByRole("checkbox", {
        name: "Mark Review interview notes complete",
        exact: true,
      }),
    );
    await waitFor(async () => {
      expect(await app.vault.cachedRead(taskFile)).toContain("status: completed");
    });
    await expectListSource();
    await userEvent.click(
      within(liveBlock()).getByRole("checkbox", {
        name: "Mark Review interview notes incomplete",
        exact: true,
      }),
    );
    await waitFor(async () => {
      expect(await app.vault.cachedRead(taskFile)).toContain("status: open");
    });
    await expectListSource();

    await userEvent.click(
      within(liveBlock()).getByRole("button", {
        name: "Show checklist for Review interview notes",
        exact: true,
      }),
    );
    const checklistItem = within(liveBlock()).getByRole("checkbox", {
      name: "Note the Kubernetes upgrade cadence",
      exact: true,
    });
    await userEvent.click(checklistItem);
    await waitFor(async () => {
      expect(await app.vault.cachedRead(taskFile)).toContain(
        "- [x] Note the Kubernetes upgrade cadence",
      );
    });
    await expectListSource();
    await userEvent.click(checklistItem);
    await waitFor(async () => {
      expect(await app.vault.cachedRead(taskFile)).toContain(
        "- [ ] Note the Kubernetes upgrade cadence",
      );
    });
    await expectListSource();

    const reviewRow = within(liveBlock())
      .getByRole("button", { name: "Review interview notes", exact: true })
      .closest<HTMLElement>(".application-planner-task-row")!;
    const sendRow = within(liveBlock())
      .getByRole("button", { name: "Send follow-up email", exact: true })
      .closest<HTMLElement>(".application-planner-task-row")!;
    await fireEvent.dragStart(
      reviewRow.closest<HTMLElement>(".task-list-items-block__task")!,
    );
    await fireEvent.dragOver(
      sendRow.closest<HTMLElement>(".task-list-items-block__task")!,
    );
    await fireEvent.drop(
      sendRow.closest<HTMLElement>(".task-list-items-block__task")!,
    );
    const reorderedListSource = originalListSource.replace(
      "- [Review interview notes](../inbox/today-2.md)\n- [Send follow-up email](../inbox/evening.md)",
      "- [Send follow-up email](../inbox/evening.md)\n- [Review interview notes](../inbox/today-2.md)",
    );
    await expectListSource(reorderedListSource);

    const movedReviewRow = within(liveBlock())
      .getByRole("button", { name: "Review interview notes", exact: true })
      .closest<HTMLElement>(".application-planner-task-row")!;
    const movedSendRow = within(liveBlock())
      .getByRole("button", { name: "Send follow-up email", exact: true })
      .closest<HTMLElement>(".application-planner-task-row")!;
    await fireEvent.dragStart(
      movedReviewRow.closest<HTMLElement>(".task-list-items-block__task")!,
    );
    await fireEvent.dragOver(
      movedSendRow.closest<HTMLElement>(".task-list-items-block__task")!,
    );
    await fireEvent.drop(
      movedSendRow.closest<HTMLElement>(".task-list-items-block__task")!,
    );
    await expectListSource();

    const keyboardReviewRow = within(liveBlock())
      .getByRole("button", { name: "Review interview notes", exact: true })
      .closest<HTMLElement>(".application-planner-task-row")!;
    await fireEvent.click(
      within(keyboardReviewRow).getByRole("button", {
        name: "Move task down",
        exact: true,
      }),
    );
    await expectListSource(reorderedListSource);
    const keyboardMovedReviewRow = within(liveBlock())
      .getByRole("button", { name: "Review interview notes", exact: true })
      .closest<HTMLElement>(".application-planner-task-row")!;
    await fireEvent.click(
      within(keyboardMovedReviewRow).getByRole("button", {
        name: "Move task up",
        exact: true,
      }),
    );
    await expectListSource();

    await userEvent.click(
      within(liveBlock()).getByRole("button", { name: "New task", exact: true }),
    );
    const createInput = within(liveBlock()).getByRole("textbox", {
      name: "New task",
      exact: true,
    });
    await userEvent.type(createInput, "Live mutation task{Enter}");
    const createdFilePath = "inbox/live-mutation-task.md";
    await waitFor(async () => {
      expect(app.vault.getFileByPath(createdFilePath)).toBeTruthy();
      expect(await app.vault.cachedRead(listFile)).toContain(
        "- [Live mutation task](../inbox/live-mutation-task.md)",
      );
      expect(
        within(liveBlock()).getByRole("button", {
          name: "Live mutation task",
          exact: true,
        }),
      ).toBeVisible();
      expect(surface).toHaveAttribute("data-editing", "true");
    });

    const createdRow = within(liveBlock())
      .getByRole("button", { name: "Live mutation task", exact: true })
      .closest<HTMLElement>(".application-planner-task-row")!;
    await fireEvent.click(
      within(createdRow).getByRole("button", {
        name: "Show delete action for Live mutation task",
        exact: true,
      }),
    );
    await waitFor(() => {
      expect(
        within(createdRow).getByRole("button", {
          name: "Remove task Live mutation task",
          exact: true,
        }),
      ).toBeVisible();
    });
    await userEvent.click(
      within(createdRow).getByRole("button", {
        name: "Remove task Live mutation task",
        exact: true,
      }),
    );
    await waitFor(async () => {
      expect(app.vault.getFileByPath(createdFilePath)).toBeNull();
      expect(await app.vault.cachedRead(listFile)).toBe(originalListSource);
      expect(
        within(liveBlock()).queryByText("Live mutation task", { exact: true }),
      ).not.toBeInTheDocument();
      expect(surface).toHaveAttribute("data-editing", "true");
    });
  }

  async function exerciseLinkedSublists(
    canvasElement: HTMLElement,
    canvas: ReturnType<typeof within>,
    app: App,
  ) {
    await userEvent.click(await canvas.findByRole("button", { name: "Docs" }));
    const docsSurface = canvasElement.querySelector<HTMLElement>(
      "[data-task-markdown-surface]",
    )!;
    const docsFile = app.vault.getFileByPath("lists/docs.md")!;
    const originalDocsSource = await app.vault.cachedRead(docsFile);

    await userEvent.click(
      canvas.getByRole("button", { name: "Edit Docs", exact: true }),
    );
    await waitFor(() => expect(docsSurface).toHaveAttribute("data-editing", "true"));

    function docsBlock() {
      return canvasElement.querySelector<HTMLElement>(
        ".task-list-items-widget [data-structural-task-run]",
      )!;
    }

    const writingRow = within(docsBlock())
      .getByRole("button", { name: "Writing", exact: true })
      .closest<HTMLElement>("[data-task-list-row]")!;
    expect(writingRow.querySelector("[data-task-list-row-icon]")).toBeVisible();
    expect(writingRow.querySelector("[data-task-checkbox]")).not.toBeInTheDocument();
    const writingDragHandle = within(writingRow).getByRole("button", {
      name: "Reorder list Writing",
      exact: true,
    });
    expect(writingDragHandle).toBeInTheDocument();
    await userEvent.click(writingRow);
    expect(writingRow).toHaveAttribute("aria-pressed", "true");
    expect(writingDragHandle).toBeVisible();

    await userEvent.click(
      within(writingRow).getByRole("button", {
        name: "Open list Writing to the right",
        exact: true,
      }),
    );
    await waitFor(() => {
      expect(
        canvas.getByRole("button", { name: "Edit Writing", exact: true }),
      ).toBeVisible();
      expect(
        canvasElement.querySelectorAll("[data-task-markdown-surface]"),
      ).toHaveLength(2);
      expect(docsSurface).toHaveAttribute("data-editing", "true");
    });
    const linkedListColumn = canvasElement.querySelector<HTMLElement>(
      ".task-column-canvas-story__linked-list-column",
    )!;
    const linkedListColumnStyle = getComputedStyle(linkedListColumn);
    expect(Number.parseFloat(linkedListColumnStyle.borderTopWidth)).toBeGreaterThan(
      0,
    );
    expect(Number.parseFloat(linkedListColumnStyle.borderTopLeftRadius)).toBeGreaterThan(
      0,
    );

    const draftRow = within(docsBlock())
      .getByRole("button", { name: "Draft design critique", exact: true })
      .closest<HTMLElement>(".task-list-items-block__task")!;
    const writingDragRow = writingRow.closest<HTMLElement>(
      ".task-list-items-block__list",
    )!;
    await fireEvent.dragStart(writingDragRow);
    await fireEvent.dragOver(draftRow);
    await fireEvent.drop(draftRow);
    const reorderedDocsSource = originalDocsSource.replace(
      "- [Writing](./writing.md)\n- [Draft design critique](../upcoming/critique.md)",
      "- [Draft design critique](../upcoming/critique.md)\n- [Writing](./writing.md)",
    );
    await waitFor(async () => {
      expect(await app.vault.cachedRead(docsFile)).toBe(reorderedDocsSource);
      expect(docsSurface).toHaveAttribute("data-editing", "true");
    });

    const movedWritingRow = within(docsBlock())
      .getByRole("button", { name: "Writing", exact: true })
      .closest<HTMLElement>(".task-list-items-block__list")!;
    const movedDraftRow = within(docsBlock())
      .getByRole("button", { name: "Draft design critique", exact: true })
      .closest<HTMLElement>(".task-list-items-block__task")!;
    await fireEvent.dragStart(movedWritingRow);
    await fireEvent.dragOver(movedDraftRow);
    await fireEvent.drop(movedDraftRow);
    await waitFor(async () => {
      expect(await app.vault.cachedRead(docsFile)).toBe(originalDocsSource);
    });

    const restoredWritingRow = within(docsBlock())
      .getByRole("button", { name: "Writing", exact: true })
      .closest<HTMLElement>("[data-task-list-row]")!;
    await userEvent.click(
      within(restoredWritingRow).getByRole("button", {
        name: "Delete list Writing",
        exact: true,
      }),
    );
    await waitFor(async () => {
      expect(app.vault.getFileByPath("lists/writing.md")).toBeNull();
      expect(await app.vault.cachedRead(docsFile)).not.toContain("./writing.md");
      expect(docsSurface).toHaveAttribute("data-editing", "true");
      expect(
        canvas.queryByRole("button", { name: "Edit Writing", exact: true }),
      ).not.toBeInTheDocument();
    });
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
    const collapsePlanner = canvas.getByRole("button", {
      name: "Collapse planner column",
      exact: true,
    });
    expect(collapsePlanner).toBeVisible();
    await userEvent.click(collapsePlanner);
    const expandPlanner = await canvas.findByRole("button", {
      name: "Expand planner column",
      exact: true,
    });
    expect(expandPlanner).toBeVisible();
    await userEvent.click(expandPlanner);
    await waitFor(() => {
      expect(
        canvasElement.querySelector(
          '[data-column-id="planner"][data-ui-part="column"]',
        ),
      ).toBeVisible();
    });
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
    await exerciseMarkdownNativeList(canvasElement, canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Today", exact: true }));
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

    // Leave this visual story on the feature-rich daily agenda instead of the
    // final mutation assertion, so the app-backed shell documents the current
    // Tasks surface when opened directly in Storybook.
    await showDailyAgendaChecklistSummary(canvasElement, canvas);
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
    await exerciseMarkdownNativeList(canvasElement, canvas);
    await showDailyAgendaChecklistSummary(canvasElement, canvas);
  }}
/>

<Story
  name="Live Edit Mutations"
  args={{ displayMode: "desktop" }}
  parameters={{
    docs: {
      description: {
        story:
          "Exercise every rich Items mutation while CodeMirror remains authoritative and the full task-list document stays in live preview.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    canvasElement.style.height = "100%";
    canvasElement.style.maxHeight = "100%";
    canvasElement.style.overflow = "hidden";
    const canvas = await waitForReady(canvasElement);
    await exerciseLiveEditMutations(
      canvasElement,
      canvas,
      storyApp(canvasElement),
    );
  }}
/>

<Story
  name="Linked Sublists"
  args={{ displayMode: "desktop" }}
  parameters={{
    docs: {
      description: {
        story:
          "Leave a linked task-list selected in its parent Items block with the child document's complete Markdown surface open in the adjacent column.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    canvasElement.style.height = "100%";
    canvasElement.style.maxHeight = "100%";
    canvasElement.style.overflow = "hidden";
    const canvas = await waitForReady(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Docs" }));
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-structural-task-run]",
    )!;
    const writingRow = within(block)
      .getByRole("button", { name: "Writing", exact: true })
      .closest<HTMLElement>("[data-task-list-row]")!;
    await userEvent.click(writingRow);
    expect(writingRow).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(
      within(writingRow).getByRole("button", {
        name: "Open list Writing to the right",
        exact: true,
      }),
    );
    await waitFor(
      () => {
        expect(
          canvas.getByRole("button", { name: "Edit Writing", exact: true }),
        ).toBeVisible();
        expect(
          canvas.getByText(
            "Capture drafting notes and reusable documentation work in this nested list.",
            { exact: true },
          ),
        ).toBeVisible();
      },
      { timeout: 5_000 },
    );
  }}
/>

<Story
  name="Linked Sublist Mutations"
  args={{ displayMode: "desktop" }}
  parameters={{
    docs: {
      description: {
        story:
          "Exercise linked-list selection, adjacent opening, exact-section drag ordering, and editor-safe deletion.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    canvasElement.style.height = "100%";
    canvasElement.style.maxHeight = "100%";
    canvasElement.style.overflow = "hidden";
    const canvas = await waitForReady(canvasElement);
    await exerciseLinkedSublists(
      canvasElement,
      canvas,
      storyApp(canvasElement),
    );
  }}
/>

<Story
  name="Nested List Rows"
  args={{ displayMode: "desktop" }}
  parameters={{
    docs: {
      description: {
        story:
          "Leave a nested List row and its adjacent Markdown column visible for hover and column-chrome review.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    canvasElement.style.height = "100%";
    canvasElement.style.maxHeight = "100%";
    canvasElement.style.overflow = "hidden";
    const canvas = await waitForReady(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Docs" }));
    const writingRow = (await canvas.findByRole("button", {
      name: "Writing",
      exact: true,
    })).closest<HTMLElement>("[data-task-list-row]")!;
    expect(
      within(writingRow).getByRole("button", {
        name: "Reorder list Writing",
        exact: true,
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(writingRow).getByRole("button", {
        name: "Open list Writing to the right",
        exact: true,
      }),
    );
    await waitFor(() => {
      expect(
        canvas.getByRole("button", { name: "Edit Writing", exact: true }),
      ).toBeVisible();
      expect(
        canvasElement.querySelector(
          ".task-column-canvas-story__linked-list-column",
        ),
      ).toBeVisible();
    });
  }}
/>
