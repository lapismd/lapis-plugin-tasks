<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskPlannerModeExample } from "../../catalog.example-sources";
  import ApplicationTaskPlannerMode from "./ApplicationTaskPlannerMode.svelte";
  import ApplicationTaskPlannerModeStory from "./ApplicationTaskPlannerModeStory.svelte";
  import ApplicationTaskPlannerSortableStory from "./ApplicationTaskPlannerSortableStory.svelte";
  import { playTitleClickStartsInlineEdit } from "../planner-title-edit-selection.story-play";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Planners/Planner Mode",
    component: ApplicationTaskPlannerMode,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskPlannerModeExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Task planner mode content for application kanban board.",
        },
      },
    },
  });
</script>

<Story name="Today view" tags={["visual-pending", "skip-test", "!test"]} parameters={{ docs: { description: { story: "Planner mode showing the today board." } } }}>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div class="task-story-shell-stage__surface">
        <ApplicationTaskPlannerModeStory />
      </div>
    </div>
  {/snippet}
</Story>

<Story
  name="Title click starts inline edit"
  tags={["test"]}
  parameters={{
    a11y: {
      // Row chrome is role=button with nested controls; covered by catalog smoke.
      test: "off",
    },
    docs: {
      description: {
        story:
          "Clicking a collapsed Task title replaces the title button with a focused contenteditable textbox (not a full-row select).",
      },
    },
  }}
  play={playTitleClickStartsInlineEdit}
>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div class="task-story-shell-stage__surface">
        <ApplicationTaskPlannerModeStory />
      </div>
    </div>
  {/snippet}
</Story>

<Story name="Sortable stress" tags={["visual-pending", "skip-test", "!test"]} parameters={{ docs: { description: { story: "Planner mode with many sortable rows." } } }}>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div
        class="task-story-shell-stage__surface task-story-shell-stage__surface--sortable"
      >
        <ApplicationTaskPlannerSortableStory />
      </div>
    </div>
  {/snippet}
</Story>
