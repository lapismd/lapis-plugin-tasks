<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, userEvent, waitFor, within } from "storybook/test";
  import { ApplicationTaskPreviewRowExample } from "../../catalog.example-sources";
  import ApplicationTaskPreviewRow from "./ApplicationTaskPreviewRow.svelte";
  import ApplicationTaskPreviewRowChecklistStory from "./ApplicationTaskPreviewRowChecklistStory.svelte";
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

<Story
  name="Open checklist refreshes after an external edit"
  tags={["test"]}
  parameters={{
    a11y: {
      // Row chrome is role=button with nested controls; covered by catalog smoke.
      test: "off",
    },
    docs: {
      description: {
        story:
          "An external metadata revision refreshes an already-open checklist even when its aggregate counts do not change.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Show checklist for Review interview notes",
      }),
    );
    expect(
      await canvas.findByRole("checkbox", {
        name: "Prepare a mentoring example",
      }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Simulate external checklist edit" }),
    );
    expect(
      await canvas.findByRole("checkbox", {
        name: "Confirm the updated upgrade cadence",
      }),
    ).toBeVisible();
  }}
>
  {#snippet template()}
    <ApplicationTaskPreviewRowChecklistStory showExternalRefresh />
  {/snippet}
</Story>

<Story
  name="Checklist update rollback"
  tags={["test"]}
  parameters={{
    a11y: {
      // Row chrome is role=button with nested controls; covered by catalog smoke.
      test: "off",
    },
    docs: {
      description: {
        story:
          "A failed guarded write rolls the optimistic checkbox state back, refreshes checklist contents, and reports an inline error.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Show checklist for Review interview notes",
      }),
    );
    const checkbox = await canvas.findByRole("checkbox", {
      name: "Note the Kubernetes upgrade cadence",
    });
    await userEvent.click(checkbox);
    await waitFor(() => expect(checkbox).not.toBeChecked());
    expect(
      await canvas.findByRole("alert"),
    ).toHaveTextContent("Checklist changed; reload and try again.");
    expect(
      canvas.getByRole("progressbar", { name: "Checklist progress: 1 of 3" }),
    ).toBeVisible();
  }}
>
  {#snippet template()}
    <ApplicationTaskPreviewRowChecklistStory failUpdates />
  {/snippet}
</Story>
