<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationPlannerTaskRowExample } from "../../catalog.example-sources";
  import ApplicationPlannerTaskRow from "./ApplicationPlannerTaskRow.svelte";
  import ApplicationPlannerTaskRowSampleStory from "./ApplicationPlannerTaskRowSampleStory.svelte";
  import { noop } from "../story-fixture";
  import { samplePlannerTasks } from "../story-fixture";
  import { playTitleClickStartsInlineEditOnRow } from "../title-inline-edit.story-play";

  const selectedTasks = samplePlannerTasks()
    .filter((entry) => entry.when === "today" && entry.status !== "done")
    .slice(0, 3);

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Rows/Planner Task Row",
    component: ApplicationPlannerTaskRow,
    parameters: {
      docs: {
        source: {
          code: ApplicationPlannerTaskRowExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component:
            "Planner task row with application summary and scheduling controls.",
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
      // Row chrome is role=button with nested controls.
      test: "off",
    },
    docs: {
      description: {
        story:
          "Clicking the collapsed title replaces the button with a focused contenteditable textbox. Edit mode is owned by the row, not Planner Mode.",
      },
    },
  }}
  play={playTitleClickStartsInlineEditOnRow}
>
  {#snippet template()}
    <ApplicationPlannerTaskRowSampleStory />
  {/snippet}
</Story>

<Story
  name="Consecutive selection with deadlines"
  tags={["visual-pending", "skip-test", "!test"]}
  parameters={{
    docs: {
      description: {
        story: "Selected planner rows with consecutive selection chrome and deadlines.",
      },
    },
  }}
>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--xl task-story-frame--selection">
      {#each selectedTasks as selectedTask, index (selectedTask.id)}
        <ApplicationPlannerTaskRow
          task={selectedTask}
          application={{
            title: "Applications",
            subtitle: "Selected task",
            color: "#5b8def",
          }}
          taskIndex={index}
          taskTotal={selectedTasks.length}
          selected
          selectionPosition={index === 0
            ? "first"
            : index === selectedTasks.length - 1
              ? "last"
              : "middle"}
          onOpenApplication={noop}
        />
      {/each}
    </div>
  {/snippet}
</Story>
