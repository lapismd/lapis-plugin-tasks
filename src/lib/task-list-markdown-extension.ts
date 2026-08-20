import {
  MarkdownRenderChild,
  type App,
  type MarkdownExtensionContribution,
  type MarkdownPostProcessorContext,
  type MarkdownSurfaceContext,
} from "@lapis-notes/api";
import {
  EditorSelection,
  StateEffect,
  StateField,
  type EditorState,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import { mount, unmount } from "svelte";
import type { TaskRepository } from "./model/task-repository";
import {
  scanMarkdownTaskGroupHeadings,
  scanMarkdownTaskRuns,
  structuralTaskRunDecorationRange,
  structuralTaskRunEditorChange,
  type TaskMarkdownGroupHeading,
  type StructuralTaskRun,
  type StructuralTaskRunEntryInput,
  type StructuralTaskTargetResolver,
} from "./model/task-list-items";
import TaskListItemsBlock from "./task-list-items-block/TaskListItemsBlock.svelte";
import { asTasksMarkdownSurfaceController } from "./task-list-surface";

type BlockProps = {
  app: App;
  repository: TaskRepository;
  sourcePath: string;
  section: StructuralTaskRun;
  surface: MarkdownSurfaceContext;
  onRevealSource?: () => void;
  onReplaceEntries?: (
    entries: ReadonlyArray<StructuralTaskRunEntryInput>,
  ) => void | Promise<void>;
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
    private readonly section: StructuralTaskRun,
    private readonly surface: MarkdownSurfaceContext,
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

  toDOM(view: EditorView): HTMLElement {
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
          view.dispatch({
            selection: EditorSelection.cursor(this.section.from),
            scrollIntoView: true,
          });
          view.focus();
        },
        onReplaceEntries: (entries) => {
          const source = view.state.doc.toString();
          const change = structuralTaskRunEditorChange(
            source,
            this.section,
            entries,
            this.sourcePath,
          );
          view.dispatch({
            changes: change,
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
    return true;
  }
}

function selectionTouchesSection(state: EditorState, section: StructuralTaskRun) {
  return state.selection.ranges.some(
    (range) => range.from <= section.to && range.to >= section.from,
  );
}

const refreshStructuralTaskRuns = StateEffect.define<null>();

export function structuralTaskRunDecorations(
  state: EditorState,
  app: App,
  repository: TaskRepository,
  sourcePath: string,
  surface: MarkdownSurfaceContext,
): DecorationSet {
  const source = state.doc.toString();
  const controller = asTasksMarkdownSurfaceController(surface.context);
  const resolveTarget = createCachedTargetResolver(app);
  const ranges = scanMarkdownTaskRuns(source, sourcePath, resolveTarget)
    .filter(
      (section) =>
        section.ordinal !== controller?.sourceRunOrdinal &&
        !selectionTouchesSection(state, section),
    )
    .map((section) => {
      const range = structuralTaskRunDecorationRange(section);
      return Decoration.replace({
        block: true,
        widget: new TaskListItemsWidget(
          app,
          repository,
          sourcePath,
          section,
          surface,
        ),
      }).range(range.from, range.to);
    });
  for (const heading of scanMarkdownTaskGroupHeadings(
    source,
    sourcePath,
    resolveTarget,
  )) {
    ranges.push(
      Decoration.line({
        attributes: {
          class: "task-markdown-group-heading",
          "data-task-group-heading": "true",
          "data-task-group-tone": heading.tone,
        },
      }).range(state.doc.lineAt(heading.sourceStart).from),
    );
  }
  return Decoration.set(ranges, true);
}

export function createStructuralTaskRunCodeMirrorExtension(
  app: App,
  repository: TaskRepository,
  sourcePath: string,
  surface: MarkdownSurfaceContext,
) {
  const decorations = StateField.define<DecorationSet>({
    create: (state) =>
      structuralTaskRunDecorations(
        state,
        app,
        repository,
        sourcePath,
        surface,
      ),
    update: (current, transaction) =>
      transaction.docChanged ||
      transaction.selection ||
      transaction.effects.some((effect) => effect.is(refreshStructuralTaskRuns))
        ? structuralTaskRunDecorations(
            transaction.state,
            app,
            repository,
            sourcePath,
            surface,
          )
        : current,
    provide: (field) => EditorView.decorations.from(field),
  });
  const metadataRefresh = ViewPlugin.fromClass(
    class {
      private readonly cleanup: () => void;

      constructor(view: EditorView) {
        const changed = app.metadataCache.on("changed", () => {
          view.dispatch({ effects: refreshStructuralTaskRuns.of(null) });
        });
        const deleted = app.metadataCache.on("deleted", () => {
          view.dispatch({ effects: refreshStructuralTaskRuns.of(null) });
        });
        this.cleanup = () => {
          app.metadataCache.offref(changed);
          app.metadataCache.offref(deleted);
        };
      }

      destroy() {
        this.cleanup();
      }
    },
  );
  return [decorations, metadataRefresh];
}

function isRenderedBulletList(list: Element): list is HTMLUListElement {
  return list.tagName === "UL";
}

function matchingRenderedItems(
  list: HTMLUListElement,
  sourceRun: StructuralTaskRun,
): HTMLLIElement[] | null {
  const items = Array.from(list.children).filter(
    (child): child is HTMLLIElement => child instanceof HTMLLIElement,
  );
  for (let start = 0; start <= items.length - sourceRun.entries.length; start += 1) {
    const segment = items.slice(start, start + sourceRun.entries.length);
    const matches = segment.every((item, index) => {
      if (item.hasAttribute("data-task-run-processed")) return false;
      if (item.querySelector("ul,ol,pre,input[type='checkbox']")) return false;
      const links = item.querySelectorAll<HTMLElement>(
        "[data-mira-internal-link][data-link-preview-path], a[href]",
      );
      if (links.length !== 1) return false;
      const link = links[0]!;
      return (
        item.textContent?.trim() === link.textContent?.trim() &&
        link.textContent?.trim() === sourceRun.entries[index]?.label
      );
    });
    if (matches) return segment;
  }
  return null;
}

function createCachedTargetResolver(app: App): StructuralTaskTargetResolver {
  return (sourcePath, href) => {
    const file = app.metadataCache.getFirstLinkpathDest(href, sourcePath);
    if (!file) return null;
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    if (frontmatter?.type !== "task" && frontmatter?.type !== "task-list") {
      return null;
    }
    return {
      id: typeof frontmatter.id === "string" ? frontmatter.id : file.path,
      path: file.path,
      kind: frontmatter.type,
      title:
        typeof frontmatter.title === "string"
          ? frontmatter.title
          : file.basename,
    };
  };
}

function sourceLineAt(source: string, offset: number): number {
  let line = 0;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function normalizedHeadingText(value: string | null | undefined): string {
  return value?.normalize("NFKC").trim().replace(/\s+/g, " ") ?? "";
}

function renderedHeadings(el: HTMLElement): HTMLElement[] {
  return [
    ...(el.matches("h2,h3,h4,h5,h6") ? [el] : []),
    ...Array.from(el.querySelectorAll<HTMLElement>("h2,h3,h4,h5,h6")),
  ];
}

function markRenderedTaskGroupHeadings(
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  source: string,
  headings: ReadonlyArray<TaskMarkdownGroupHeading>,
): void {
  for (const rendered of renderedHeadings(el)) {
    const level = Number(rendered.tagName.slice(1));
    const section = ctx.getSectionInfo(rendered);
    const match = headings.find(
      (heading) =>
        heading.level === level &&
        (section?.lineStart === sourceLineAt(source, heading.sourceStart) ||
          (!section &&
            normalizedHeadingText(rendered.textContent) ===
              normalizedHeadingText(heading.text))),
    );
    if (!match) continue;
    rendered.classList.add("task-markdown-group-heading");
    rendered.setAttribute("data-task-group-heading", "true");
    rendered.setAttribute("data-task-group-tone", match.tone);
  }
}

function createPostProcessor(app: App, repository: TaskRepository) {
  return async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    if (
      ctx.frontmatter?.type !== "task-list" &&
      ctx.frontmatter?.type !== "task" &&
      ctx.frontmatter?.type !== "task-list-navigation"
    ) {
      return;
    }
    const controller = asTasksMarkdownSurfaceController(ctx.surface?.context);
    if (
      el.tagName === "H1" &&
      controller?.hideMatchingDocumentTitle &&
      sameDisplayTitle(el.textContent, controller.pageTitle)
    ) {
      el.setAttribute("data-task-markdown-redundant-title", "true");
      return;
    }
    const file = app.vault.getFileByPath(ctx.sourcePath);
    const source = file ? await app.vault.cachedRead(file) : "";
    const resolveTarget = createCachedTargetResolver(app);
    const sourceHeadings = source
      ? scanMarkdownTaskGroupHeadings(source, ctx.sourcePath, resolveTarget)
      : [];
    markRenderedTaskGroupHeadings(el, ctx, source, sourceHeadings);
    const sourceSections = source
      ? scanMarkdownTaskRuns(
          source,
          ctx.sourcePath,
          resolveTarget,
        )
      : [];
    const lists = [
      ...(el.matches("ul") ? [el] : []),
      ...Array.from(el.querySelectorAll("ul")),
    ].filter(
      (list, index, all) =>
        isRenderedBulletList(list) &&
        all.indexOf(list) === index,
    ) as HTMLUListElement[];

    sourceSections.forEach((sourceRun) => {
      const match = lists
        .map((list) => ({ list, items: matchingRenderedItems(list, sourceRun) }))
        .find((candidate) => candidate.items);
      if (!match?.items) return;
      const replacesWholeList = match.items.length === match.list.children.length;
      const container = document.createElement(replacesWholeList ? "div" : "li");
      container.setAttribute("data-task-run-processed", "true");
      if (replacesWholeList) {
        match.list.before(container);
        match.list.remove();
      } else {
        match.items[0]!.before(container);
        for (const item of match.items) item.remove();
      }
      const child = new MountedTaskListItemsChild(container, {
        app,
        repository,
        sourcePath: ctx.sourcePath,
        section: sourceRun,
        surface: ctx.surface ?? { id: ctx.mode ?? "reading" },
        onRevealSource:
          ctx.mode === "live-preview"
            ? async () => {
                const controller = asTasksMarkdownSurfaceController(
                  ctx.surface?.context,
                );
                if (controller?.onRevealSource) {
                  await controller.onRevealSource(sourceRun);
                  return;
                }
                const file = app.vault.getFileByPath(ctx.sourcePath);
                if (file) await app.openFile(file);
              }
            : undefined,
      });
      ctx.addChild(child);
    });
  };
}

function sameDisplayTitle(
  rendered: string | null | undefined,
  pageTitle: string | null | undefined,
): boolean {
  const normalize = (value: string | null | undefined) =>
    value?.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  const renderedTitle = normalize(rendered);
  return Boolean(renderedTitle && renderedTitle === normalize(pageTitle));
}

export function createTaskStructureMarkdownContribution(
  app: App,
  repository: TaskRepository,
): MarkdownExtensionContribution {
  return {
    id: "task-structure-runs",
    codeMirror: ({ mode, sourcePath, surface }) =>
      mode === "live-preview"
        ? createStructuralTaskRunCodeMirrorExtension(
            app,
            repository,
            sourcePath,
            surface,
          )
        : null,
    postProcessor: createPostProcessor(app, repository),
  };
}
