<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskPreviewRowExample } from "../../catalog.example-sources";
  import ApplicationTaskPreviewRow from "./ApplicationTaskPreviewRow.svelte";
  import ApplicationTaskPreviewRowSampleStory from "./ApplicationTaskPreviewRowSampleStory.svelte";
  import { playTitleClickStartsInlineEditOnRow } from "../title-inline-edit.story-play";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Rows/Task Preview Row",
    component: ApplicationTaskPreviewRow,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskPreviewRowExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Sortable task preview row for application prep editing.",
        },
      },
    },
  });
</script>

<Story
  name="Sample row"
  tags={["test"]}
  parameters={{
    a11y: {
      test: "off",
    },
    docs: {
      description: {
        story:
          "Clicking the collapsed title replaces the button with a focused contenteditable textbox.",
      },
    },
  }}
  play={playTitleClickStartsInlineEditOnRow}
>
  {#snippet template()}
    <ApplicationTaskPreviewRowSampleStory />
  {/snippet}
</Story>
