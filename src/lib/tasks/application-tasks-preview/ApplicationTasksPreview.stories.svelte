<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTasksPreviewExample } from "../../catalog.example-sources";
  import ApplicationTasksPreview from "./ApplicationTasksPreview.svelte";
  import { noop, sampleBoardApplication } from "../story-fixture";

  const application = sampleBoardApplication();

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Editors/Tasks Preview",
    component: ApplicationTasksPreview,
    parameters: {
      docs: {
        source: {
          code: ApplicationTasksPreviewExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Read-only task preview for application prep.",
        },
      },
    },
  });
</script>

<Story name="Sample preview" tags={["visual-pending", "skip-test", "!test"]} parameters={{ docs: { description: { story: "Read-only tasks preview for a sample application." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--2xl">
      <ApplicationTasksPreview {application} onSave={noop} />
    </div>
  {/snippet}
</Story>
