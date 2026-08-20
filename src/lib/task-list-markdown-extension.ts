import {
  MarkdownRenderChild,
  type App,
  type MarkdownExtensionContribution,
  type MarkdownPostProcessorContext,
  type MarkdownSurfaceContext,
} from "@lapis-notes/api";
import { EditorSelection } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { mount, unmount } from "svelte";
import type { TaskRepository } from "./model/task-repository";
import {
  replaceTaskListItemsSection,
  scanTaskListItemsSections,
  type TaskListItemsEntry,
  type TaskListItemsSection,
} from "./model/task-list-items";
import TaskListItemsBlock from "./task-list-items-block/TaskListItemsBlock.svelte";

type BlockProps = {
  app: App;
  repository: TaskRepository;
  sourcePath: string;
  section: TaskListItemsSection;
  surface: MarkdownSurfaceContext;
  onRevealSource?: () => void;
  onReplaceEntries?: (entries: TaskListItemsEntry[]) => void | Promise<void>;
};

class MountedTaskListItemsChild extends MarkdownRenderChild {
  private readonly instance: ReturnType<typeof mount>;

  constructor(containerEl: HTMLElement, props: BlockProps) {
    super(containerEl);
    this.instance = mount(TaskListItemsBlock, { target: containerEl, props });
  }

  onunload(): void {
    void unmount(this.instance);
  }
}

class TaskListItemsWidget extends WidgetType {
  private instance: ReturnType<typeof mount> | null = null;

  constructor(
    private readonly app: App,
    private readonly repository: TaskRepository,
    private readonly sourcePath: string,
    private readonly section: TaskListItemsSection,
    private readonly surface: MarkdownSurfaceContext,
    private readonly view: EditorView,
  ) {
    super();
  }

  eq(other: TaskListItemsWidget): boolean {
    return (
      other.sourcePath === this.sourcePath &&
      other.section.source === this.section.source &&
      other.section.ordinal === this.section.ordinal &&
      other.surface.id === this.surface.id
    );
  }

  toDOM(): HTMLElement {
    const container = document.createElement("div");
    container.className = "task-list-items-widget";
    this.instance = mount(TaskListItemsBlock, {
      target: container,
      props: {
        app: this.app,
        repository: this.repository,
        sourcePath: this.sourcePath,
        section: this.section,
        surface: this.surface,
        onRevealSource: () => {
          this.view.dispatch({
            selection: EditorSelection.cursor(this.section.contentFrom),
            scrollIntoView: true,
          });
          this.view.focus();
        },
        onReplaceEntries: (entries) => {
          const source = this.view.state.doc.toString();
          const next = replaceTaskListItemsSection(
            source,
            this.section,
            entries,
            this.sourcePath,
          );
          const suffixLength = source.length - this.section.to;
          const insert = next.slice(
            this.section.from,
            suffixLength ? -suffixLength : undefined,
          );
          this.view.dispatch({
            changes: {
              from: this.section.from,
              to: this.section.to,
              insert,
            },
          });
        },
      },
    });
    return container;
  }

  destroy(): void {
    if (this.instance) void unmount(this.instance);
    this.instance = null;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function selectionTouchesSection(view: EditorView, section: TaskListItemsSection) {
  return view.state.selection.ranges.some(
    (range) => range.from <= section.to && range.to >= section.from,
  );
}

export function taskListItemsDecorations(
  view: EditorView,
  app: App,
  repository: TaskRepository,
  sourcePath: string,
  surface: MarkdownSurfaceContext,
): DecorationSet {
  const source = view.state.doc.toString();
  const ranges = scanTaskListItemsSections(source, sourcePath)
    .filter((section) => !selectionTouchesSection(view, section))
    .map((section) =>
      Decoration.replace({
        block: true,
        widget: new TaskListItemsWidget(
          app,
          repository,
          sourcePath,
          section,
          surface,
          view,
        ),
      }).range(section.from, section.to),
    );
  return Decoration.set(ranges, true);
}

export function createTaskListItemsCodeMirrorExtension(
  app: App,
  repository: TaskRepository,
  sourcePath: string,
  surface: MarkdownSurfaceContext,
) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = taskListItemsDecorations(
          view,
          app,
          repository,
          sourcePath,
          surface,
        );
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
          this.decorations = taskListItemsDecorations(
            update.view,
            app,
            repository,
            sourcePath,
            surface,
          );
        }
      }
    },
    { decorations: (value) => value.decorations },
  );
}

function isSupportedRenderedList(list: Element): list is HTMLUListElement {
  if (list.tagName !== "UL") return false;
  return Array.from(list.children).every((child) => {
    if (child.tagName !== "LI") return false;
    const elements = Array.from(child.children);
    if (elements.length !== 1 || elements[0]?.tagName !== "A") return false;
    return Array.from(child.childNodes).every(
      (node) => node.nodeType === Node.ELEMENT_NODE || !node.textContent?.trim(),
    );
  });
}

function renderedSection(
  heading: HTMLHeadingElement,
  ordinal: number,
): { section: TaskListItemsSection; nodes: Element[] } | null {
  const nodes: Element[] = [heading];
  let sibling = heading.nextElementSibling;
  const lists: HTMLUListElement[] = [];
  while (sibling && !/^H[12]$/.test(sibling.tagName)) {
    nodes.push(sibling);
    if (!isSupportedRenderedList(sibling)) return null;
    lists.push(sibling);
    sibling = sibling.nextElementSibling;
  }
  if (lists.length > 1) return null;
  const entries = (lists[0] ? Array.from(lists[0].children) : []).map(
    (item, index): TaskListItemsEntry => {
      const link = item.querySelector(":scope > a")!;
      const label = link.textContent?.trim() ?? "";
      const target = link.getAttribute("href") ?? "";
      const source = `- [${label}](${target})`;
      return { label, target, source, from: index, to: index + source.length };
    },
  );
  const source = `## Items\n${entries.map((entry) => entry.source).join("\n")}${entries.length ? "\n" : ""}`;
  return {
    section: {
      ordinal,
      from: 0,
      to: source.length,
      contentFrom: "## Items\n".length,
      contentTo: source.length,
      source,
      entries,
    },
    nodes,
  };
}

function createPostProcessor(app: App, repository: TaskRepository) {
  return (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    if (ctx.frontmatter?.type !== "task-list") return;
    const headings = [
      ...(el.matches("h2") ? [el] : []),
      ...Array.from(el.querySelectorAll("h2")),
    ].filter(
      (heading, index, all) =>
        heading.textContent?.trim() === "Items" &&
        !heading.hasAttribute("data-task-list-items-processed") &&
        all.indexOf(heading) === index,
    ) as HTMLHeadingElement[];

    headings.forEach((heading, localIndex) => {
      const parsed = renderedSection(heading, localIndex);
      if (!parsed) return;
      const container = document.createElement("div");
      container.setAttribute("data-task-list-items-processed", "true");
      heading.before(container);
      for (const node of parsed.nodes) node.remove();
      const child = new MountedTaskListItemsChild(container, {
        app,
        repository,
        sourcePath: ctx.sourcePath,
        section: parsed.section,
        surface: ctx.surface ?? { id: ctx.mode ?? "reading" },
        onRevealSource: async () => {
          const file = app.vault.getFileByPath(ctx.sourcePath);
          if (file) await app.openFile(file);
        },
      });
      ctx.addChild(child);
    });
  };
}

export function createTaskListMarkdownContribution(
  app: App,
  repository: TaskRepository,
): MarkdownExtensionContribution {
  return {
    id: "task-list-items",
    codeMirror: ({ mode, sourcePath, surface }) =>
      mode === "live-preview"
        ? createTaskListItemsCodeMirrorExtension(
            app,
            repository,
            sourcePath,
            surface,
          )
        : null,
    postProcessor: createPostProcessor(app, repository),
  };
}
