<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskReferenceFormFieldExample } from "../../catalog.example-sources";
  import ApplicationTaskReferenceFormField from "./ApplicationTaskReferenceFormField.svelte";
  import { buildApplicationTaskReferenceIndex } from "../lib/references";
  import { noop, sampleBoardApplication } from "../story-fixture";

  const application = sampleBoardApplication();
  const context = {
    application,
    taskReferenceIndex: buildApplicationTaskReferenceIndex(application),
    referenceAddOpen: () => false,
    setReferenceAddOpen: noop,
    saveApplication: noop,
  };

  const { Story } = defineMeta({
    title: "Plugins/Tasks/References/Reference Form Field",
    component: ApplicationTaskReferenceFormField,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskReferenceFormFieldExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Reference form field wrapping the task reference picker.",
        },
      },
    },
  });
</script>

<Story name="Default" tags={["visual-pending", "skip-test", "!test"]} parameters={{ docs: { description: { story: "Default catalog sample for this control." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--md">
      <ApplicationTaskReferenceFormField value={[]} {context} update={noop} />
    </div>
  {/snippet}
</Story>
