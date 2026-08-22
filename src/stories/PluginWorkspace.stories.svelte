<script lang="ts" module>
  import type { App } from "@lapis-notes/api";
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import {
    expect,
    fireEvent,
    userEvent,
    waitFor,
    within,
  } from "storybook/test";

  import PluginWorkspaceDemo from "./PluginWorkspaceDemo.svelte";
  import { TasksPlugin } from "../lib";
  import { PluginWorkspaceExample } from "./PluginWorkspace.example-sources";
  import {
    computedContrastRatio,
    customPropertyContrastRatio,
  } from "./contrast";

  const workspaceA11y = {
    test: "error",
    config: {
      rules: [
        // Full-shell rows intentionally compose nested task controls.
        { id: "nested-interactive", enabled: false },
        // CodeMirror owns its aria-hidden gutter focus behavior upstream.
        { id: "aria-hidden-focus", enabled: false },
      ],
    },
  } as const;

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Shell",
    component: PluginWorkspaceDemo,
    tags: ["visual-pending", "test"],
    globals: {
      colorMode: "light",
      theme: "lapis",
    },
    parameters: {
      layout: "fullscreen",
      a11y: workspaceA11y,
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

  type TaskGroupHeadingTypography = {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    letterSpacing: string;
    lineHeight: string;
    textTransform: string;
  };

  type TaskRowTitleTypography = {
    fontFamily: string;
    fontSize: string;
    fontStyle: string;
    fontWeight: string;
    lineHeight: string;
  };

  function storyApp(canvasElement: HTMLElement): App {
    const root = canvasElement.querySelector<
      HTMLElement & { __lapisApp?: App }
    >('[data-testid="plugin-workspace-demo"]');
    if (!root?.__lapisApp) {
      throw new Error("The plugin workspace story has no active Lapis app");
    }
    return root.__lapisApp;
  }

  async function expectObsidianLightTheme(canvasElement: HTMLElement) {
    const root = canvasElement.ownerDocument.documentElement;
    await waitFor(() => {
      expect(root).toHaveAttribute("data-ui-theme", "lapis");
      expect(root).not.toHaveClass("dark");
      expect(getComputedStyle(root).colorScheme).toContain("light");
    });
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

  function columnCanvasInnerRight(root: HTMLElement): number {
    return (
      root.getBoundingClientRect().right -
      Number.parseFloat(getComputedStyle(root).paddingRight)
    );
  }

  async function dragColumnPair(handle: HTMLElement, deltaX: number) {
    const bounds = handle.getBoundingClientRect();
    const startX = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const ownerWindow = handle.ownerDocument.defaultView!;
    await fireEvent.pointerDown(handle, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: startX,
      clientY: y,
    });
    await fireEvent.pointerMove(ownerWindow, {
      pointerId: 1,
      clientX: startX + deltaX,
      clientY: y,
    });
    await fireEvent.pointerUp(ownerWindow, {
      pointerId: 1,
      clientX: startX + deltaX,
      clientY: y,
    });
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
    const agendaCalendar = canvasElement.querySelector<HTMLElement>(
      ".tasks-planner__agenda-calendar",
    );
    expect(agendaCalendar).toBeVisible();
    expect(getComputedStyle(agendaCalendar!).position).toBe("sticky");
    const weekdayHeading = within(agendaCalendar!).getByRole("heading", {
      name: "Wednesday",
      level: 1,
    });
    expect(weekdayHeading).toBeVisible();
    expect(
      Number.parseFloat(getComputedStyle(weekdayHeading).fontSize),
    ).toBeLessThanOrEqual(32);
    expect(within(agendaCalendar!).getByText("August 2026")).toBeVisible();
    const plannerContent = agendaCalendar!.closest<HTMLElement>(
      ".tasks-planner__content",
    )!;
    const agendaTaskRow = plannerContent.querySelector(
      ".tasks-planner__day-sections .application-planner-task-row",
    );
    expect(agendaTaskRow).not.toBeNull();
    const calendarBox = agendaCalendar!.getBoundingClientRect();
    const agendaTaskRowBox = agendaTaskRow!.getBoundingClientRect();
    const plannerScrollbar = plannerContent
      .closest<HTMLElement>('[data-ui-component="scroll-area"]')!
      .querySelector<HTMLElement>(
        '[data-ui-part="scroll-area-scrollbar"][data-orientation="vertical"]',
      );
    expect(agendaTaskRowBox.left).toBeGreaterThanOrEqual(calendarBox.left - 1);
    expect(agendaTaskRowBox.right).toBeLessThanOrEqual(calendarBox.right + 1);
    if (plannerScrollbar) {
      expect(agendaTaskRowBox.right).toBeLessThan(
        plannerScrollbar.getBoundingClientRect().left,
      );
    }
    for (const name of ["Previous week", "Next week"]) {
      const control = within(agendaCalendar!).getByRole("button", { name });
      const style = getComputedStyle(control);
      expect(style.borderStyle).toBe("solid");
      expect(Number.parseFloat(style.borderTopWidth)).toBeGreaterThan(0);
      expect(style.borderTopColor).toBe("rgba(0, 0, 0, 0)");
      expect(style.outlineStyle).toBe("none");
    }
    const quickCreateLabel = visibleElements(
      canvasElement,
      ".task-quick-create-row__label",
    )[0];
    expect(quickCreateLabel).toBeDefined();
    expect(getComputedStyle(quickCreateLabel!).fontWeight).toBe("400");
    const quickCreateRow = quickCreateLabel!.closest<HTMLElement>(
      ".task-quick-create-row",
    );
    const firstTaskRow =
      quickCreateRow?.nextElementSibling as HTMLElement | null;
    expect(quickCreateRow).not.toBeNull();
    expect(firstTaskRow).not.toBeNull();
    expect(
      Number.parseFloat(getComputedStyle(quickCreateRow!).marginBottom),
    ).toBeGreaterThanOrEqual(4);
    expect(
      firstTaskRow!.getBoundingClientRect().top -
        quickCreateRow!.getBoundingClientRect().bottom,
    ).toBeGreaterThanOrEqual(3);
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

  async function assertPlannerViewTotals(
    canvasElement: HTMLElement,
    canvas: ReturnType<typeof within>,
  ) {
    const projectedDailyReflection = await storyApp(
      canvasElement,
    ).appDatabase.getProjectionRow("tasks/task", "story-task-daily-reflection");
    expect(projectedDailyReflection?.effectiveForDate).toBe("2026-08-19");
    expect(projectedDailyReflection?.effectiveOccurrenceState).toBe("current");
    const plannerColumn = canvasElement.querySelector<HTMLElement>(
      '[data-column-id="planner"][data-ui-part="column"]',
    )!;
    const expectedViews = [
      { name: "Inbox", total: 1 },
      { name: "Review", total: 1 },
      { name: "Upcoming", total: 5 },
      { name: "Anytime", total: 2 },
      { name: "Someday", total: 1 },
      { name: "Logbook", total: 3 },
    ] as const;

    for (const expectedView of expectedViews) {
      const navigationItem = canvas
        .getAllByRole("button", { name: expectedView.name, exact: true })
        .find(
          (button) =>
            getComputedStyle(button).pointerEvents !== "none" &&
            button.getClientRects().length > 0,
        );
      expect(navigationItem).toBeDefined();
      expect(
        navigationItem!.querySelector("small")?.textContent,
        `${expectedView.name} navigation count`,
      ).toBe(String(expectedView.total));
      await userEvent.click(navigationItem!);
      await waitFor(() => {
        const plannerTitle = plannerColumn.querySelector<HTMLElement>(
          ".task-column-canvas-story__planner-title",
        );
        expect(plannerTitle).toHaveTextContent(expectedView.name);
        expect(plannerTitle?.querySelector("svg")).toBeVisible();
        expect(
          plannerColumn.querySelectorAll("[data-planner-sortable-row]"),
        ).toHaveLength(expectedView.total);
      });
      if (expectedView.name === "Review") {
        expect(plannerColumn).toHaveTextContent("Finish yesterday's review");
        expect(plannerColumn).not.toHaveTextContent("Publish the daily status");
      }
    }

    const todayNavigation = canvas
      .getAllByRole("button", { name: "Today", exact: true })
      .find(
        (button) =>
          getComputedStyle(button).pointerEvents !== "none" &&
          button.getClientRects().length > 0,
      );
    expect(todayNavigation).toBeDefined();
    expect(todayNavigation!.querySelector("small")).toHaveTextContent("8");
    await userEvent.click(todayNavigation!);
    await waitFor(() => {
      expect(
        plannerColumn.querySelectorAll("[data-planner-sortable-row]"),
      ).toHaveLength(8);
      expect(plannerColumn.querySelectorAll("[data-day-section]")).toHaveLength(
        5,
      );
      expect(plannerColumn).toHaveTextContent("Daily stand-up reflection");
    });
  }

  async function collapseLapisLeftSidebar(canvas: ReturnType<typeof within>) {
    const close = canvas
      .queryAllByRole("button", { name: "Close left sidebar", exact: true })
      .find(
        (button) =>
          getComputedStyle(button).pointerEvents !== "none" &&
          button.getClientRects().length > 0,
      );
    if (!close) return;
    await userEvent.click(close);
    await waitFor(() => {
      expect(
        canvas
          .queryAllByRole("button", { name: "Close left sidebar", exact: true })
          .some((button) => button.getClientRects().length > 0),
      ).toBe(false);
    });
  }

  async function exerciseTasksWorkspaceSettings(
    canvasElement: HTMLElement,
    canvas: ReturnType<typeof within>,
    app: App,
  ) {
    const visibleOpenSettings = () =>
      canvas
        .queryAllByRole("button", { name: "Open settings", exact: true })
        .find(
          (button) =>
            getComputedStyle(button).pointerEvents !== "none" &&
            button.getClientRects().length > 0,
        );
    async function openTasksSettings() {
      if (!visibleOpenSettings()) {
        await userEvent.click(
          canvas.getByRole("button", {
            name: "Open left sidebar",
            exact: true,
          }),
        );
      }
      let openSettings: HTMLElement | undefined;
      await waitFor(() => {
        openSettings = visibleOpenSettings();
        expect(openSettings).toBeDefined();
      });
      await userEvent.click(openSettings!);
      const dialog = await canvas.findByRole("dialog", {
        name: "Settings",
        exact: true,
      });
      const settingsCanvas = within(dialog);
      await userEvent.click(
        settingsCanvas.getByRole("button", { name: "Tasks", exact: true }),
      );
      return { dialog, settingsCanvas };
    }

    async function closeSettings(settingsCanvas: ReturnType<typeof within>) {
      const close = settingsCanvas.getByRole("button", {
        name: "Close settings",
        exact: true,
      });
      await waitFor(() => {
        expect(getComputedStyle(close).pointerEvents).not.toBe("none");
      });
      await userEvent.click(close);
      await waitFor(() => {
        expect(
          canvasElement.querySelector(
            '[data-ui-component="app-shell-settings-dialog"]',
          ),
        ).not.toBeInTheDocument();
      });
    }

    let { settingsCanvas } = await openTasksSettings();
    expect(
      settingsCanvas.getByRole("heading", { name: "Tasks", level: 1 }),
    ).toBeVisible();
    expect(
      settingsCanvas.getByLabelText<HTMLInputElement>("Afternoon starts at"),
    ).toHaveValue("12:00");
    expect(
      settingsCanvas.getByLabelText<HTMLInputElement>("Evening starts at"),
    ).toHaveValue("17:00");

    const tasksPlugin = app.plugins.plugins.get("tasks");
    expect(tasksPlugin).toBeInstanceOf(TasksPlugin);
    const hideOverdue = settingsCanvas.getByRole("switch", {
      name: "Hide overdue tasks",
      exact: true,
    });
    expect(hideOverdue).not.toBeChecked();
    await userEvent.click(hideOverdue);
    await waitFor(() => {
      expect((tasksPlugin as TasksPlugin).getSettings().dailyAgenda).toEqual({
        hideOverdueTasks: true,
      });
    });
    await userEvent.click(hideOverdue);
    await waitFor(() => {
      expect((tasksPlugin as TasksPlugin).getSettings().dailyAgenda).toEqual({
        hideOverdueTasks: false,
      });
    });

    const navigationColumn = settingsCanvas.getByRole("combobox", {
      name: "Navigation column",
      exact: true,
    });
    expect(navigationColumn).toHaveTextContent("Expanded");
    await userEvent.click(navigationColumn);
    await userEvent.click(
      within(document.body).getByRole("option", {
        name: "Collapsed",
        exact: true,
      }),
    );
    await waitFor(() => {
      expect(
        (tasksPlugin as TasksPlugin).getSettings().planner
          .navigationColumnState,
      ).toBe("collapsed");
      expect(
        canvasElement.querySelector(
          '[data-column-id="tasks"][data-ui-part="collapsed-column"]',
        ),
      ).toBeInTheDocument();
    });
    await closeSettings(settingsCanvas);

    await userEvent.click(
      canvas.getByRole("button", { name: "Expand Tasks column", exact: true }),
    );
    await waitFor(() => {
      expect(
        (tasksPlugin as TasksPlugin).getSettings().planner
          .navigationColumnState,
      ).toBe("expanded");
      expect(
        canvasElement.querySelector(
          '[data-column-id="tasks"][data-ui-part="column"]',
        ),
      ).toBeVisible();
    });

    ({ settingsCanvas } = await openTasksSettings());
    const synchronizedNavigationColumn = settingsCanvas.getByRole("combobox", {
      name: "Navigation column",
      exact: true,
    });
    expect(synchronizedNavigationColumn).toHaveTextContent("Expanded");
    await userEvent.click(synchronizedNavigationColumn);
    await userEvent.click(
      within(document.body).getByRole("option", {
        name: "Hidden",
        exact: true,
      }),
    );
    await waitFor(() => {
      expect(
        (tasksPlugin as TasksPlugin).getSettings().planner
          .navigationColumnState,
      ).toBe("hidden");
      expect(
        canvasElement.querySelector(
          '[data-column-id="tasks"][data-ui-part="column"]',
        ),
      ).not.toBeInTheDocument();
    });
    await closeSettings(settingsCanvas);

    const tasksLeaf = app.workspace.getLeavesOfType("tasks")[0]!;
    await tasksLeaf.setViewState({ type: "empty", state: {} });
    await waitFor(() => {
      expect(canvas.queryByTestId("tasks-planner")).not.toBeInTheDocument();
    });
    await tasksLeaf.setViewState({ type: "tasks", state: {} });
    await waitFor(() => {
      expect(canvas.getByTestId("tasks-planner")).toBeVisible();
      expect(
        canvas.getByRole("button", {
          name: "Toggle Tasks navigation",
          exact: true,
        }),
      ).toHaveAttribute("data-state", "closed");
      expect(
        (tasksPlugin as TasksPlugin).getSettings().planner
          .navigationColumnState,
      ).toBe("hidden");
    });
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Toggle Tasks navigation",
        exact: true,
      }),
    );
    await waitFor(() => {
      expect(
        (tasksPlugin as TasksPlugin).getSettings().planner
          .navigationColumnState,
      ).toBe("expanded");
      expect(
        canvasElement.querySelector(
          '[data-column-id="tasks"][data-ui-part="column"]',
        ),
      ).toBeVisible();
    });
  }

  async function openMarkdownFixture(
    canvasElement: HTMLElement,
    app: App,
    path: string,
    mode: "preview" | "live-preview",
    readySelector = "[data-structural-task-run]",
  ) {
    const file = app.vault.getFileByPath(path);
    expect(file).toBeTruthy();
    let fileButton = canvasElement.querySelector<HTMLButtonElement>(
      `button[data-path=${JSON.stringify(path)}]`,
    );
    if (!fileButton && path.includes("/")) {
      const folderPath = path.slice(0, path.lastIndexOf("/"));
      const folderButton = canvasElement.querySelector<HTMLButtonElement>(
        `button[data-path=${JSON.stringify(folderPath)}]`,
      );
      expect(folderButton).toBeTruthy();
      if (folderButton!.getAttribute("aria-expanded") !== "true") {
        await userEvent.click(folderButton!);
      }
      await waitFor(() => {
        fileButton = canvasElement.querySelector<HTMLButtonElement>(
          `button[data-path=${JSON.stringify(path)}]`,
        );
        expect(fileButton).toBeTruthy();
      });
    }
    expect(fileButton).toBeTruthy();
    await userEvent.click(fileButton!);
    await waitFor(() => {
      expect(app.workspace.getActiveFile()?.path).toBe(path);
    });
    await app.openFile(file!, { state: { file: path, mode } });
    await waitFor(
      () => {
        expect(app.workspace.getActiveFile()?.path).toBe(path);
        expect(
          Array.from(
            canvasElement.querySelectorAll<HTMLElement>(readySelector),
          ).some((run) => run.getClientRects().length > 0),
        ).toBe(true);
      },
      { timeout: 10_000 },
    );
  }

  function visibleTaskRun(canvasElement: HTMLElement, title?: string) {
    const run = Array.from(
      canvasElement.querySelectorAll<HTMLElement>("[data-structural-task-run]"),
    ).find(
      (candidate) =>
        candidate.getClientRects().length > 0 &&
        (!title ||
          within(candidate).queryByRole("button", {
            name: title,
            exact: true,
          })),
    );
    expect(run).toBeDefined();
    return run!;
  }

  async function expectTaskGroupHeadingTones(
    canvasElement: HTMLElement,
    tones: string[],
    typography?: TaskGroupHeadingTypography,
  ) {
    let headings: HTMLElement[] = [];
    await waitFor(() => {
      headings = Array.from(
        canvasElement.querySelectorAll<HTMLElement>(
          '[data-task-group-heading="true"]',
        ),
      ).filter((heading) => heading.getClientRects().length > 0);
      expect(headings.map((heading) => heading.dataset.taskGroupTone)).toEqual(
        tones,
      );
    });
    expect(
      new Set(
        headings.map((heading) => getComputedStyle(heading).backgroundColor),
      ).size,
    ).toBe(tones.length);
    if (typography) {
      headings.forEach((heading) => {
        expect(taskGroupHeadingTypography(heading)).toEqual(typography);
      });
    }
  }

  function taskGroupHeadingTypography(
    element: HTMLElement,
  ): TaskGroupHeadingTypography {
    const style = getComputedStyle(element);
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      textTransform: style.textTransform,
    };
  }

  function taskRowTitleTypography(
    element: HTMLElement,
  ): TaskRowTitleTypography {
    const style = getComputedStyle(element);
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontStyle: style.fontStyle,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
    };
  }

  function visibleTaskRunTitle(run: HTMLElement, title: string) {
    const titleButton = within(run).getByRole("button", {
      name: title,
      exact: true,
    });
    expect(titleButton).toHaveClass("task-line__title");
    return titleButton;
  }

  function expectTaskRunTitleTypography(
    run: HTMLElement,
    title: string,
    typography: TaskRowTitleTypography,
  ) {
    expect(taskRowTitleTypography(visibleTaskRunTitle(run, title))).toEqual(
      typography,
    );
  }

  function visibleElements(canvasElement: HTMLElement, selector: string) {
    return Array.from(
      canvasElement.querySelectorAll<HTMLElement>(selector),
    ).filter((element) => element.getClientRects().length > 0);
  }

  function expectTextContrast(element: HTMLElement) {
    const style = getComputedStyle(element);
    expect(
      computedContrastRatio(element),
      [
        element.className,
        element.textContent?.trim(),
        `color=${style.color}`,
        `background=${style.backgroundColor}`,
      ].join(" "),
    ).toBeGreaterThanOrEqual(4.5);
  }

  function expectNonTextContrast(element: HTMLElement) {
    const style = getComputedStyle(element);
    expect(
      computedContrastRatio(element),
      [
        element.className,
        element.textContent?.trim(),
        `color=${style.color}`,
        `background=${style.backgroundColor}`,
      ].join(" "),
    ).toBeGreaterThanOrEqual(3);
  }

  function expectPlannerMetadataChipContrast(canvasElement: HTMLElement) {
    const scheduleChips = visibleElements(
      canvasElement,
      ".application-planner-task-row__meta .task-when-picker__trigger--chip",
    );
    expect(scheduleChips.length).toBeGreaterThan(0);
    scheduleChips.forEach((chip) => {
      expectTextContrast(chip);
      chip.querySelectorAll<HTMLElement>("svg").forEach(expectNonTextContrast);
    });

    const repeatChips = visibleElements(
      canvasElement,
      ".application-planner-task-row__meta .task-repeat-picker__trigger--chip",
    );
    expect(repeatChips.length).toBeGreaterThan(0);
    repeatChips.forEach((chip) => {
      expectTextContrast(chip);
      chip.querySelectorAll<HTMLElement>("svg").forEach(expectNonTextContrast);
    });
  }

  async function exerciseLightThemeContrast(canvasElement: HTMLElement) {
    const canvas = await waitForReady(canvasElement);
    await waitFor(() => {
      expect(canvasElement.ownerDocument.documentElement).not.toHaveClass(
        "dark",
      );
      expect(
        getComputedStyle(canvasElement.ownerDocument.documentElement)
          .colorScheme,
      ).toContain("light");
    });

    await showDailyAgendaChecklistSummary(canvasElement, canvas);
    expectPlannerMetadataChipContrast(canvasElement);

    const selectedNavigation = visibleElements(
      canvasElement,
      '[data-ui-component="column-canvas"][data-ui-part="column-item"][data-selected="true"]',
    )[0];
    expect(selectedNavigation).toBeDefined();
    expectTextContrast(selectedNavigation!);

    const daySectionHeaders = visibleElements(
      canvasElement,
      "[data-day-section] .tasks-planner__day-section-header > button",
    );
    expect(daySectionHeaders).toHaveLength(5);
    daySectionHeaders.forEach(expectTextContrast);
    await collapseLapisLeftSidebar(canvas);
  }

  async function exerciseDarkThemeContrast(canvasElement: HTMLElement) {
    const canvas = await waitForReady(canvasElement);
    await waitFor(() => {
      expect(canvasElement.ownerDocument.documentElement).toHaveClass("dark");
      expect(
        getComputedStyle(canvasElement.ownerDocument.documentElement)
          .colorScheme,
      ).toBe("dark");
    });

    await showDailyAgendaChecklistSummary(canvasElement, canvas);
    expectPlannerMetadataChipContrast(canvasElement);

    const selectedNavigation = visibleElements(
      canvasElement,
      '[data-ui-component="column-canvas"][data-ui-part="column-item"][data-selected="true"]',
    )[0];
    expect(selectedNavigation).toBeDefined();
    expectTextContrast(selectedNavigation!);

    const daySectionHeaders = visibleElements(
      canvasElement,
      "[data-day-section] .tasks-planner__day-section-header > button",
    );
    expect(daySectionHeaders).toHaveLength(5);
    daySectionHeaders.forEach(expectTextContrast);

    const overdue = visibleElements(
      canvasElement,
      ".task-line__due--overdue, [data-task-overdue-indicator]",
    )[0];
    expect(overdue).toBeDefined();
    if (overdue!.matches("[data-task-overdue-indicator]")) {
      expectNonTextContrast(overdue!);
    } else {
      expectTextContrast(overdue!);
    }

    const quickCreate = visibleElements(
      canvasElement,
      ".task-quick-create-row--collapsed",
    )[0];
    expect(quickCreate).toBeDefined();
    const quickCreateBox = quickCreate!.querySelector<HTMLElement>(
      ".task-quick-create-row__box",
    );
    expect(quickCreateBox).toBeDefined();
    expect(
      customPropertyContrastRatio(quickCreateBox!, "--ui-tasks-accent-text"),
    ).toBeGreaterThanOrEqual(3);

    const app = storyApp(canvasElement);
    await openMarkdownFixture(canvasElement, app, "lists/cv.md", "preview");
    await expectTaskGroupHeadingTones(canvasElement, ["anytime", "morning"]);
    const preview = visibleElements(canvasElement, ".mira-markdown-preview")[0];
    expect(preview).toBeDefined();
    expectTextContrast(preview!);
    visibleElements(
      canvasElement,
      '.mira-markdown-preview [data-task-group-heading="true"]',
    ).forEach(expectTextContrast);

    await openMarkdownFixture(
      canvasElement,
      app,
      "lists/cv.md",
      "live-preview",
    );
    await expectTaskGroupHeadingTones(canvasElement, ["anytime", "morning"]);
    const liveContent = visibleElements(
      canvasElement,
      ".cm-editor .cm-content",
    )[0];
    expect(liveContent).toBeDefined();
    expectTextContrast(liveContent!);
    visibleElements(
      canvasElement,
      '.cm-editor .cm-line[data-task-group-heading="true"]',
    ).forEach(expectTextContrast);
    await collapseLapisLeftSidebar(canvas);
  }

  async function expectContainedMarkdownRun(
    run: HTMLElement,
    sourceControl: "hidden" | "visible",
  ) {
    expect(run).toHaveAttribute("data-task-list-surface", "markdown");
    expect(getComputedStyle(run).position).toBe("relative");
    const sourceHeader = run.querySelector<HTMLElement>(
      ".task-list-items-block__header",
    );
    const rows = run.querySelector<HTMLElement>(
      ".task-list-items-block__rows",
    )!;
    let row: HTMLElement | null = null;
    await waitFor(() => {
      row = rows.querySelector<HTMLElement>(
        ".application-planner-task-row, [data-task-list-row]",
      );
      expect(row).toBeTruthy();
    });
    if (sourceControl === "hidden") {
      expect(sourceHeader).not.toBeInTheDocument();
    } else {
      expect(sourceHeader).toBeInTheDocument();
      expect(getComputedStyle(sourceHeader!).position).toBe("absolute");
      const sourceButton = sourceHeader!.querySelector<HTMLElement>(
        ".task-list-items-block__source",
      )!;
      const sourceButtonBox = sourceButton.getBoundingClientRect();
      const heading = Array.from(
        run.ownerDocument.querySelectorAll<HTMLElement>(
          '[data-task-group-heading="true"]',
        ),
      )
        .filter((candidate) => candidate.getClientRects().length > 0)
        .sort((left, right) => {
          const sourceCenter = sourceButtonBox.top + sourceButtonBox.height / 2;
          const leftBox = left.getBoundingClientRect();
          const rightBox = right.getBoundingClientRect();
          return (
            Math.abs(leftBox.top + leftBox.height / 2 - sourceCenter) -
            Math.abs(rightBox.top + rightBox.height / 2 - sourceCenter)
          );
        })[0]!;
      const headingBox = heading.getBoundingClientRect();
      expect(
        Math.abs(
          sourceButtonBox.top +
            sourceButtonBox.height / 2 -
            (headingBox.top + headingBox.height / 2),
        ),
      ).toBeLessThan(4);
      expect(headingBox.right - sourceButtonBox.right).toBeGreaterThanOrEqual(
        6,
      );
      expect(headingBox.right - sourceButtonBox.right).toBeLessThanOrEqual(10);
      if (heading.matches(".cm-line")) {
        const foldIndicator = heading.querySelector<HTMLElement>(
          ":scope > .cm-fold-indicator",
        )!;
        const foldIndicatorBox = foldIndicator.getBoundingClientRect();
        expect(foldIndicatorBox.right).toBeLessThanOrEqual(headingBox.left);
        expect(headingBox.left - foldIndicatorBox.right).toBeLessThanOrEqual(8);
        expect(
          Math.abs(
            foldIndicatorBox.top +
              foldIndicatorBox.height / 2 -
              (headingBox.top + headingBox.height / 2),
          ),
        ).toBeLessThan(4);
        const label = Array.from(
          heading.querySelectorAll<HTMLElement>(".cm-heading:not(.cm-meta)"),
        ).findLast((candidate) => candidate.textContent?.trim())!;
        const labelBox = label.getBoundingClientRect();
        expect(
          Math.abs(
            labelBox.top +
              labelBox.height / 2 -
              (headingBox.top + headingBox.height / 2),
          ),
        ).toBeLessThan(4);
      }
    }
    expect(
      Math.abs(
        rows.getBoundingClientRect().top - run.getBoundingClientRect().top,
      ),
    ).toBeLessThan(1);
    expect(row!.getBoundingClientRect().right).toBeLessThanOrEqual(
      run.getBoundingClientRect().right + 1,
    );
  }

  async function expectDedicatedMarkdownCheckbox(
    run: HTMLElement,
    title: string,
  ) {
    const runCanvas = within(run);
    const checkbox = runCanvas.getByRole<HTMLInputElement>("checkbox", {
      name: `Mark ${title} complete`,
      exact: true,
    });
    checkbox.checked = true;
    const checkboxStyle = getComputedStyle(checkbox);
    const tickStyle = getComputedStyle(checkbox, "::after");
    expect(checkboxStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(tickStyle.maskImage).toBe("none");
    expect(tickStyle.position).toBe("static");
    expect(Number.parseFloat(tickStyle.width)).toBeLessThan(
      checkbox.getBoundingClientRect().width,
    );
    checkbox.checked = false;
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
    expect(
      canvasElement.querySelector("[data-structural-task-run]"),
    ).toBeVisible();
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
    const readingQuickCreateLabel = readingBlock.querySelector<HTMLElement>(
      ".task-quick-create-row__label",
    );
    expect(readingQuickCreateLabel).not.toBeNull();
    expect(getComputedStyle(readingQuickCreateLabel!).fontWeight).toBe("400");
    const readingTaskTitle = Array.from(
      readingBlock.querySelectorAll<HTMLElement>(".task-line__title"),
    ).find(
      (candidate) => candidate.textContent?.trim() === "Review interview notes",
    );
    expect(readingTaskTitle).toBeDefined();
    expect(
      Number.parseFloat(getComputedStyle(readingTaskTitle!).fontWeight),
    ).toBeGreaterThanOrEqual(600);
    expect(
      within(readingBlock).queryByRole("button", {
        name: "Edit task run source",
        exact: true,
      }),
    ).not.toBeInTheDocument();
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
    expect(initiallySelectedRow).toHaveAttribute(
      "data-planner-selected",
      "true",
    );
    expect(
      canvasElement.querySelector("[data-task-markdown-surface]"),
    ).toHaveAttribute("data-editing", "false");
    expect(
      canvasElement.querySelector("[data-structural-task-run]"),
    ).toBeVisible();
    expect(
      canvasElement.querySelector("[data-task-sidebar-detail]"),
    ).not.toBeInTheDocument();

    const selectedTaskTitle = canvas.getByRole("button", {
      name: "Review interview notes",
      exact: true,
    });
    await userEvent.click(selectedTaskTitle);
    await waitFor(() => {
      const currentSurface = canvasElement.querySelector<HTMLElement>(
        "[data-task-markdown-surface]",
      );
      expect(
        currentSurface?.querySelector(
          '[role="textbox"][aria-label="Task title"]',
        ),
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
    const dragHandleRect = taskRow!
      .querySelector<HTMLElement>("[data-task-drag-handle]")!
      .getBoundingClientRect();
    const titleRect = taskRow!
      .querySelector<HTMLElement>(".task-line__title")!
      .getBoundingClientRect();
    expect(
      Math.abs(
        checkboxRect.top +
          checkboxRect.height / 2 -
          (titleRect.top + titleRect.height / 2),
      ),
    ).toBeLessThan(2);
    expect(
      Math.abs(
        dragHandleRect.top +
          dragHandleRect.height / 2 -
          (checkboxRect.top + checkboxRect.height / 2),
      ),
    ).toBeLessThan(1);
    expect(
      Math.abs(
        dragHandleRect.top +
          dragHandleRect.height / 2 -
          (titleRect.top + titleRect.height / 2),
      ),
    ).toBeLessThan(1);
    await fireEvent.dblClick(taskRow!);
    expect(
      surface.querySelector('input[aria-label="Task title"]'),
    ).toBeVisible();
    await fireEvent.dblClick(taskRow!);

    await fireEvent.click(
      canvas.getByRole("button", {
        name: "Open task details for Review interview notes",
        exact: true,
      }),
    );
    await waitFor(() => {
      expect(
        canvasElement.querySelector("[data-task-sidebar-detail]"),
      ).toBeVisible();
    });
    const taskDetail = canvasElement.querySelector<HTMLElement>(
      "[data-task-sidebar-detail]",
    )!;
    expect(
      taskDetail.querySelector("[data-task-markdown-surface]"),
    ).toBeVisible();
    await waitFor(() => {
      const redundantTaskTitle = taskDetail.querySelector<HTMLElement>(
        'h1[data-task-markdown-redundant-title="true"]',
      );
      expect(redundantTaskTitle).not.toBeNull();
      expect(redundantTaskTitle).not.toBeVisible();
    });
    expect(
      within(taskDetail).getByRole("textbox", { name: "Task title" }),
    ).toHaveTextContent("Review interview notes");
    await userEvent.click(
      within(taskDetail).getByRole("button", {
        name: "Edit Review interview notes",
      }),
    );
    await waitFor(() =>
      expect(
        taskDetail.querySelector("[data-task-markdown-surface]"),
      ).toHaveAttribute("data-editing", "true"),
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
      expect(
        canvasElement.querySelector("[data-task-sidebar-detail]"),
      ).not.toBeInTheDocument();
    });

    await userEvent.click(
      canvas.getByRole("button", { name: "Edit Applications", exact: true }),
    );
    await waitFor(() =>
      expect(surface).toHaveAttribute("data-editing", "true"),
    );
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
    expect(Number.parseFloat(editorScrollerStyle.paddingTop)).toBeGreaterThan(
      0,
    );
    expect(Number.parseFloat(editorScrollerStyle.paddingLeft)).toBeGreaterThan(
      0,
    );
    expect(
      liveBlock!
        .querySelector<HTMLElement>(".application-planner-task-row")!
        .getBoundingClientRect().height,
    ).toBeLessThan(80);
    expect(
      getComputedStyle(
        liveBlock!.querySelector<HTMLElement>(".application-planner-task-row")!,
      ).backgroundColor,
    ).not.toBe("rgba(0, 0, 0, 0)");
    const liveTaskTitle = Array.from(
      liveBlock!.querySelectorAll<HTMLElement>(".task-line__title"),
    ).find(
      (candidate) => candidate.textContent?.trim() === "Review interview notes",
    );
    expect(liveTaskTitle).toBeDefined();
    expect(
      Number.parseFloat(getComputedStyle(liveTaskTitle!).fontWeight),
    ).toBeGreaterThanOrEqual(600);
    const liveCanvas = within(liveBlock!);
    const liveQuickCreateLabel = liveBlock!.querySelector<HTMLElement>(
      ".task-quick-create-row__label",
    );
    expect(liveQuickCreateLabel).not.toBeNull();
    expect(getComputedStyle(liveQuickCreateLabel!).fontWeight).toBe("400");
    await userEvent.click(
      liveCanvas.getByRole("button", { name: "New task", exact: true }),
    );
    expect(
      liveCanvas.getByRole("group", { name: "New task options", exact: true }),
    ).toBeVisible();
    const liveQuickCreateInput = liveCanvas.getByRole("textbox", {
      name: "New task",
      exact: true,
    });
    expect(getComputedStyle(liveQuickCreateInput).fontWeight).toBe("500");
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
    await waitFor(() =>
      expect(surface).toHaveAttribute("data-editing", "false"),
    );
    await waitFor(() => {
      expect(
        canvasElement.querySelector("[data-structural-task-run]"),
      ).toBeVisible();
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
    await waitFor(() =>
      expect(surface).toHaveAttribute("data-editing", "true"),
    );

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
      expect(await app.vault.cachedRead(taskFile)).toContain(
        "status: completed",
      );
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
      within(liveBlock()).getByRole("button", {
        name: "New task",
        exact: true,
      }),
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
    await waitFor(() =>
      expect(docsSurface).toHaveAttribute("data-editing", "true"),
    );

    function docsBlock() {
      return canvasElement.querySelector<HTMLElement>(
        ".task-list-items-widget [data-structural-task-run]",
      )!;
    }

    const writingRow = within(docsBlock())
      .getByRole("button", { name: "Writing", exact: true })
      .closest<HTMLElement>("[data-task-list-row]")!;
    expect(writingRow.querySelector("[data-task-list-row-icon]")).toBeVisible();
    expect(
      writingRow.querySelector("[data-task-checkbox]"),
    ).not.toBeInTheDocument();
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
    expect(
      Number.parseFloat(linkedListColumnStyle.borderTopWidth),
    ).toBeGreaterThan(0);
    expect(
      Number.parseFloat(linkedListColumnStyle.borderTopLeftRadius),
    ).toBeGreaterThan(0);

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
      expect(await app.vault.cachedRead(docsFile)).not.toContain(
        "./writing.md",
      );
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
    await expectObsidianLightTheme(canvasElement);

    const app = storyApp(canvasElement);
    expect(app.plugins.isPluginEnabled("lapis-file-explorer")).toBe(true);
    expect(app.plugins.isPluginEnabled("search")).toBe(true);
    expect(app.plugins.isPluginEnabled("tasks")).toBe(true);
    expect(app.workspace.getLeavesOfType("file-explorer")).toHaveLength(1);
    expect(app.workspace.getLeavesOfType("search")).toHaveLength(1);
    expect(app.workspace.getLeavesOfType("tasks")).toHaveLength(1);
    expect(app.workspace.activeLeaf?.view.getViewType()).toBe("tasks");
    expect(
      canvas.getByRole("complementary", { name: "Left sidebar" }),
    ).toBeVisible();
    expect(canvas.getByRole("button", { name: "Open Tasks" })).toBeVisible();
    await exerciseTasksWorkspaceSettings(canvasElement, canvas, app);
    expect(await canvas.findByText("Tailor platform CV variant")).toBeVisible();
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
    await assertPlannerViewTotals(canvasElement, canvas);
    expect(canvas.getByRole("button", { name: "Applications" })).toBeVisible();
    expect(canvas.getByRole("button", { name: "Docs" })).toBeVisible();
    expect(canvas.getByRole("button", { name: "CV" })).toBeVisible();
    expect(
      canvas.getByRole("button", { name: "Collapse Applications section" }),
    ).toBeVisible();
    expect(
      canvas.getByRole("button", { name: "Collapse Docs section" }),
    ).toBeVisible();
    expect(
      canvas.getByRole("button", { name: "Collapse CV section" }),
    ).toBeVisible();
    const docsSublist = canvasElement.querySelector(
      '[data-list-sublist="Docs"]',
    );
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
    expect(
      canvasElement.querySelector('[data-list-section="Docs"]'),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Expand Docs" }));
    expect(
      await canvas.findByRole("button", { name: "Writing" }),
    ).toBeVisible();
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
    await userEvent.click(
      canvas.getByRole("button", { name: "Today", exact: true }),
    );
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
    fireEvent.dragOver(
      applications.closest("[data-list-path]") ?? applications,
      {
        dataTransfer,
      },
    );
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
    expect(
      await menu.findByRole("menuitem", { name: "Open note" }),
    ).toBeVisible();
    expect(menu.getByRole("menuitem", { name: "Rename" })).toBeVisible();
    expect(
      menu.getByRole("menuitem", { name: "New nested list" }),
    ).toBeVisible();
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
    await collapseLapisLeftSidebar(canvas);
    const desktopCanvasRoot = canvasElement.querySelector<HTMLElement>(
      '[data-ui-component="column-canvas"][data-ui-part="root"]',
    )!;
    await waitFor(() => {
      const desktopPlannerColumn = canvasElement.querySelector<HTMLElement>(
        '[data-column-id="planner"][data-ui-part="column"]',
      );
      expect(desktopCanvasRoot).toHaveAttribute("data-display-mode", "wide");
      expect(
        canvasElement.querySelector(
          '[data-column-id="tasks"] [data-resize-mode="pair"]',
        ),
      ).not.toBeNull();
      expect(desktopPlannerColumn).not.toBeNull();
      expect(desktopPlannerColumn!.getBoundingClientRect().right).toBeCloseTo(
        columnCanvasInnerRight(desktopCanvasRoot),
        1,
      );
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
    expect(
      canvasElement.querySelector('[data-ui-component="workspace-mobile"]'),
    ).toBeVisible();
    expect(app.workspace.getLeavesOfType("tasks")).toHaveLength(1);
    const mobileCanvasRoot = canvasElement.querySelector<HTMLElement>(
      '[data-ui-component="column-canvas"][data-ui-part="root"]',
    )!;
    await waitFor(() =>
      expect(mobileCanvasRoot).toHaveAttribute("data-display-mode", "compact"),
    );
    expect(
      mobileCanvasRoot.querySelector('[data-resize-mode="pair"]'),
    ).toBeNull();
    expect(await canvas.findByText("Tailor platform CV variant")).toBeVisible();
    expect(canvas.getByLabelText("Mobile left sidebar")).toBeInTheDocument();
    expect(canvas.getByLabelText("Mobile right sidebar")).toBeInTheDocument();
    await userEvent.click(
      await canvas.findByRole("button", { name: "Applications", exact: true }),
    );
    expect(
      await canvas.findByText(
        "Track application work here. The Markdown heading and task run remain in their authored position.",
      ),
    ).toBeVisible();
    const mobileTaskRow = canvas
      .getByRole("button", {
        name: "Review interview notes",
        exact: true,
      })
      .closest<HTMLElement>(".application-planner-task-row");
    expect(mobileTaskRow).not.toBeNull();
    await fireEvent.click(mobileTaskRow!);
    expect(mobileTaskRow).toHaveAttribute("data-planner-selected", "true");
    expect(
      canvasElement.querySelector("[data-task-sidebar-detail]"),
    ).not.toBeInTheDocument();
    await showDailyAgendaChecklistSummary(canvasElement, canvas);
    await collapseLapisLeftSidebar(canvas);
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
    await collapseLapisLeftSidebar(canvas);
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
    await collapseLapisLeftSidebar(canvas);
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
    await collapseLapisLeftSidebar(canvas);
  }}
/>

<Story
  name="Nested List Rows"
  args={{ displayMode: "desktop" }}
  parameters={{
    docs: {
      description: {
        story:
          "Leave an expanded nested List row and its adjacent Markdown column visible for accent-guide, hover, and column-chrome review.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    canvasElement.style.height = "100%";
    canvasElement.style.maxHeight = "100%";
    canvasElement.style.overflow = "hidden";
    const canvas = await waitForReady(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Docs" }));
    const writingRow = (
      await canvas.findByRole("button", {
        name: "Writing",
        exact: true,
      })
    ).closest<HTMLElement>("[data-task-list-row]")!;
    expect(
      within(writingRow).getByRole("button", {
        name: "Reorder list Writing",
        exact: true,
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(writingRow).getByRole("button", {
        name: "Expand Writing",
        exact: true,
      }),
    );
    const nestedRuns = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>(
        "[data-task-list-nested-runs]",
      );
      expect(element).toBeInTheDocument();
      return element!;
    });
    expect(
      nestedRuns.closest<HTMLElement>("[data-mira-theme]")?.dataset.miraTheme,
    ).toBe("obsidian");
    const accentProbe = nestedRuns.ownerDocument.createElement("span");
    accentProbe.style.color = "var(--interactive-accent)";
    nestedRuns.append(accentProbe);
    expect(getComputedStyle(nestedRuns).borderInlineStartColor).toBe(
      getComputedStyle(accentProbe).color,
    );
    accentProbe.remove();
    const lapisAccentProbe = nestedRuns.ownerDocument.createElement("span");
    lapisAccentProbe.style.color = "var(--ui-workspace-focus-ring)";
    nestedRuns.append(lapisAccentProbe);
    expect(getComputedStyle(nestedRuns).borderInlineStartColor).toBe(
      getComputedStyle(lapisAccentProbe).color,
    );
    lapisAccentProbe.remove();
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
    await collapseLapisLeftSidebar(canvas);
  }}
/>

<Story
  name="Deep Navigation Flow"
  args={{ displayMode: "desktop" }}
  parameters={{
    docs: {
      description: {
        story:
          "Present a complete List to nested List to Task to nested List to Task to subtask fixture for end-to-end navigation review.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    canvasElement.style.height = "100%";
    canvasElement.style.maxHeight = "100%";
    canvasElement.style.overflow = "hidden";
    const canvas = await waitForReady(canvasElement);
    const app = storyApp(canvasElement);
    const deepFixturePaths = [
      "lists/release-flow.md",
      "lists/release-train.md",
      "upcoming/coordinate-launch.md",
      "lists/launch-operations.md",
      "upcoming/ship-release.md",
      "upcoming/verify-status-page.md",
    ];
    await waitFor(
      () => {
        for (const path of deepFixturePaths) {
          const file = app.vault.getFileByPath(path);
          expect(file).toBeTruthy();
          expect(
            app.metadataCache.getFileCache(file!)?.frontmatter?.type,
          ).toMatch(/^task(?:-list)?$/);
        }
      },
      { timeout: 10_000 },
    );
    await userEvent.click(
      await canvas.findByRole("button", { name: "Release Flow", exact: true }),
    );
    expect(
      await canvas.findByRole("button", {
        name: "Open list Release Train to the right",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      canvasElement.querySelector(
        '[data-column-id="planner"] [data-task-list-column-icon]',
      ),
    ).toBeVisible();
    const expectedLinks = [
      ["lists/release-flow.md", "./release-train.md"],
      ["lists/release-train.md", "../upcoming/coordinate-launch.md"],
      ["upcoming/coordinate-launch.md", "../lists/launch-operations.md"],
      ["lists/launch-operations.md", "../upcoming/ship-release.md"],
      ["upcoming/ship-release.md", "./verify-status-page.md"],
    ] as const;
    for (const [path, target] of expectedLinks) {
      const file = app.vault.getFileByPath(path)!;
      expect(await app.vault.cachedRead(file)).toContain(`](${target})`);
    }
    const finalTaskFile = app.vault.getFileByPath(
      "upcoming/verify-status-page.md",
    )!;
    expect(await app.vault.cachedRead(finalTaskFile)).toContain(
      "- [ ] Confirm every region is healthy",
    );
    await fireEvent.click(
      canvas.getByRole("button", {
        name: "Open list Release Train to the right",
        exact: true,
      }),
    );
    await waitFor(() => {
      const detailColumns = canvasElement.querySelectorAll(
        '[data-column-id^="detail"][data-ui-part="column"]',
      );
      expect(detailColumns).toHaveLength(1);
      expect(detailColumns[0]).toHaveAttribute("data-column-id", "detail");
      expect(detailColumns[0]).toHaveTextContent("Release Train");
      expect(
        detailColumns[0].querySelector("[data-task-list-column-icon]"),
      ).toBeVisible();
    });
    await fireEvent.click(
      await canvas.findByRole(
        "button",
        {
          name: "Open task details for Coordinate the launch",
          exact: true,
        },
        { timeout: 5_000 },
      ),
    );
    await waitFor(() => {
      const detailColumns = canvasElement.querySelectorAll(
        '[data-column-id^="detail"][data-ui-part="column"]',
      );
      expect(detailColumns).toHaveLength(2);
      expect(detailColumns[0]).toHaveTextContent("Release Train");
      expect(detailColumns[1]).toHaveAttribute("data-column-id", "detail-2");
      expect(detailColumns[1]).toHaveTextContent("Coordinate the launch");
    });
    const coordinateDetailColumn = canvasElement.querySelector<HTMLElement>(
      '[data-column-id="detail-2"][data-ui-part="column"]',
    )!;
    const coordinateDetailSurface =
      coordinateDetailColumn.querySelector<HTMLElement>(
        "[data-task-sidebar-detail]",
      )!;
    expect(getComputedStyle(coordinateDetailColumn).borderTopWidth).toBe("0px");
    expect(
      Number.parseFloat(
        getComputedStyle(coordinateDetailSurface).borderTopWidth,
      ),
    ).toBeGreaterThan(0);
    await fireEvent.click(
      await canvas.findByRole(
        "button",
        {
          name: "Open list Launch Operations to the right",
          exact: true,
        },
        { timeout: 5_000 },
      ),
    );
    await waitFor(() => {
      const detailColumns = canvasElement.querySelectorAll(
        '[data-column-id^="detail"][data-ui-part="column"]',
      );
      expect(detailColumns).toHaveLength(3);
      expect(detailColumns[1]).toHaveTextContent("Coordinate the launch");
      expect(detailColumns[2]).toHaveAttribute("data-column-id", "detail-3");
      expect(detailColumns[2]).toHaveTextContent("Launch Operations");
      expect(
        detailColumns[2].querySelector("[data-task-list-column-icon]"),
      ).toBeVisible();
    });
    await fireEvent.click(
      await canvas.findByRole(
        "button",
        {
          name: "Open task details for Ship the release",
          exact: true,
        },
        { timeout: 5_000 },
      ),
    );
    await waitFor(() => {
      const detailColumns = canvasElement.querySelectorAll(
        '[data-column-id^="detail"][data-ui-part="column"]',
      );
      expect(detailColumns).toHaveLength(4);
      expect(detailColumns[2]).toHaveTextContent("Launch Operations");
      expect(detailColumns[3]).toHaveAttribute("data-column-id", "detail-4");
      expect(detailColumns[3]).toHaveTextContent("Ship the release");
    });
    await fireEvent.click(
      await canvas.findByRole(
        "button",
        {
          name: "Open task details for Verify the status page",
          exact: true,
        },
        { timeout: 5_000 },
      ),
    );
    await waitFor(() => {
      const detailColumns = canvasElement.querySelectorAll(
        '[data-column-id^="detail"][data-ui-part="column"]',
      );
      expect(detailColumns).toHaveLength(5);
      expect(detailColumns[3]).toHaveTextContent("Ship the release");
      expect(detailColumns[4]).toHaveAttribute("data-column-id", "detail-5");
      expect(detailColumns[4]).toHaveTextContent("Verify the status page");
    });
    const confirmChecklistLabel = await canvas.findByText(
      "Confirm every region is healthy",
      {},
      { timeout: 5_000 },
    );
    expect(confirmChecklistLabel).toBeVisible();
    expect(canvas.getByText("Publish the final release note")).toBeVisible();
    const finalTaskDetail = confirmChecklistLabel.closest<HTMLElement>(
      "[data-task-sidebar-detail]",
    )!;
    const confirmChecklistItem = confirmChecklistLabel.closest("li")!;
    const confirmCheckbox = within(confirmChecklistItem).getByRole("checkbox", {
      name: "Toggle task",
    });
    expect(finalTaskDetail).toBeVisible();
    expect(confirmCheckbox).toBeEnabled();
    await userEvent.click(confirmCheckbox);
    await waitFor(
      async () => {
        expect(await app.vault.cachedRead(finalTaskFile)).toContain(
          "- [x] Confirm every region is healthy",
        );
      },
      { timeout: 5_000 },
    );
    const refreshedConfirmLabel = await within(finalTaskDetail).findByText(
      "Confirm every region is healthy",
    );
    const refreshedConfirmCheckbox = within(
      refreshedConfirmLabel.closest("li")!,
    ).getByRole("checkbox", { name: "Toggle task" });
    expect(refreshedConfirmCheckbox).toBeChecked();
    await userEvent.click(refreshedConfirmCheckbox);
    await waitFor(
      async () => {
        expect(await app.vault.cachedRead(finalTaskFile)).toContain(
          "- [ ] Confirm every region is healthy",
        );
      },
      { timeout: 5_000 },
    );
    await collapseLapisLeftSidebar(canvas);
    const deepCanvasRoot = canvasElement.querySelector<HTMLElement>(
      '[data-ui-component="column-canvas"][data-ui-part="root"]',
    )!;
    const deepLeadingBeforeScroll = canvasElement.querySelector<HTMLElement>(
      '[data-column-id="detail-4"][data-ui-part="column"]',
    )!;
    const deepTrailingBeforeScroll = canvasElement.querySelector<HTMLElement>(
      '[data-column-id="detail-5"][data-ui-part="column"]',
    )!;
    await waitFor(() => {
      expect(deepLeadingBeforeScroll).toHaveAttribute(
        "data-responsive-stage",
        "pair",
      );
      expect(deepTrailingBeforeScroll).toHaveAttribute(
        "data-responsive-stage",
        "pair",
      );
      expect(
        deepLeadingBeforeScroll.getBoundingClientRect().width,
      ).toBeLessThan(deepCanvasRoot.clientWidth - 200);
      expect(
        deepTrailingBeforeScroll.getBoundingClientRect().width,
      ).toBeGreaterThan(200);
    });
    const deepPairWidths = {
      leading: deepLeadingBeforeScroll.getBoundingClientRect().width,
      trailing: deepTrailingBeforeScroll.getBoundingClientRect().width,
    };
    deepCanvasRoot.scrollTo({
      left: deepCanvasRoot.scrollWidth,
      behavior: "auto",
    });
    await fireEvent.scroll(deepCanvasRoot);
    await waitFor(() => {
      const deepLeadingColumn = canvasElement.querySelector<HTMLElement>(
        '[data-column-id="detail-4"][data-ui-part="column"]',
      );
      const deepTrailingColumn = canvasElement.querySelector<HTMLElement>(
        '[data-column-id="detail-5"][data-ui-part="column"]',
      );
      const stickyTasks = canvasElement.querySelector<HTMLElement>(
        '[data-ui-part="sticky-stack"]',
      );
      expect(deepCanvasRoot).toHaveAttribute("data-display-mode", "wide");
      expect(
        canvasElement.querySelector(
          '[data-column-id="detail-4"] [data-resize-mode="pair"]',
        ),
      ).not.toBeNull();
      expect(deepLeadingColumn).not.toBeNull();
      expect(deepTrailingColumn).not.toBeNull();
      expect(stickyTasks).not.toBeNull();
      expect(stickyTasks!.getBoundingClientRect().right).toBeLessThanOrEqual(
        deepLeadingColumn!.getBoundingClientRect().left + 1,
      );
      expect(deepLeadingColumn!.getBoundingClientRect().width).toBeCloseTo(
        deepPairWidths.leading,
        1,
      );
      expect(deepTrailingColumn!.getBoundingClientRect().width).toBeCloseTo(
        deepPairWidths.trailing,
        1,
      );
      expect(deepTrailingColumn!.getBoundingClientRect().right).toBeCloseTo(
        columnCanvasInnerRight(deepCanvasRoot),
        1,
      );
    });

    const plannerColumn = canvasElement.querySelector<HTMLElement>(
      '[data-column-id="planner"][data-ui-part="column"]',
    )!;
    const firstDetailColumn = canvasElement.querySelector<HTMLElement>(
      '[data-column-id="detail"][data-ui-part="column"]',
    )!;
    const plannerDetailHandle = plannerColumn.querySelector<HTMLElement>(
      '[data-ui-part="resize-handle"][data-resize-mode="pair"]',
    )!;
    expect(plannerDetailHandle).not.toBeNull();
    plannerDetailHandle.scrollIntoView({ inline: "center", block: "nearest" });
    await fireEvent.scroll(deepCanvasRoot);
    const scrollBeforeEarlierPair = deepCanvasRoot.scrollLeft;
    await dragColumnPair(plannerDetailHandle, 0);
    await waitFor(() => {
      expect(plannerColumn).toHaveAttribute("data-responsive-stage", "pair");
      expect(firstDetailColumn).toHaveAttribute(
        "data-responsive-stage",
        "pair",
      );
      expect(
        Math.abs(deepCanvasRoot.scrollLeft - scrollBeforeEarlierPair),
      ).toBeLessThan(1);
    });
    const earlierPairWidths = {
      planner: plannerColumn.getBoundingClientRect().width,
      detail: firstDetailColumn.getBoundingClientRect().width,
    };
    await dragColumnPair(plannerDetailHandle, -32);
    await waitFor(() => {
      expect(plannerColumn.getBoundingClientRect().width).toBeCloseTo(
        earlierPairWidths.planner - 32,
        0,
      );
      expect(firstDetailColumn.getBoundingClientRect().width).toBeCloseTo(
        earlierPairWidths.detail + 32,
        0,
      );
      expect(
        Math.abs(deepCanvasRoot.scrollLeft - scrollBeforeEarlierPair),
      ).toBeLessThan(1);
    });
    expect(
      plannerColumn.getBoundingClientRect().width +
        firstDetailColumn.getBoundingClientRect().width,
    ).toBeCloseTo(earlierPairWidths.planner + earlierPairWidths.detail, 0);
  }}
/>

<Story
  name="Markdown Task Runs"
  args={{ displayMode: "desktop" }}
  parameters={{
    docs: {
      description: {
        story:
          "Exercise rich Task/List runs in ordinary Markdown reading and live-preview surfaces, including reading-mode source-control omission, a live-preview-only overlay source control, contained radii, dedicated checkbox styling, an external live-preview fold affordance, and presentation-only navigation rows.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    canvasElement.style.height = "100%";
    canvasElement.style.maxHeight = "100%";
    canvasElement.style.overflow = "hidden";
    const canvas = await waitForReady(canvasElement);
    const app = storyApp(canvasElement);
    await showDailyAgendaChecklistSummary(canvasElement, canvas);
    const todayHeadingTypography = taskGroupHeadingTypography(
      visibleElements(canvasElement, ".tasks-planner__day-section-label")[0]!,
    );
    const plannerTaskTitleTypography = taskRowTitleTypography(
      canvas.getByRole("button", {
        name: "Review interview notes",
        exact: true,
      }),
    );

    await openMarkdownFixture(canvasElement, app, "lists/cv.md", "preview");
    await expectTaskGroupHeadingTones(
      canvasElement,
      ["anytime", "morning"],
      todayHeadingTypography,
    );
    let run = visibleTaskRun(canvasElement, "Explore conference talks");
    await expectContainedMarkdownRun(run, "hidden");
    expectTaskRunTitleTypography(
      run,
      "Explore conference talks",
      plannerTaskTitleTypography,
    );
    expect(
      run.querySelector("[data-task-drag-handle]"),
    ).not.toBeInTheDocument();
    await expectDedicatedMarkdownCheckbox(run, "Explore conference talks");

    await openMarkdownFixture(
      canvasElement,
      app,
      "lists/cv.md",
      "live-preview",
    );
    await expectTaskGroupHeadingTones(
      canvasElement,
      ["anytime", "morning"],
      todayHeadingTypography,
    );
    run = visibleTaskRun(canvasElement, "Explore conference talks");
    await expectContainedMarkdownRun(run, "visible");
    expectTaskRunTitleTypography(
      run,
      "Explore conference talks",
      plannerTaskTitleTypography,
    );
    expect(
      run.querySelector("[data-task-drag-handle]"),
    ).not.toBeInTheDocument();
    await expectDedicatedMarkdownCheckbox(run, "Explore conference talks");

    await openMarkdownFixture(
      canvasElement,
      app,
      "inbox/today-2.md",
      "preview",
      '[data-task-group-heading="true"]',
    );
    await expectTaskGroupHeadingTones(canvasElement, ["anytime"]);
    const visibleChecklistHeading = Array.from(
      canvasElement.querySelectorAll<HTMLElement>(
        '[data-task-group-heading="true"]',
      ),
    ).find((heading) => heading.getClientRects().length > 0);
    expect(visibleChecklistHeading).toHaveTextContent("Checklist");
    expect(
      Array.from(
        canvasElement.querySelectorAll<HTMLElement>("h2,h3,h4,h5,h6"),
      ).find(
        (heading) =>
          heading.getClientRects().length > 0 &&
          heading.textContent?.trim() === "Atlas AI loop",
      ),
    ).not.toHaveAttribute("data-task-group-heading");

    await openMarkdownFixture(canvasElement, app, "lists.md", "preview");
    await expectTaskGroupHeadingTones(canvasElement, [
      "anytime",
      "morning",
      "afternoon",
      "evening",
    ]);
    await waitFor(() => {
      expect(
        canvasElement.querySelectorAll<HTMLElement>("[data-task-list-row]"),
      ).toHaveLength(4);
    });
    expect(
      Array.from(
        canvasElement.querySelectorAll<HTMLElement>("[data-task-list-row]"),
      ).map((row) => row.getAttribute("aria-label")),
    ).toEqual(["Applications", "Docs", "CV", "Release Flow"]);
    const navigationRuns = Array.from(
      canvasElement.querySelectorAll<HTMLElement>("[data-structural-task-run]"),
    ).filter((candidate) => candidate.getClientRects().length > 0);
    expect(navigationRuns).toHaveLength(4);
    expect(
      navigationRuns.some((candidate) =>
        candidate.querySelector("[data-task-drag-handle]"),
      ),
    ).toBe(false);
    for (const navigationRun of navigationRuns) {
      await expectContainedMarkdownRun(navigationRun, "hidden");
    }
    await collapseLapisLeftSidebar(within(canvasElement));
  }}
/>

<Story
  name="Default Light Contrast"
  tags={["test"]}
  args={{ displayMode: "desktop" }}
  globals={{ theme: "default", colorMode: "light" }}
  parameters={{
    docs: {
      description: {
        story:
          "Guard the Default-light shell and daily agenda chips with explicit WCAG text and non-text contrast assertions.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    canvasElement.style.height = "100%";
    canvasElement.style.maxHeight = "100%";
    canvasElement.style.overflow = "hidden";
    await exerciseLightThemeContrast(canvasElement);
  }}
/>

<Story
  name="Obsidian Dark Contrast"
  tags={["test"]}
  args={{ displayMode: "desktop" }}
  globals={{ theme: "lapis", colorMode: "dark" }}
  parameters={{
    docs: {
      description: {
        story:
          "Guard the Obsidian-dark shell, daily agenda, and Markdown reading/live-preview surfaces with explicit WCAG text and non-text contrast assertions.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    canvasElement.style.height = "100%";
    canvasElement.style.maxHeight = "100%";
    canvasElement.style.overflow = "hidden";
    await exerciseDarkThemeContrast(canvasElement);
  }}
/>

<Story
  name="Default Dark Contrast"
  tags={["test"]}
  args={{ displayMode: "desktop" }}
  globals={{ theme: "default", colorMode: "dark" }}
  parameters={{
    docs: {
      description: {
        story:
          "Guard the Default-dark shell, daily agenda, and Markdown reading/live-preview surfaces with the same explicit WCAG contrast assertions as Obsidian dark.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    canvasElement.style.height = "100%";
    canvasElement.style.maxHeight = "100%";
    canvasElement.style.overflow = "hidden";
    await exerciseDarkThemeContrast(canvasElement);
  }}
/>
