<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import {
    expect,
    fireEvent,
    userEvent,
    waitFor,
    within,
  } from "storybook/test";
  import { ApplicationTaskPlannerColumnCanvasExample } from "../../catalog.example-sources";
  import ApplicationTaskPlannerColumnCanvasStory from "./ApplicationTaskPlannerColumnCanvasStory.svelte";
  import { playTitleClickStartsInlineEdit } from "../planner-title-edit-selection.story-play";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Panels",
    component: ApplicationTaskPlannerColumnCanvasStory,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskPlannerColumnCanvasExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component:
            "Planner navigation, planner body, and task detail composed with Design Core Column Canvas instead of App Shell.",
        },
      },
    },
  });
</script>

<Story
  name="Column Canvas"
  tags={["visual-pending", "test"]}
  parameters={{
    a11y: {
      test: "off",
    },
    docs: {
      description: {
        story:
          "Tasks column, planner body, and closeable task detail as successive Column Canvas lanes. Selecting a task opens detail; opening a linked application adds a further closeable column.",
      },
    },
  }}
  play={async (context) => {
    const canvas = within(context.canvasElement);
    expect(canvas.getByText("All lists")).toBeVisible();
    const canvasRoot = context.canvasElement.querySelector<HTMLElement>(
      '[data-ui-component="column-canvas"][data-ui-part="root"]',
    )!;
    await waitFor(() =>
      expect(canvasRoot).toHaveAttribute("data-display-mode", "wide"),
    );
    await waitFor(
      () =>
        expect(
          context.canvasElement.querySelector(
            '[data-column-id="tasks"] [data-resize-mode="pair"]',
          ),
        ).not.toBeNull(),
      { timeout: 5_000 },
    );
    const tasksResizeHandle = canvas.getByRole("separator", {
      name: "Resize Tasks and planner columns",
    });
    let tasksColumn = context.canvasElement.querySelector<HTMLElement>(
      '[data-column-id="tasks"][data-ui-part="column"]',
    )!;
    let plannerColumn = context.canvasElement.querySelector<HTMLElement>(
      '[data-column-id="planner"][data-ui-part="column"]',
    )!;
    const plannerStartBorderWidth = Number.parseFloat(
      getComputedStyle(plannerColumn).borderLeftWidth,
    );
    const rootStyle = getComputedStyle(canvasRoot);
    const canvasInnerRight =
      canvasRoot.getBoundingClientRect().right -
      Number.parseFloat(rootStyle.paddingRight);
    async function dragPair(handle: HTMLElement, deltaX: number) {
      const bounds = handle.getBoundingClientRect();
      const startX = bounds.left + bounds.width / 2;
      const y = bounds.top + bounds.height / 2;
      await fireEvent.pointerDown(handle, {
        pointerId: 1,
        isPrimary: true,
        button: 0,
        buttons: 1,
        clientX: startX,
        clientY: y,
      });
      await fireEvent.pointerMove(window, {
        pointerId: 1,
        clientX: startX + deltaX,
        clientY: y,
      });
      await fireEvent.pointerUp(window, {
        pointerId: 1,
        clientX: startX + deltaX,
        clientY: y,
      });
    }
    await waitFor(() =>
      expect(plannerColumn.getBoundingClientRect().right).toBeCloseTo(
        canvasInnerRight,
        1,
      ),
    );
    expect(tasksColumn.getBoundingClientRect().right).toBeCloseTo(
      plannerColumn.getBoundingClientRect().left,
      1,
    );
    expect(tasksResizeHandle).toHaveAttribute("data-resize-mode", "pair");
    expect(
      tasksResizeHandle.getBoundingClientRect().right -
        plannerColumn.getBoundingClientRect().left,
    ).toBeCloseTo(tasksResizeHandle.getBoundingClientRect().width / 2, 1);
    expect(
      tasksResizeHandle.getBoundingClientRect().top -
        tasksColumn.getBoundingClientRect().top,
    ).toBeCloseTo(plannerStartBorderWidth, 1);
    expect(
      tasksColumn.getBoundingClientRect().bottom -
        tasksResizeHandle.getBoundingClientRect().bottom,
    ).toBeCloseTo(plannerStartBorderWidth, 1);
    expect(getComputedStyle(tasksResizeHandle).backgroundColor).toBe(
      "rgba(0, 0, 0, 0)",
    );
    const resizeStart = tasksResizeHandle.getBoundingClientRect();
    expect(
      context.canvasElement.ownerDocument.elementFromPoint(
        plannerColumn.getBoundingClientRect().left +
          plannerStartBorderWidth +
          resizeStart.width / 4,
        resizeStart.top + resizeStart.height / 2,
      ),
    ).toBe(tasksResizeHandle);
    await userEvent.pointer([
      {
        keys: "[MouseLeft>]",
        target: tasksResizeHandle,
        coords: {
          clientX: resizeStart.left + resizeStart.width / 2,
          clientY: resizeStart.top + resizeStart.height / 2,
        },
      },
    ]);
    await waitFor(() =>
      expect(tasksResizeHandle).toHaveAttribute("data-resizing", "true"),
    );
    await waitFor(() =>
      expect(
        getComputedStyle(plannerColumn, "::before").borderLeftColor,
      ).not.toBe("rgba(0, 0, 0, 0)"),
    );
    expect(getComputedStyle(tasksResizeHandle).backgroundColor).toBe(
      "rgba(0, 0, 0, 0)",
    );
    const initialTasksWidth = tasksColumn.getBoundingClientRect().width;
    const initialPlannerWidth = plannerColumn.getBoundingClientRect().width;
    await fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: resizeStart.left + resizeStart.width / 2 - 40,
      clientY: resizeStart.top + resizeStart.height / 2,
    });
    await waitFor(() => {
      expect(tasksColumn.getBoundingClientRect().width).toBeLessThan(
        initialTasksWidth,
      );
      expect(plannerColumn.getBoundingClientRect().width).toBeGreaterThan(
        initialPlannerWidth,
      );
    });
    expect(
      tasksColumn.getBoundingClientRect().width +
        plannerColumn.getBoundingClientRect().width,
    ).toBeCloseTo(initialTasksWidth + initialPlannerWidth, 1);
    await fireEvent.pointerUp(window);
    await waitFor(() =>
      expect(tasksResizeHandle).not.toHaveAttribute("data-resizing"),
    );
    const resizedTasksWidth = tasksColumn.getBoundingClientRect().width;
    const resizedPlannerWidth = plannerColumn.getBoundingClientRect().width;
    await userEvent.click(
      canvas.getByRole("button", { name: "Collapse Tasks column" }),
    );
    await waitFor(() =>
      expect(plannerColumn.getBoundingClientRect().width).toBeGreaterThan(
        resizedPlannerWidth,
      ),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Expand Tasks column" }),
    );
    await waitFor(() => {
      tasksColumn = context.canvasElement.querySelector<HTMLElement>(
        '[data-column-id="tasks"][data-ui-part="column"]',
      )!;
      expect(tasksColumn.getBoundingClientRect().width).toBeCloseTo(
        resizedTasksWidth,
        1,
      );
      expect(plannerColumn.getBoundingClientRect().width).toBeCloseTo(
        resizedPlannerWidth,
        1,
      );
    });
    expect(
      canvas.getByRole("button", { name: "Collapse All lists section" }),
    ).toBeVisible();
    expect(
      canvas.getByRole("button", { name: "All lists section" }),
    ).toBeVisible();
    expect(canvas.getByRole("button", { name: "Applications" })).toBeVisible();
    expect(
      context.canvasElement.querySelector(
        '[data-planner-drop-id="planner-sidebar:inbox"]',
      ),
    ).toBeVisible();
    const agendaCalendar = context.canvasElement.querySelector<HTMLElement>(
      ".tasks-planner__agenda-calendar",
    )!;
    expect(getComputedStyle(agendaCalendar).position).toBe("sticky");
    expect(
      within(agendaCalendar).getByRole("heading", {
        name: "Wednesday",
        level: 1,
      }),
    ).toBeVisible();
    expect(within(agendaCalendar).getByText("August 2026")).toBeVisible();
    for (const name of ["Previous week", "Next week"]) {
      const control = within(agendaCalendar).getByRole("button", { name });
      const style = getComputedStyle(control);
      expect(style.borderStyle).toBe("solid");
      expect(Number.parseFloat(style.borderTopWidth)).toBeGreaterThan(0);
      expect(style.borderTopColor).toBe("rgba(0, 0, 0, 0)");
      expect(style.outlineStyle).toBe("none");
    }

    const expectedViewTotals = [
      { name: "Inbox", total: 1 },
      { name: "Review", total: 1 },
      { name: "Upcoming", total: 5 },
      { name: "Anytime", total: 2 },
      { name: "Someday", total: 1 },
      { name: "Logbook", total: 3 },
    ] as const;
    for (const expectedView of expectedViewTotals) {
      const navigationItem = canvas.getByRole("button", {
        name: expectedView.name,
      });
      expect(navigationItem.querySelector("small")).toHaveTextContent(
        String(expectedView.total),
      );
      await userEvent.click(navigationItem);
      expect(
        await canvas.findByRole("heading", {
          name: expectedView.name,
          level: 1,
        }),
      ).toBeVisible();
      await waitFor(() =>
        expect(
          plannerColumn.querySelectorAll("[data-planner-sortable-row]"),
        ).toHaveLength(expectedView.total),
      );
    }
    await userEvent.click(canvas.getByRole("button", { name: "Review" }));
    const reviewRow = await waitFor(() => {
      const row = plannerColumn.querySelector<HTMLElement>(
        '[data-planner-sortable-group="review"]',
      );
      expect(row).toHaveTextContent("Finish yesterday's review");
      return row!;
    });
    expect(reviewRow).toBeVisible();
    expect(
      canvas.queryByRole("heading", { name: "Logbook", level: 1 }),
    ).not.toBeInTheDocument();
    const todayNavigation = canvas.getByRole("button", { name: "Today" });
    expect(todayNavigation.querySelector("small")).toHaveTextContent("8");
    await userEvent.click(todayNavigation);
    await waitFor(() =>
      expect(
        plannerColumn.querySelectorAll("[data-planner-sortable-row]"),
      ).toHaveLength(8),
    );

    const alignedTitle = await canvas.findByRole("button", {
      name: "Finish yesterday's review",
      exact: true,
    });
    const alignedRow = alignedTitle.closest<HTMLElement>(
      ".application-planner-task-row",
    )!;
    const alignedDetails = within(alignedRow).getByRole("button", {
      name: "Open task details for Finish yesterday's review",
    });
    const titleRect = alignedTitle.getBoundingClientRect();
    const detailsRect = alignedDetails.getBoundingClientRect();
    expect(
      Math.abs(
        titleRect.top +
          titleRect.height / 2 -
          (detailsRect.top + detailsRect.height / 2),
      ),
    ).toBeLessThan(1);
    const overdueIndicator = within(alignedRow).getByRole("img", {
      name: "Overdue task",
      exact: true,
    });
    expect(overdueIndicator).toBeVisible();
    expect(overdueIndicator.nextElementSibling).toBe(alignedDetails);
    expect(getComputedStyle(overdueIndicator).backgroundColor).not.toBe(
      "rgba(0, 0, 0, 0)",
    );
    const overdueRect = overdueIndicator.getBoundingClientRect();
    expect(overdueRect.right).toBeLessThan(detailsRect.left);
    expect(
      Math.abs(
        overdueRect.top +
          overdueRect.height / 2 -
          (detailsRect.top + detailsRect.height / 2),
      ),
    ).toBeLessThan(1);
    await playTitleClickStartsInlineEdit(context);
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(canvas.queryByRole("textbox", { name: "Task title" })).toBeNull(),
    );
    const daySections = Array.from(
      context.canvasElement.querySelectorAll<HTMLElement>("[data-day-section]"),
    );
    expect(daySections.map((section) => section.dataset.daySection)).toEqual([
      "anytime",
      "morning",
      "afternoon",
      "evening",
      "done",
    ]);
    for (const section of daySections) {
      const header = section.querySelector<HTMLButtonElement>(
        ":scope > header button",
      )!;
      const label = header.querySelector<HTMLElement>(
        ".tasks-planner__day-section-label",
      )!;
      const trailing = header.querySelector<HTMLElement>(
        ".tasks-planner__day-section-trailing",
      )!;
      const count = trailing.querySelector<HTMLElement>(
        ".tasks-planner__day-section-count",
      )!;
      expect(trailing.firstElementChild).toBe(count);
      expect(trailing.lastElementChild?.tagName).toBe("svg");
      expect(count.getBoundingClientRect().left).toBeGreaterThan(
        label.getBoundingClientRect().right,
      );
      expect(
        header.getBoundingClientRect().right -
          count.getBoundingClientRect().right,
      ).toBeLessThan(60);
    }
    expect(daySections[0]).toHaveAttribute("data-day-section-expanded", "true");
    expect(daySections[4]).toHaveAttribute(
      "data-day-section-expanded",
      "false",
    );
    expect(
      context.canvasElement.querySelector(
        '[data-planner-sortable-list="today:done"]',
      ),
    ).toBeInTheDocument();

    const documentCanvas = within(context.canvasElement.ownerDocument.body);
    const todayActions = canvas.getByRole("button", { name: "Today actions" });
    async function waitForTodayActionsReady() {
      await waitFor(() => {
        expect(todayActions).toHaveAttribute("data-state", "closed");
        expect(getComputedStyle(todayActions).pointerEvents).not.toBe("none");
      });
    }
    await userEvent.click(todayActions);
    expect(
      await documentCanvas.findByRole("menuitemcheckbox", {
        name: "Hide completed tasks",
      }),
    ).not.toBeChecked();
    expect(
      documentCanvas.getByRole("menuitem", { name: "Mark all incomplete" }),
    ).toBeEnabled();
    await userEvent.click(
      documentCanvas.getByRole("menuitemcheckbox", {
        name: "Hide overdue tasks",
      }),
    );
    await userEvent.keyboard("{Escape}");
    await waitForTodayActionsReady();
    await waitFor(() =>
      expect(
        canvas.queryByRole("button", {
          name: "Finish yesterday's review",
          exact: true,
        }),
      ).not.toBeInTheDocument(),
    );
    expect(
      canvas.getByRole("button", {
        name: "Review interview notes",
        exact: true,
      }),
    ).toBeVisible();
    await userEvent.click(todayActions);
    expect(
      documentCanvas.queryByRole("menuitemcheckbox", {
        name: "Hide overdue tasks",
      }),
    ).not.toBeInTheDocument();
    const showOverdue = await documentCanvas.findByRole("menuitemcheckbox", {
      name: "Show overdue tasks",
    });
    expect(showOverdue).toBeChecked();
    await userEvent.click(showOverdue);
    await userEvent.keyboard("{Escape}");
    await waitForTodayActionsReady();
    expect(
      await canvas.findByRole("button", {
        name: "Finish yesterday's review",
        exact: true,
      }),
    ).toBeVisible();

    await userEvent.click(
      daySections[4]!.querySelector<HTMLButtonElement>(
        ":scope > header button",
      )!,
    );
    expect(canvas.getByText("Publish the daily status")).toBeVisible();
    await userEvent.click(todayActions);
    await userEvent.click(
      await documentCanvas.findByRole("menuitemcheckbox", {
        name: "Hide completed tasks",
      }),
    );
    await userEvent.keyboard("{Escape}");
    await waitForTodayActionsReady();
    await waitFor(() =>
      expect(
        canvas.queryByText("Publish the daily status"),
      ).not.toBeInTheDocument(),
    );
    await userEvent.click(todayActions);
    const hideCompleted = await documentCanvas.findByRole("menuitemcheckbox", {
      name: "Hide completed tasks",
    });
    expect(hideCompleted).toBeChecked();
    await userEvent.click(hideCompleted);
    await userEvent.keyboard("{Escape}");
    await waitForTodayActionsReady();
    expect(await canvas.findByText("Publish the daily status")).toBeVisible();
    await userEvent.click(
      daySections[4]!.querySelector<HTMLButtonElement>(
        ":scope > header button",
      )!,
    );

    await userEvent.click(todayActions);
    await userEvent.click(
      await documentCanvas.findByRole("menuitem", {
        name: "Mark all incomplete",
      }),
    );
    await waitForTodayActionsReady();
    const reopenedTask = await canvas.findByRole("checkbox", {
      name: "Mark Publish the daily status complete",
    });
    expect(reopenedTask).toBeVisible();
    await userEvent.click(reopenedTask);
    await waitFor(() =>
      expect(
        canvas.queryByRole("checkbox", {
          name: "Mark Publish the daily status complete",
        }),
      ).not.toBeInTheDocument(),
    );

    const morningDisclosure = daySections[1]!.querySelector<HTMLButtonElement>(
      ":scope > header button",
    )!;
    await userEvent.click(morningDisclosure);
    expect(daySections[1]).toHaveAttribute(
      "data-day-section-expanded",
      "false",
    );
    await userEvent.click(morningDisclosure);

    await userEvent.click(
      canvas.getByRole("button", { name: /Thu 2026-08-20/ }),
    );
    expect(
      await canvas.findByRole("heading", { name: "Thursday", level: 1 }),
    ).toBeVisible();
    const selectedAgendaCalendar =
      context.canvasElement.querySelector<HTMLElement>(
        ".tasks-planner__agenda-calendar",
      )!;
    expect(
      await within(selectedAgendaCalendar).findByRole("heading", {
        name: "Thursday",
        level: 1,
      }),
    ).toBeVisible();
    expect(
      within(selectedAgendaCalendar).getByText("August 2026"),
    ).toBeVisible();
    const returnToToday = await canvas.findByRole("button", {
      name: "Return to today",
    });
    expect(returnToToday).toBeVisible();
    const collapsePlanner = canvas.getByRole("button", {
      name: "Collapse planner column",
    });
    expect(returnToToday.getBoundingClientRect().left).toBeLessThan(
      todayActions.getBoundingClientRect().left,
    );
    expect(todayActions.getBoundingClientRect().left).toBeLessThan(
      collapsePlanner.getBoundingClientRect().left,
    );
    await userEvent.click(returnToToday);
    expect(
      canvas.getByRole("button", { name: "Wed 2026-08-19, today" }),
    ).toHaveAttribute("aria-pressed", "true");
    const resetAgendaCalendar =
      context.canvasElement.querySelector<HTMLElement>(
        ".tasks-planner__agenda-calendar",
      )!;
    expect(
      within(resetAgendaCalendar).getByRole("heading", {
        name: "Wednesday",
        level: 1,
      }),
    ).toBeVisible();

    const afternoonSection = context.canvasElement.querySelector<HTMLElement>(
      '[data-day-section="afternoon"]',
    )!;
    await userEvent.click(
      within(afternoonSection).getByRole("button", { name: "New task" }),
    );
    await userEvent.type(
      within(afternoonSection).getByRole("textbox", { name: "New task" }),
      "Agenda interaction task{Enter}",
    );
    expect(
      within(afternoonSection).getByText("Agenda interaction task"),
    ).toBeVisible();

    const checklistDisclosure = canvas.getByRole("button", {
      name: "Show checklist for Review interview notes",
    });
    expect(
      canvas.getByRole("progressbar", { name: "Checklist progress: 1 of 3" }),
    ).toBeVisible();
    const checklistFooter = checklistDisclosure.closest(
      "[data-task-checklist-progress]",
    );
    const checklistRow = checklistFooter?.closest("[data-planner-task-id]");
    const checklistMeta = checklistRow?.querySelector(
      ".application-planner-task-row__meta",
    );
    expect(checklistRow?.lastElementChild).toBe(checklistFooter);
    expect(checklistMeta).toBeInTheDocument();
    expect(
      checklistMeta!.compareDocumentPosition(checklistFooter!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      Math.abs(
        checklistRow!.getBoundingClientRect().width -
          checklistFooter!.getBoundingClientRect().width,
      ),
    ).toBeLessThan(1);
    const checklistBody = checklistRow!.querySelector<HTMLElement>(
      ".application-planner-task-row__columns",
    )!;
    const checklistSwipeContent = checklistRow!.querySelector<HTMLElement>(
      ".application-planner-task-row__swipe-content",
    )!;
    const checklistPreview =
      checklistRow!.querySelector<HTMLElement>(".task-preview-row")!;
    expect(getComputedStyle(checklistBody).borderBottomLeftRadius).toBe("0px");
    expect(getComputedStyle(checklistBody).borderBottomRightRadius).toBe("0px");
    expect(getComputedStyle(checklistSwipeContent).transition).toContain(
      "background-color 0.14s",
    );
    expect(getComputedStyle(checklistPreview).transition).toBe("padding 0.16s");
    const bodySurface = getComputedStyle(checklistBody).backgroundColor;
    const footerSurface = getComputedStyle(checklistFooter!).backgroundColor;
    expect(footerSurface).not.toBe(bodySurface);
    expect(getComputedStyle(checklistRow!).boxShadow).toBe("none");
    (checklistRow as HTMLElement).focus();
    await waitFor(() =>
      expect(getComputedStyle(checklistRow!).boxShadow).not.toBe("none"),
    );
    expect(getComputedStyle(checklistBody).boxShadow).toBe("none");
    expect(getComputedStyle(checklistFooter!).backgroundColor).toBe(
      footerSurface,
    );
    (checklistRow as HTMLElement).blur();
    checklistDisclosure.focus();
    await waitFor(() =>
      expect(getComputedStyle(checklistFooter!).backgroundColor).not.toBe(
        footerSurface,
      ),
    );
    expect(getComputedStyle(checklistBody).backgroundColor).toBe(bodySurface);
    const checklistTaskId = (checklistRow as HTMLElement).dataset
      .plannerTaskId!;
    (checklistRow as HTMLElement).focus();
    await userEvent.keyboard(" ");
    let selectedChecklistRow: HTMLElement | undefined;
    await waitFor(() => {
      selectedChecklistRow = Array.from(
        context.canvasElement.querySelectorAll<HTMLElement>(
          "[data-planner-task-id]",
        ),
      ).find((row) => row.dataset.plannerTaskId === checklistTaskId);
      expect(selectedChecklistRow).toHaveAttribute(
        "data-planner-selected",
        "true",
      );
    });
    const selectedChecklistBody =
      selectedChecklistRow!.querySelector<HTMLElement>(
        ".application-planner-task-row__columns",
      )!;
    const selectedChecklistFooter =
      selectedChecklistRow!.querySelector<HTMLElement>(
        "[data-task-checklist-progress]",
      )!;
    expect(selectedChecklistFooter).toHaveAttribute("data-selected", "true");
    await waitFor(() =>
      expect(getComputedStyle(selectedChecklistFooter).backgroundColor).toBe(
        getComputedStyle(selectedChecklistBody).backgroundColor,
      ),
    );
    const followingTaskId = Array.from(
      context.canvasElement.querySelectorAll<HTMLElement>(
        "[data-planner-task-id]",
      ),
    ).find((row) =>
      row.textContent?.includes("Write flashcards for system design"),
    )?.dataset.plannerTaskId;
    expect(followingTaskId).toBeTruthy();
    const followingTaskRow = Array.from(
      context.canvasElement.querySelectorAll<HTMLElement>(
        "[data-planner-task-id]",
      ),
    ).find((row) => row.dataset.plannerTaskId === followingTaskId)!;
    fireEvent.click(followingTaskRow, { shiftKey: true });
    let rangeChecklistRow: HTMLElement | undefined;
    let rangeFollowingRow: HTMLElement | undefined;
    await waitFor(() => {
      const rows = Array.from(
        context.canvasElement.querySelectorAll<HTMLElement>(
          "[data-planner-task-id]",
        ),
      );
      rangeChecklistRow = rows.find(
        (row) => row.dataset.plannerTaskId === checklistTaskId,
      );
      rangeFollowingRow = rows.find(
        (row) => row.dataset.plannerTaskId === followingTaskId,
      );
      expect(rangeChecklistRow).toHaveClass(
        "application-planner-task-row--selected-first",
      );
      expect(rangeFollowingRow).toHaveClass(
        "application-planner-task-row--selected-last",
      );
    });
    const rangeChecklistBody = rangeChecklistRow!.querySelector<HTMLElement>(
      ".application-planner-task-row__columns",
    )!;
    const rangeChecklistFooter = rangeChecklistRow!.querySelector<HTMLElement>(
      "[data-task-checklist-progress]",
    )!;
    const rangeFollowingBody = rangeFollowingRow!.querySelector<HTMLElement>(
      ".application-planner-task-row__columns",
    )!;
    expect(getComputedStyle(rangeChecklistBody).borderBottomLeftRadius).toBe(
      "0px",
    );
    expect(getComputedStyle(rangeChecklistFooter).borderBottomLeftRadius).toBe(
      "0px",
    );
    expect(getComputedStyle(rangeFollowingBody).borderTopRightRadius).toBe(
      "0px",
    );
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Show checklist for Review interview notes",
      }),
    );
    const interviewChecklist = await canvas.findByRole("group", {
      name: "Checklist for Review interview notes",
    });
    const cadenceItem = within(interviewChecklist).getByRole("checkbox", {
      name: "Note the Kubernetes upgrade cadence",
    });
    expect(cadenceItem.closest("[data-task-checkbox]")).toBeInTheDocument();
    await userEvent.click(cadenceItem);
    expect(cadenceItem).toBeChecked();
    expect(
      canvas.getByRole("progressbar", { name: "Checklist progress: 2 of 3" }),
    ).toBeVisible();
    await userEvent.click(cadenceItem);
    expect(cadenceItem).not.toBeChecked();
    expect(
      canvas.getByRole("progressbar", { name: "Checklist progress: 1 of 3" }),
    ).toBeVisible();

    const applications = canvas.getByRole("button", { name: "Applications" });
    await userEvent.pointer({ keys: "[MouseRight]", target: applications });
    const menu = within(context.canvasElement.ownerDocument.body);
    expect(
      await menu.findByRole("menuitem", { name: "Open note" }),
    ).toBeVisible();
    expect(menu.getByRole("menuitem", { name: "Rename" })).toBeVisible();
    expect(
      menu.getByRole("menuitem", { name: "New nested list" }),
    ).toBeVisible();
    expect(menu.getByRole("menuitem", { name: "Archive" })).toBeVisible();
    expect(menu.getByRole("menuitem", { name: "Delete" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
      expect(
        context.canvasElement.ownerDocument.body.querySelector(
          '[data-slot="context-menu-content"]',
        ),
      ).toBeNull();
    });

    const tailorRow = canvas
      .getByRole("button", {
        name: "Tailor platform CV variant",
        exact: true,
      })
      .closest<HTMLElement>("[data-planner-task-id]")!;
    await fireEvent.click(
      within(tailorRow).getByRole("button", {
        name: "Open task details for Tailor platform CV variant",
      }),
    );
    let detailColumn: HTMLElement;
    let plannerDetailHandle: HTMLElement;
    await waitFor(
      () => {
        detailColumn = context.canvasElement.querySelector<HTMLElement>(
          '[data-column-id="detail"][data-ui-part="column"]',
        )!;
        plannerDetailHandle = context.canvasElement.querySelector<HTMLElement>(
          '[data-column-id="planner"] [data-resize-mode="pair"]',
        )!;
        expect(detailColumn).not.toBeNull();
        expect(plannerDetailHandle).not.toBeNull();
        expect(
          detailColumn.getBoundingClientRect().right,
          "Opened detail column",
        ).toBeCloseTo(canvasInnerRight, 1);
      },
      { timeout: 5_000 },
    );
    expect(
      detailColumn!.querySelector('[data-ui-part="resize-handle"]'),
    ).toBeNull();
    const plannerBeforePairResize = plannerColumn.getBoundingClientRect().width;
    const detailBeforePairResize = detailColumn!.getBoundingClientRect().width;
    await dragPair(plannerDetailHandle!, 48);
    await waitFor(() => {
      expect(plannerColumn.getBoundingClientRect().width).toBeGreaterThan(
        plannerBeforePairResize,
      );
      expect(detailColumn!.getBoundingClientRect().width).toBeLessThan(
        detailBeforePairResize,
      );
    });
    expect(
      plannerColumn.getBoundingClientRect().width +
        detailColumn!.getBoundingClientRect().width,
    ).toBeCloseTo(plannerBeforePairResize + detailBeforePairResize, 1);
    const resizedPlannerDetail = {
      planner: plannerColumn.getBoundingClientRect().width,
      detail: detailColumn!.getBoundingClientRect().width,
    };

    await fireEvent.click(
      canvas.getByRole("button", { name: "Collapse planner column" }),
    );
    await waitFor(() => {
      const collapsedPlanner = context.canvasElement.querySelector<HTMLElement>(
        '[data-column-id="planner"][data-ui-part="collapsed-column"]',
      );
      tasksColumn = context.canvasElement.querySelector<HTMLElement>(
        '[data-column-id="tasks"][data-ui-part="column"]',
      )!;
      detailColumn = context.canvasElement.querySelector<HTMLElement>(
        '[data-column-id="detail"][data-ui-part="column"]',
      )!;
      expect(collapsedPlanner).not.toBeNull();
      expect(collapsedPlanner).not.toHaveAttribute("data-responsive-stage");
      expect(tasksColumn).toHaveAttribute("data-responsive-stage", "pair");
      expect(detailColumn).toHaveAttribute("data-responsive-stage", "pair");
      expect(
        detailColumn.getBoundingClientRect().right,
        "Detail after planner collapse",
      ).toBeCloseTo(canvasInnerRight, 1);
    });
    await fireEvent.click(
      canvas.getByRole("button", { name: "Expand planner column" }),
    );
    await waitFor(() => {
      plannerColumn = context.canvasElement.querySelector<HTMLElement>(
        '[data-column-id="planner"][data-ui-part="column"]',
      )!;
      detailColumn = context.canvasElement.querySelector<HTMLElement>(
        '[data-column-id="detail"][data-ui-part="column"]',
      )!;
      expect(plannerColumn).toHaveAttribute("data-responsive-stage", "pair");
      expect(detailColumn).toHaveAttribute("data-responsive-stage", "pair");
      expect(plannerColumn.getBoundingClientRect().width).toBeCloseTo(
        resizedPlannerDetail.planner,
        1,
      );
      expect(detailColumn.getBoundingClientRect().width).toBeCloseTo(
        resizedPlannerDetail.detail,
        1,
      );
    });

    const openRelatedApplication = await canvas.findByRole("button", {
      name: "Open Nova Bank",
    });
    expect(
      openRelatedApplication.closest(".task-sidebar-detail__top-end"),
    ).not.toBeNull();
    expect(
      openRelatedApplication.closest(".task-sidebar-detail__metadata-actions"),
    ).toBeNull();
    await userEvent.click(openRelatedApplication);
    let relatedColumn: HTMLElement;
    let detailRelatedHandle: HTMLElement;
    await waitFor(
      () => {
        detailColumn = context.canvasElement.querySelector<HTMLElement>(
          '[data-column-id="detail"][data-ui-part="column"]',
        )!;
        relatedColumn = context.canvasElement.querySelector<HTMLElement>(
          '[data-column-id="related"][data-ui-part="column"]',
        )!;
        detailRelatedHandle = context.canvasElement.querySelector<HTMLElement>(
          '[data-column-id="detail"] [data-resize-mode="pair"]',
        )!;
        expect(relatedColumn).not.toBeNull();
        expect(detailRelatedHandle).not.toBeNull();
        expect(detailColumn).toHaveAttribute("data-responsive-stage", "pair");
        expect(relatedColumn).toHaveAttribute("data-responsive-stage", "pair");
        expect(
          relatedColumn.getBoundingClientRect().right,
          "Opened related column",
        ).toBeCloseTo(canvasInnerRight, 1);
      },
      { timeout: 5_000 },
    );
    expect(
      relatedColumn!.querySelector('[data-ui-part="resize-handle"]'),
    ).toBeNull();
    const detailBeforeRelatedResize =
      detailColumn!.getBoundingClientRect().width;
    const relatedBeforeResize = relatedColumn!.getBoundingClientRect().width;
    await dragPair(detailRelatedHandle!, -36);
    await waitFor(() => {
      expect(detailColumn!.getBoundingClientRect().width).toBeLessThan(
        detailBeforeRelatedResize,
      );
      expect(relatedColumn!.getBoundingClientRect().width).toBeGreaterThan(
        relatedBeforeResize,
      );
    });
    expect(
      detailColumn!.getBoundingClientRect().width +
        relatedColumn!.getBoundingClientRect().width,
    ).toBeCloseTo(detailBeforeRelatedResize + relatedBeforeResize, 1);

    const resizedDetailRelated = {
      detail: detailColumn!.getBoundingClientRect().width,
      related: relatedColumn!.getBoundingClientRect().width,
    };
    canvasRoot.scrollTo({ left: 0, behavior: "auto" });
    await fireEvent.scroll(canvasRoot);
    await new Promise((resolve) => setTimeout(resolve, 220));
    expect(canvasRoot.scrollLeft).toBeLessThan(2);
    expect(detailColumn).toHaveAttribute("data-responsive-stage", "pair");
    expect(relatedColumn).toHaveAttribute("data-responsive-stage", "pair");
    expect(detailColumn!.getBoundingClientRect().width).toBeCloseTo(
      resizedDetailRelated.detail,
      1,
    );
    expect(relatedColumn!.getBoundingClientRect().width).toBeCloseTo(
      resizedDetailRelated.related,
      1,
    );

    await userEvent.click(
      canvas.getByRole("button", { name: "Close Nova Bank column" }),
    );
    await waitFor(() => {
      detailColumn = context.canvasElement.querySelector<HTMLElement>(
        '[data-column-id="detail"][data-ui-part="column"]',
      )!;
      expect(
        context.canvasElement.querySelector('[data-column-id="related"]'),
      ).toBeNull();
      expect(plannerColumn.getBoundingClientRect().width).toBeCloseTo(
        resizedPlannerDetail.planner,
        1,
      );
      expect(detailColumn.getBoundingClientRect().width).toBeCloseTo(
        resizedPlannerDetail.detail,
        1,
      );
    });
    await userEvent.click(
      canvas.getByRole("button", { name: "Close detail column" }),
    );
    await waitFor(() => {
      tasksColumn = context.canvasElement.querySelector<HTMLElement>(
        '[data-column-id="tasks"][data-ui-part="column"]',
      )!;
      expect(
        context.canvasElement.querySelector('[data-column-id="detail"]'),
      ).toBeNull();
      expect(tasksColumn.getBoundingClientRect().width).toBeCloseTo(
        resizedTasksWidth,
        1,
      );
      expect(plannerColumn.getBoundingClientRect().width).toBeCloseTo(
        resizedPlannerWidth,
        1,
      );
    });
  }}
>
  {#snippet template()}
    <ApplicationTaskPlannerColumnCanvasStory />
  {/snippet}
</Story>

<Story
  name="Navigation states"
  tags={["visual-pending", "test"]}
  parameters={{
    a11y: {
      test: "error",
    },
    docs: {
      description: {
        story:
          "Persisted expanded, collapsed, and hidden Tasks navigation states, including the icon rail, Lists popover, and transient full-height previews.",
      },
    },
  }}
  play={async (context) => {
    const canvas = within(context.canvasElement);
    const tooltipCanvas = within(document.body);
    const ownerDocument = context.canvasElement.ownerDocument;
    function portalElement<T extends Element>(selector: string): T | null {
      return (
        ownerDocument.querySelector<T>(selector) ??
        document.querySelector<T>(selector)
      );
    }
    const canvasRoot = context.canvasElement.querySelector<HTMLElement>(
      '[data-ui-component="column-canvas"][data-ui-part="root"]',
    )!;
    await waitFor(() =>
      expect(canvasRoot).toHaveAttribute("data-display-mode", "wide"),
    );

    const navigationToggle = canvas.getByRole("button", {
      name: "Toggle Tasks navigation",
    });
    await waitFor(() =>
      expect(navigationToggle).toHaveAttribute("data-state", "collapsed"),
    );

    const bucketLabels = [
      "Inbox — 1 task",
      "Today — 8 tasks",
      "Review — 1 task",
      "Upcoming — 5 tasks",
      "Anytime — 2 tasks",
      "Someday — 1 task",
      "Logbook — 3 tasks",
    ];
    for (const label of bucketLabels) {
      expect(canvas.getByRole("button", { name: label })).toBeVisible();
    }
    await userEvent.hover(navigationToggle);
    await waitFor(
      () => expect(navigationToggle).toHaveAttribute("aria-expanded", "true"),
      { timeout: 1_200, interval: 10 },
    );
    let preview = context.canvasElement.querySelector<HTMLElement>(
      '[data-column-id="tasks"][data-ui-part="column-preview"]',
    );
    expect(preview).toBeVisible();
    await userEvent.click(
      within(preview!).getByRole("button", { name: "Today" }),
    );
    await waitFor(() =>
      expect(
        context.canvasElement.querySelector(
          '[data-column-id="tasks"][data-ui-part="column-preview"]',
        ),
      ).toBeNull(),
    );
    expect(navigationToggle).toHaveAttribute("data-state", "collapsed");
    await fireEvent.mouseLeave(navigationToggle);

    const todayButton = canvas.getByRole("button", {
      name: "Today — 8 tasks",
    });
    expect(todayButton).toHaveAttribute("aria-pressed", "true");
    expect(
      canvas.getByRole("button", { name: "Lists — 5 lists" }),
    ).toHaveAttribute("aria-pressed", "false");

    await userEvent.hover(todayButton);
    await waitFor(() =>
      expect(todayButton).toHaveAttribute("data-state", "instant-open"),
    );
    const todayCountChip = await tooltipCanvas.findByText("8");
    expect(todayCountChip).toHaveClass(
      "task-column-canvas-story__collapsed-tooltip-count",
    );
    expect(
      within(
        todayCountChip.closest('[data-ui-part="tooltip-content"]')!,
      ).getByText("Today"),
    ).toBeVisible();
    await userEvent.unhover(todayButton);

    await userEvent.click(
      canvas.getByRole("button", { name: "Lists — 5 lists" }),
    );
    let listsPopover: HTMLElement | null = null;
    await waitFor(() => {
      listsPopover = portalElement<HTMLElement>(
        ".task-column-canvas-story__lists-popover",
      );
      expect(listsPopover).toBeVisible();
    });
    expect(within(listsPopover!).getByText("All lists")).toBeVisible();
    expect(listsPopover!.querySelector("[data-planner-drop-id]")).toBeNull();
    await userEvent.click(
      within(listsPopover!).getByRole("button", {
        name: "Collapse All lists section",
      }),
    );
    expect(listsPopover!).toBeVisible();
    await userEvent.click(
      within(listsPopover!).getByRole("button", {
        name: "Expand All lists section",
      }),
    );

    const applications = within(listsPopover!).getByRole("button", {
      name: "Applications",
    });
    await fireEvent.contextMenu(applications);
    let listActions: HTMLElement | null = null;
    await waitFor(() => {
      listActions = portalElement<HTMLElement>(
        '[role="menu"][aria-label="Applications list actions"]',
      );
      expect(listActions).toBeVisible();
    });
    await userEvent.click(within(listActions!).getByText("Rename"));
    expect(listsPopover!).toBeVisible();
    const renameInput = within(listsPopover!).getByRole("textbox", {
      name: "Rename Applications",
    });
    await userEvent.type(renameInput, "{Enter}");
    expect(listsPopover!).toBeVisible();

    await userEvent.click(
      within(listsPopover!).getByRole("button", { name: "Applications" }),
    );
    await waitFor(() => expect(listsPopover!).not.toBeVisible());
    expect(navigationToggle).toHaveAttribute("data-state", "collapsed");
    expect(
      canvas.getByRole("button", { name: "Lists — 5 lists" }),
    ).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(
      canvas.getByRole("button", { name: "Expand Tasks column" }),
    );
    await waitFor(() =>
      expect(navigationToggle).toHaveAttribute("data-state", "expanded"),
    );
    const closeTasks = canvas.getByRole("button", {
      name: "Close Tasks column",
    });
    await userEvent.click(closeTasks);
    await waitFor(() =>
      expect(navigationToggle).toHaveAttribute("data-state", "closed"),
    );
    expect(
      context.canvasElement.querySelector(
        '[data-column-id="tasks"][data-ui-part="column"]',
      ),
    ).toBeNull();

    const edgePreview = canvas.getByRole("button", {
      name: "Preview Tasks navigation",
    });
    edgePreview.focus();
    await waitFor(() =>
      expect(
        context.canvasElement.querySelector(
          '[data-column-id="tasks"][data-ui-part="column-preview"]',
        ),
      ).toBeVisible(),
    );
    preview = context.canvasElement.querySelector<HTMLElement>(
      '[data-column-id="tasks"][data-ui-part="column-preview"]',
    );
    expect(preview).toBeVisible();
    expect(preview).toHaveAttribute("data-state", "closed");
    await userEvent.click(
      within(preview!).getByRole("button", { name: "Inbox" }),
    );
    await waitFor(() =>
      expect(
        context.canvasElement.querySelector(
          '[data-column-id="tasks"][data-ui-part="column-preview"]',
        ),
      ).toBeNull(),
    );
    expect(navigationToggle).toHaveAttribute("data-state", "closed");

    await userEvent.hover(edgePreview);
    await waitFor(() =>
      expect(
        context.canvasElement.querySelector(
          '[data-column-id="tasks"][data-ui-part="column-preview"]',
        ),
      ).toBeVisible(),
    );
    await userEvent.unhover(edgePreview);
    await waitFor(
      () =>
        expect(
          context.canvasElement.querySelector(
            '[data-column-id="tasks"][data-ui-part="column-preview"]',
          ),
        ).toBeNull(),
      { timeout: 1_000 },
    );

    await userEvent.click(navigationToggle);
    await waitFor(() =>
      expect(navigationToggle).toHaveAttribute("data-state", "expanded"),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Collapse Tasks column" }),
    );
    await waitFor(() =>
      expect(navigationToggle).toHaveAttribute("data-state", "collapsed"),
    );
    const collapsedEdgePreview = canvas.getByRole("button", {
      name: "Preview Tasks navigation",
    });
    collapsedEdgePreview.focus();
    await waitFor(() =>
      expect(
        context.canvasElement.querySelector(
          '[data-column-id="tasks"][data-ui-part="column-preview"]',
        ),
      ).toBeVisible(),
    );
    preview = context.canvasElement.querySelector<HTMLElement>(
      '[data-column-id="tasks"][data-ui-part="column-preview"]',
    );
    expect(preview).toBeVisible();
    await userEvent.click(
      within(preview!).getByRole("button", { name: "Review" }),
    );
    await waitFor(() =>
      expect(
        context.canvasElement.querySelector(
          '[data-column-id="tasks"][data-ui-part="column-preview"]',
        ),
      ).toBeNull(),
    );
    expect(navigationToggle).toHaveAttribute("data-state", "collapsed");
    await userEvent.click(
      canvas.getByRole("button", { name: "Collapse planner column" }),
    );
    expect(
      canvas.getByRole("button", { name: "Expand planner column" }),
    ).toBeVisible();
  }}
>
  {#snippet template()}
    <ApplicationTaskPlannerColumnCanvasStory
      initialNavigationColumnState="collapsed"
    />
  {/snippet}
</Story>
