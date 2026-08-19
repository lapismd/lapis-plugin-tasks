<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
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
  play={playTitleClickStartsInlineEdit}
>
  {#snippet template()}
    <ApplicationTaskPlannerColumnCanvasStory />
  {/snippet}
</Story>
