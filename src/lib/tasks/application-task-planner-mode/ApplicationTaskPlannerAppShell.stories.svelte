<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, waitFor, within } from "storybook/test";
  import { PluginWorkspaceExample } from "../../../stories/PluginWorkspace.example-sources";
  import PluginWorkspaceDemo from "../../../stories/PluginWorkspaceDemo.svelte";
  import { workspaceA11y } from "../../../stories/workspace-a11y";
  import ApplicationTaskPlannerShell from "../application-task-planner-shell/ApplicationTaskPlannerShell.svelte";
  import ApplicationPlannerTaskRow from "../application-planner-task-row/ApplicationPlannerTaskRow.svelte";
  import { buildPlannerApplicationSummaries } from "../../model";
  import {
    noop,
    sampleApplicationBoard,
    samplePlannerTasks,
  } from "../story-fixture";

  const tasks = samplePlannerTasks();
  const summaries = buildPlannerApplicationSummaries(sampleApplicationBoard);

  const { Story } = defineMeta({
    title: "Plugins/Tasks/App Shell",
    component: PluginWorkspaceDemo,
    parameters: {
      layout: "fullscreen",
      a11y: workspaceA11y,
      docs: {
        canvas: { className: "workspace-shell-docs-canvas" },
        source: {
          code: PluginWorkspaceExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component:
            "Tasks compositions mounted in the real public Lapis workspace shell, plus the focused Planner Shell surface.",
        },
        story: { height: "700px", inline: false },
      },
    },
  });
</script>

<Story
  name="Workspace"
  tags={["visual-pending", "test"]}
  parameters={{
    docs: {
      description: {
        story:
          "Boot the public Lapis App and render Tasks inside its real desktop WorkspaceShell.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      () => {
        expect(canvas.getByTestId("plugin-workspace-status")).toHaveTextContent(
          "ready",
        );
        expect(
          canvasElement.querySelector(
            '[data-ui-component="lapis-workspace-shell"]',
          ),
        ).toBeVisible();
        expect(canvas.getByTestId("tasks-planner")).toBeVisible();
      },
      { timeout: 10_000 },
    );
    expect(canvas.getByTestId("plugin-workspace-demo")).toHaveAttribute(
      "data-display-mode",
      "desktop",
    );
  }}
>
  {#snippet template()}
    <PluginWorkspaceDemo displayMode="desktop" />
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
