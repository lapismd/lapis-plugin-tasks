<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, within } from "storybook/test";
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
