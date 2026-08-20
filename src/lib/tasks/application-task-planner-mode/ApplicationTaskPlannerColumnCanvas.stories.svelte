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
