<script lang="ts">
  import type { App } from "@lapis-notes/api";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import { Button } from "@lapismd/design-core/shadcn/button";
  import { Input } from "@lapismd/design-core/shadcn/input";
  import * as Field from "@lapismd/design-core/shadcn/field";
  import * as Popover from "@lapismd/design-core/shadcn/popover";
  import { InlineOptionPicker } from "@lapismd/design-core/forms";
  import { scanTaskHeadings } from "../model/task-structure";
  import {
    navigationPinHref,
    uniqueListPath,
    type TaskRepository,
  } from "../model";
  import { flushTaskFileSurfaces } from "../task-file-surfaces";
  let {
    app,
    repository,
    path,
    onRefresh,
  }: {
    app: App;
    repository: TaskRepository;
    path: string;
    onRefresh: () => void | Promise<void>;
  } = $props();
  let open = $state(false);
  let action = $state("new-task");
  let heading = $state("[]");
  let text = $state("");
  let headings = $state<Array<{ value: string; label: string }>>([]);
  let error = $state<string | null>(null);
  let busy = $state(false);
  async function load() {
    try {
      const document = await repository.getDocument(path);
      headings = [
        { value: "[]", label: "Document root" },
        ...scanTaskHeadings(document.raw)
          .filter((item) => (item.level ?? 1) > 1)
          .map((item) => ({
            value: JSON.stringify(item.path),
            label: item.path.join(" / "),
          })),
      ];
    } catch (cause) {
      error = String(cause);
    }
  }
  $effect(() => {
    if (open) void load();
  });
  async function apply() {
    if (busy || !text.trim()) return;
    busy = true;
    error = null;
    try {
      await flushTaskFileSurfaces(app, undefined, true);
      const title = text.trim();
      const selected: string[] = JSON.parse(heading);
      if (action === "new-heading") await repository.createHeading(path, title);
      else if (action === "rename-heading") {
        if (!selected.length) throw new Error("Choose a heading to rename.");
        await repository.renameHeading(path, selected, title);
      } else {
        const existing = new Set(
          app.vault.getMarkdownFiles().map((file) => file.path),
        );
        let childPath = uniqueListPath(existing, title);
        if (action === "new-task") {
          const slug =
            title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") || "untitled";
          childPath = `inbox/${slug}.md`;
          let suffix = 2;
          while (existing.has(childPath))
            childPath = `inbox/${slug}-${suffix++}.md`;
          await repository.create({
            path: childPath,
            title,
            id: crypto.randomUUID(),
            at: repository.now().toISOString(),
            inbox: false,
          });
        } else
          await repository.createList({
            path: childPath,
            title,
            id: crypto.randomUUID(),
            at: repository.now().toISOString(),
          });
        await repository.addStructuralEntryUnderHeading(path, selected, {
          label: title,
          target: navigationPinHref(path, childPath),
        });
      }
      await onRefresh();
      text = "";
      open = false;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busy = false;
    }
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    >{#snippet child({ props })}<Button
        {...props}
        variant="ghost"
        size="icon"
        class="task-column-canvas-story__markdown-mode"
        aria-label="Document structure actions"
        title="Add or organize"><PlusIcon /></Button
      >{/snippet}</Popover.Trigger
  >
  <Popover.Content aria-label="Document structure actions">
    <form
      class="task-structure-actions"
      onsubmit={(event) => {
        event.preventDefault();
        void apply();
      }}
    >
      <Field.FieldGroup>
        <Field.Field
          ><Field.Label>Action</Field.Label><InlineOptionPicker
            value={action}
            ariaLabel="Document action"
            options={[
              { value: "new-task", label: "Add task" },
              { value: "new-list", label: "Add nested list" },
              { value: "new-heading", label: "New heading" },
              { value: "rename-heading", label: "Rename heading" },
            ]}
            onChange={(value) => (action = value)}
          /></Field.Field
        >
        {#if action !== "new-heading"}<Field.Field
            ><Field.Label>Heading</Field.Label><InlineOptionPicker
              value={heading}
              options={headings}
              ariaLabel="Choose heading"
              onChange={(value) => (heading = value)}
            /></Field.Field
          >{/if}
        <Field.Field
          ><Field.Label for={`structure-${path}`}>Title</Field.Label><Input
            id={`structure-${path}`}
            bind:value={text}
            disabled={busy}
          /></Field.Field
        >
      </Field.FieldGroup>
      {#if error}<p role="alert">{error}</p>{/if}
      <Button type="submit" size="sm" disabled={busy || !text.trim()}
        >Apply</Button
      >
    </form>
  </Popover.Content>
</Popover.Root>

<style>
  .task-structure-actions {
    display: grid;
    gap: 0.75rem;
    min-width: 15rem;
  }
</style>
