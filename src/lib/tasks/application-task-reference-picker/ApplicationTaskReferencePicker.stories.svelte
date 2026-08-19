<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskReferencePickerExample } from "../../catalog.example-sources";
  import ApplicationTaskReferencePicker from "./ApplicationTaskReferencePicker.svelte";
  import { buildApplicationTaskReferenceIndex } from "../lib/references";
  import { noop, sampleBoardApplication } from "../story-fixture";

  const application = sampleBoardApplication();
  const referenceIndex = buildApplicationTaskReferenceIndex(application);

  const { Story } = defineMeta({
    title: "Plugins/Tasks/References/Reference Picker",
    component: ApplicationTaskReferencePicker,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskReferencePickerExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Reference picker for linking application tasks to evidence stories.",
        },
      },
    },
  });
</script>

<Story name="Default" tags={["visual-pending", "skip-test", "!test"]} parameters={{ docs: { description: { story: "Default catalog sample for this control." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--md">
      <ApplicationTaskReferencePicker
        {application}
        refs={[]}
        referenceIndex={referenceIndex}
        onChange={noop}
      />
    </div>
  {/snippet}
</Story>
