<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTasksEditorExample } from "../../catalog.example-sources";
  import ApplicationTasksEditor from "./ApplicationTasksEditor.svelte";
  import { noop, sampleBoardApplication } from "../story-fixture";

  const application = sampleBoardApplication();

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Editors/Tasks Editor",
    component: ApplicationTasksEditor,
    parameters: {
      docs: {
        source: {
          code: ApplicationTasksEditorExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Editable task list for an application prep thread.",
        },
      },
    },
  });
</script>

<Story name="Sample tasks" tags={["visual-pending", "skip-test", "!test"]} parameters={{ docs: { description: { story: "Editable tasks editor for a sample application." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--2xl">
      <ApplicationTasksEditor {application} onSave={noop} />
    </div>
  {/snippet}
</Story>
