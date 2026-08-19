<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskPlannerShellExample } from "../../catalog.example-sources";
  import ApplicationTaskPlannerAppShellStory from "./ApplicationTaskPlannerAppShellStory.svelte";
  import ApplicationTaskPlannerShell from "../application-task-planner-shell/ApplicationTaskPlannerShell.svelte";
  import ApplicationPlannerTaskRow from "../application-planner-task-row/ApplicationPlannerTaskRow.svelte";
  import { buildPlannerApplicationSummaries } from "../../model";
  import {
    noop,
    sampleApplicationBoard,
    samplePlannerTasks,
  } from "../story-fixture";
  import { playTitleClickStartsInlineEdit } from "../planner-title-edit-selection.story-play";

  const tasks = samplePlannerTasks();
  const summaries = buildPlannerApplicationSummaries(sampleApplicationBoard);

  const { Story } = defineMeta({
    title: "Plugins/Tasks/App Shell",
    component: ApplicationTaskPlannerAppShellStory,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskPlannerShellExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component:
            "Tasks compositions mounted in shell chrome: full App Shell workspace and Planner Shell surface.",
        },
      },
    },
  });
</script>

<Story
  name="Workspace"
  tags={["visual-pending", "test"]}
  parameters={{
    a11y: {
      test: "off",
    },
    docs: {
      description: {
        story:
          "Reference planner workspace composed with the shared App Shell (projects rail, planner sidebar, and main Planner Mode).",
      },
    },
  }}
  play={playTitleClickStartsInlineEdit}
>
  {#snippet template()}
    <ApplicationTaskPlannerAppShellStory />
  {/snippet}
</Story>

<Story
  name="Planner Shell"
  tags={["visual-pending", "skip-test", "!test"]}
  parameters={{
    docs: {
      description: {
        story:
          "Planner Shell layout with application task rows, staged like the App Shell main surface.",
      },
    },
  }}
>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div class="task-story-shell-stage__surface">
        <ApplicationTaskPlannerShell
          {tasks}
          view="today"
          applicationSummaries={summaries}
          onOpenApplication={noop}
        >
          {#snippet taskRow(task, rowContext)}
            <ApplicationPlannerTaskRow
              {task}
              application={task.applicationId
                ? summaries[task.applicationId]
                : null}
              taskIndex={rowContext.index}
              taskTotal={rowContext.total}
            />
          {/snippet}
        </ApplicationTaskPlannerShell>
      </div>
    </div>
  {/snippet}
</Story>
