<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskAreaPickerExample } from "../../catalog.example-sources";
  import ApplicationTaskAreaPicker from "./ApplicationTaskAreaPicker.svelte";
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
          component: "Area tag picker for application tasks.",
        },
      },
    },
  });
</script>

<Story name="Sample areas" tags={["visual-pending"]} parameters={{ docs: { description: { story: "Area picker with sample area options." } } }}>
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
