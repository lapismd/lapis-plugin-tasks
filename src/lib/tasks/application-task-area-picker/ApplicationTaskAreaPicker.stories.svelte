<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, userEvent, waitFor, within } from "storybook/test";
  import { ApplicationTaskAreaPickerExample } from "../../catalog.example-sources";
  import ApplicationTaskAreaPicker from "./ApplicationTaskAreaPicker.svelte";
  import { playAreaPickerUsesCommandView } from "./application-task-area-picker.story-play";
  import { noop } from "../story-fixture";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Due, When, and Area/Area Picker",
    component: ApplicationTaskAreaPicker,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskAreaPickerExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "List picker for a task's single task-list parent.",
        },
      },
    },
  });
</script>

<Story name="Sample areas" tags={["visual-pending", "test"]} parameters={{ docs: { description: { story: "Area picker with sample area options." } } }} play={playAreaPickerUsesCommandView}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm">
      <ApplicationTaskAreaPicker
        areas={["Applications"]}
        options={["Applications", "Docs", "CV"]}
        onChange={noop}
      />
    </div>
  {/snippet}
</Story>

<Story
  name="Shows paths and breadcrumbs"
  tags={["visual-pending", "test"]}
  play={async (context) => {
    const canvas = within(context.canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Task list" }));
    await waitFor(() => {
      const panel = document.querySelector<HTMLElement>(
        ".application-task-area-picker__panel",
      );
      expect(panel).not.toBeNull();
      const popover = within(panel!);
      expect(popover.getByText("lists/applications/writing.md")).toBeVisible();
      expect(popover.getByLabelText("List breadcrumb for Writing")).toHaveTextContent(
        "Applications",
      );
      expect(popover.getByLabelText("List breadcrumb for Writing")).toHaveTextContent(
        "Writing",
      );
    });
  }}
>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm">
      <ApplicationTaskAreaPicker
        areas={["Writing"]}
        listId="list-writing"
        options={[
          {
            id: "list-applications",
            title: "Applications",
            path: "lists/applications.md",
          },
          {
            id: "list-docs",
            title: "Docs",
            path: "lists/docs.md",
          },
          {
            id: "list-writing",
            title: "Writing",
            path: "lists/applications/writing.md",
            breadcrumb: ["Applications", "Writing"],
          },
        ]}
        onChange={noop}
      />
    </div>
  {/snippet}
</Story>

<Story
  name="List title display"
  tags={["visual-pending", "test"]}
  play={async (context) => {
    const canvas = within(context.canvasElement);
    expect(
      canvas.getByRole("button", { name: "List title from page" }),
    ).toHaveTextContent("Documentation");
    expect(
      canvas.getByRole("button", { name: "List title from id" }),
    ).toHaveTextContent("List Docs");
  }}
>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm">
      <ApplicationTaskAreaPicker
        listId="list-docs"
        areas={["Documentation"]}
        ariaLabel="List title from page"
        onChange={noop}
      />
      <ApplicationTaskAreaPicker
        listId="list-docs"
        ariaLabel="List title from id"
        onChange={noop}
      />
    </div>
  {/snippet}
</Story>
