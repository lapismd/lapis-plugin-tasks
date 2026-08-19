<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskAreaFormFieldExample } from "../../catalog.example-sources";
  import ApplicationTaskAreaFormField from "./ApplicationTaskAreaFormField.svelte";
  import { noop } from "../story-fixture";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Due, When, and Area/Area Form Field",
    component: ApplicationTaskAreaFormField,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskAreaFormFieldExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Area form field wrapping the task area picker.",
        },
      },
    },
  });
</script>

<Story name="Default" tags={["visual-pending"]} parameters={{ docs: { description: { story: "Default catalog sample for this control." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm">
      <ApplicationTaskAreaFormField
        value={["Applications"]}
        options={["Applications", "Docs", "CV"]}
        update={noop}
      />
    </div>
  {/snippet}
</Story>
