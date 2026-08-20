export const CatalogBoundaryExample = `<script lang="ts">
  import { CatalogBoundary } from "@lapis-notes/lapis-plugin-tasks";
</script>

<CatalogBoundary />
`;

export const ApplicationTaskLineExample = `<script lang="ts">
  import { ApplicationTaskLine } from "@lapis-notes/lapis-plugin-tasks";

  const task = {
    id: "task-1",
    body: "Tailor platform CV variant",
    done: false,
    status: "todo",
    dueAt: "2026-07-02",
  };
</script>

<ApplicationTaskLine {task} />
`;

export const ApplicationPlannerTaskRowExample = `<script lang="ts">
  import { ApplicationPlannerTaskRow } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationPlannerTaskRow />
`;

export const ApplicationTaskPreviewRowExample = `<script lang="ts">
  import { ApplicationTaskPreviewRow } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskPreviewRow />
`;

export const ApplicationTaskAreaPickerExample = `<script lang="ts">
  import { ApplicationTaskAreaPicker } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskAreaPicker />
`;

export const ApplicationTaskAreaFormFieldExample = `<script lang="ts">
  import { ApplicationTaskAreaFormField } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskAreaFormField />
`;

export const ApplicationTaskWhenPickerExample = `<script lang="ts">
  import { ApplicationTaskWhenPicker } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskWhenPicker />
`;

export const ApplicationTaskWhenPickerContentExample = `<script lang="ts">
  import { ApplicationTaskWhenPickerContent } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskWhenPickerContent />
`;

export const ApplicationTaskWhenFormFieldExample = `<script lang="ts">
  import { ApplicationTaskWhenFormField } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskWhenFormField />
`;

export const ApplicationTaskAtPickerExample = `<script lang="ts">
  import { ApplicationTaskAtPicker } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskAtPicker />
`;

export const ApplicationTaskAtFormFieldExample = `<script lang="ts">
  import { ApplicationTaskAtFormField } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskAtFormField />
`;

export const ApplicationTaskInlineOptionFormFieldExample = `<script lang="ts">
  import { ApplicationTaskInlineOptionFormField } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskInlineOptionFormField />
`;

export const ApplicationTasksEditorExample = `<script lang="ts">
  import { ApplicationTasksEditor } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTasksEditor />
`;

export const ApplicationTasksPreviewExample = `<script lang="ts">
  import { ApplicationTasksPreview } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTasksPreview />
`;

export const ApplicationTaskReferencePickerExample = `<script lang="ts">
  import { ApplicationTaskReferencePicker } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskReferencePicker />
`;

export const ApplicationTaskReferenceFormFieldExample = `<script lang="ts">
  import { ApplicationTaskReferenceFormField } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskReferenceFormField />
`;

export const TaskPlannerExample = `<script lang="ts">
  import { TaskPlanner } from "@lapis-notes/lapis-plugin-tasks";
</script>

<TaskPlanner />
`;

export const ApplicationTaskPlannerModeExample = `<script lang="ts">
  import { ApplicationTaskPlannerMode } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskPlannerMode />
`;

export const ApplicationTaskPlannerShellExample = `<script lang="ts">
  import { ApplicationTaskPlannerShell } from "@lapis-notes/lapis-plugin-tasks";
</script>

<ApplicationTaskPlannerShell />
`;

export const ApplicationTaskPlannerColumnCanvasExample = `<script lang="ts">
  import * as ColumnCanvas from "@lapismd/design-core/shadcn/column-canvas";
  import {
    ApplicationTaskPlannerMode,
    ApplicationTaskSidebarDetail,
  } from "@lapis-notes/lapis-plugin-tasks";

  const canvas = ColumnCanvas.createColumnCanvasController({
    columns: {
      tasks: { defaultWidth: 196, minWidth: 180, pathLevel: 0, collapsible: true },
      planner: { defaultWidth: 540, pathLevel: 1, resizable: true },
      detail: { defaultWidth: 360, pathLevel: 2, closeable: true },
    },
    initialPath: ["today"],
  });
</script>

<div style="height: 100vh">
  <ColumnCanvas.Root controller={canvas} aria-label="Task planner">
    <ColumnCanvas.Column id="tasks" title="Tasks">
      <ColumnCanvas.Body><!-- planner navigation --></ColumnCanvas.Body>
    </ColumnCanvas.Column>
    <ColumnCanvas.Column id="planner" title="Today">
      <ApplicationTaskPlannerMode detailsPresentation="external" />
    </ColumnCanvas.Column>
    <ColumnCanvas.Column id="detail" title="Details">
      <ApplicationTaskSidebarDetail {task} />
    </ColumnCanvas.Column>
  </ColumnCanvas.Root>
</div>
`;
