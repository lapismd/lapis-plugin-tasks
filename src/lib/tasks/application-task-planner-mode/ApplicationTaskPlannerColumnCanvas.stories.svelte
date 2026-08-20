<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
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
    const tasksResizeHandle = canvas.getByRole("separator", {
      name: "Resize Tasks column",
    });
    const tasksColumn = context.canvasElement.querySelector<HTMLElement>(
      '[data-column-id="tasks"][data-ui-part="column"]',
    )!;
    const plannerColumn = context.canvasElement.querySelector<HTMLElement>(
      '[data-column-id="planner"][data-ui-part="column"]',
    )!;
    const plannerStartBorderWidth = Number.parseFloat(
      getComputedStyle(plannerColumn).borderLeftWidth,
    );
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
    await fireEvent.pointerUp(window);
    await waitFor(() =>
      expect(tasksResizeHandle).not.toHaveAttribute("data-resizing"),
    );
    expect(
      canvas.getByRole("button", { name: "Collapse All lists section" }),
    ).toBeVisible();
    expect(canvas.getByRole("button", { name: "All lists section" })).toBeVisible();
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
    const alignedTitle = canvas.getByRole("button", {
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
        titleRect.top + titleRect.height / 2 -
          (detailsRect.top + detailsRect.height / 2),
      ),
    ).toBeLessThan(1);
    await playTitleClickStartsInlineEdit(context);
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
    expect(daySections[4]).toHaveAttribute("data-day-section-expanded", "false");
    expect(
      context.canvasElement.querySelector(
        '[data-planner-sortable-list="today:done"]',
      ),
    ).toBeInTheDocument();

    const morningDisclosure = daySections[1]!.querySelector<HTMLButtonElement>(
      ":scope > header button",
    )!;
    await userEvent.click(morningDisclosure);
    expect(daySections[1]).toHaveAttribute("data-day-section-expanded", "false");
    await userEvent.click(morningDisclosure);

    await userEvent.click(
      canvas.getByRole("button", { name: /Thu 2026-08-20/ }),
    );
    expect(
      within(agendaCalendar).getByRole("heading", {
        name: "Thursday",
        level: 1,
      }),
    ).toBeVisible();
    expect(within(agendaCalendar).getByText("August 2026")).toBeVisible();
    const returnToToday = await canvas.findByRole("button", {
      name: "Return to today",
    });
    expect(returnToToday).toBeVisible();
    await userEvent.click(returnToToday);
    expect(
      canvas.getByRole("button", { name: "Wed 2026-08-19, today" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(agendaCalendar).getByRole("heading", {
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
    expect(within(afternoonSection).getByText("Agenda interaction task")).toBeVisible();

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
    const checklistPreview = checklistRow!.querySelector<HTMLElement>(
      ".task-preview-row",
    )!;
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
    const checklistTaskId = (checklistRow as HTMLElement).dataset.plannerTaskId!;
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
    ).find((row) => row.textContent?.includes("Write flashcards for system design"))
      ?.dataset.plannerTaskId;
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
    const rangeChecklistBody =
      rangeChecklistRow!.querySelector<HTMLElement>(
        ".application-planner-task-row__columns",
      )!;
    const rangeChecklistFooter = rangeChecklistRow!.querySelector<HTMLElement>(
      "[data-task-checklist-progress]",
    )!;
    const rangeFollowingBody =
      rangeFollowingRow!.querySelector<HTMLElement>(
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
    expect(await menu.findByRole("menuitem", { name: "Open note" })).toBeVisible();
    expect(menu.getByRole("menuitem", { name: "Rename" })).toBeVisible();
    expect(menu.getByRole("menuitem", { name: "New nested list" })).toBeVisible();
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
  }}
>
  {#snippet template()}
    <ApplicationTaskPlannerColumnCanvasStory />
  {/snippet}
</Story>
