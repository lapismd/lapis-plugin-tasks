<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskLineExample } from "../../catalog.example-sources";
  import ApplicationTaskLine from "./ApplicationTaskLine.svelte";

  const task = {
    id: "task-1",
    body: "Tailor platform CV variant",
    done: false,
    status: "todo" as const,
    dueAt: "2026-07-02",
  };

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Rows/Task Line",
    component: ApplicationTaskLine,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskLineExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Compact task line for application task lists.",
        },
      },
    },
  });
</script>

<Story name="Open task" tags={["visual-pending"]} parameters={{ docs: { description: { story: "Compact task line for an open todo." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--xl">
      <ApplicationTaskLine {task} />
    </div>
  {/snippet}
</Story>
