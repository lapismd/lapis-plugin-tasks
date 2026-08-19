<script lang="ts">
  import type { ReferenceIndex } from "@lapismd/design-core/forms";

  import type { JobApplication } from '../../model';
  import ApplicationTaskReferencePicker from "../application-task-reference-picker/ApplicationTaskReferencePicker.svelte";

  type TaskReferenceFormContext = {
    application: JobApplication;
    taskReferenceIndex: ReferenceIndex;
    referenceAddOpen: (key: string) => boolean;
    setReferenceAddOpen: (key: string, open: boolean) => void;
    saveApplication: (application: JobApplication) => void | Promise<void>;
  };

  let {
    value = [],
    context,
    update,
    addKey = "",
    addLabel = "Add Task Reference",
    addHeading = "Task Reference",
    searchPlaceholder = "Search application tasks...",
  }: {
    value?: string[];
    context: TaskReferenceFormContext;
    update: (refs: string[]) => void | Promise<void>;
    addKey?: string;
    addLabel?: string;
    addHeading?: string;
    searchPlaceholder?: string;
  } = $props();

  const refs = $derived(Array.isArray(value) ? value : []);
</script>

<ApplicationTaskReferencePicker
  application={context.application}
  {refs}
  referenceIndex={context.taskReferenceIndex}
  addOpen={context.referenceAddOpen(addKey)}
  {addLabel}
  {addHeading}
  {searchPlaceholder}
  onAddOpenChange={(open) => context.setReferenceAddOpen(addKey, open)}
  onSave={(application) => void context.saveApplication(application)}
  onChange={(nextRefs) => void update(nextRefs)}
/>
