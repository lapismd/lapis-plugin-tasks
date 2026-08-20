<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, userEvent, waitFor, within } from "storybook/test";
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
    expect(
      context.canvasElement.querySelector(".tasks-planner__agenda-heading"),
    ).not.toBeInTheDocument();
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
    const returnToToday = await canvas.findByRole("button", {
      name: "Return to today",
    });
    expect(returnToToday).toBeVisible();
    await userEvent.click(returnToToday);
    expect(
      canvas.getByRole("button", { name: "Wed 2026-08-19, today" }),
    ).toHaveAttribute("aria-pressed", "true");

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
    const bodySurface = getComputedStyle(checklistBody).backgroundColor;
    const footerSurface = getComputedStyle(checklistFooter!).backgroundColor;
    expect(footerSurface).not.toBe(bodySurface);
    await userEvent.hover(checklistBody);
    expect(getComputedStyle(checklistFooter!).backgroundColor).toBe(
      footerSurface,
    );
    await userEvent.unhover(checklistBody);
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
