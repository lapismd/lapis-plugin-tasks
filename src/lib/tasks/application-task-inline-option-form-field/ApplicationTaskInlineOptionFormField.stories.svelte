<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskInlineOptionFormFieldExample } from "../../catalog.example-sources";
  import ApplicationTaskInlineOptionFormField from "./ApplicationTaskInlineOptionFormField.svelte";
  import { noop } from "../story-fixture";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Editors/Inline Option Form Field",
    component: ApplicationTaskInlineOptionFormField,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskInlineOptionFormFieldExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Inline option picker form field for task priority and status.",
        },
      },
    },
  });
</script>

<Story name="Priority field" tags={["visual-pending"]} parameters={{ docs: { description: { story: "Inline option field bound to task priority." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm">
      <ApplicationTaskInlineOptionFormField
        value="high"
        options={[
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ]}
        update={noop}
      />
    </div>
  {/snippet}
</Story>
