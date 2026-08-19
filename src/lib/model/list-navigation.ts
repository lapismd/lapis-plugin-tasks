import type { TaskDiagnostic } from "./task-document";
import type { TaskSummary } from "./task-queries";

export const TASK_LIST_NAVIGATION_PATH = "lists.md";

export type TaskListNavNode = {
  id: string;
  path: string;
  title: string;
  count: number;
  section?: string;
  parentId?: string | null;
  hasChildren: boolean;
  children: TaskListNavNode[];
};

export type TaskListNavSection = {
  title: string;
  lists: TaskListNavNode[];
};

export type TaskListNavigationSnapshot = {
  sections: TaskListNavSection[];
  unpinned: TaskListNavNode[];
  diagnostics: TaskDiagnostic[];
};

export type NavigationPin = {
  title: string;
  href: string;
  section: string;
};

export type ListTreeDropTarget =
  | { kind: "section"; section: string; beforePath?: string | null }
  | { kind: "nest"; parentPath: string; beforePath?: string | null };

export class TaskListMutationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TaskListMutationError";
  }
}

export function listIdentitySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/^list-/, "");
}

export function listsMatch(
  list: { id: string; title: string; path?: string },
  needle: string,
): boolean {
  const want = listIdentitySlug(needle);
  if (!want) return false;
  return (
    list.id === needle ||
    list.title.toLowerCase() === needle.toLowerCase() ||
    listIdentitySlug(list.id) === want ||
    listIdentitySlug(list.title) === want ||
    Boolean(
      list.path &&
        (list.path === needle || list.path.endsWith(`/${want}.md`)),
    )
  );
}

export function navigationPinHref(navigationPath: string, listPath: string): string {
  const fromParts = navigationPath.split("/");
  fromParts.pop();
  const toParts = listPath.split("/");
  let shared = 0;
  while (
    shared < fromParts.length &&
    shared < toParts.length &&
    fromParts[shared] === toParts[shared]
  ) {
    shared += 1;
  }
  const up = fromParts.length - shared;
  const down = toParts.slice(shared);
  const relative = [...Array.from({ length: up }, () => ".."), ...down].join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

export function rewriteNavigationBody(
  title: string,
  pins: NavigationPin[],
): string {
  const sections: string[] = [];
  const seen = new Set<string>();
  for (const pin of pins) {
    const section = pin.section.trim() || title;
    if (seen.has(section)) continue;
    seen.add(section);
    sections.push(section);
  }
  const lines = [`# ${title}`, ""];
  for (const section of sections) {
    lines.push(`## ${section}`);
    for (const pin of pins.filter((item) => (item.section.trim() || title) === section)) {
      lines.push(`- [${pin.title}](${pin.href})`);
    }
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function renameNavigationPins(
  pins: NavigationPin[],
  from: string,
  to: string,
): NavigationPin[] {
  const next = to.trim();
  if (!next || next === from) return pins;
  return pins.map((pin) =>
    pin.section === from ? { ...pin, section: next } : pin,
  );
}

export function moveNavigationPin(
  pins: NavigationPin[],
  listHrefOrPath: string,
  target: { section: string; beforeHrefOrPath?: string | null },
): NavigationPin[] {
  const match = (href: string) =>
    href === listHrefOrPath ||
    href.endsWith(`/${listHrefOrPath}`) ||
    listHrefOrPath.endsWith(`/${href.replace(/^\.\//, "")}`);
  const moving = pins.find((pin) => match(pin.href));
  if (!moving) return pins;
  const rest = pins.filter((pin) => pin !== moving);
  const next: NavigationPin = { ...moving, section: target.section };
  if (!target.beforeHrefOrPath) {
    return [...rest, next];
  }
  const beforeIndex = rest.findIndex((pin) => {
    const href = pin.href;
    return (
      href === target.beforeHrefOrPath ||
      href.endsWith(`/${target.beforeHrefOrPath}`) ||
      Boolean(
        target.beforeHrefOrPath &&
          target.beforeHrefOrPath.endsWith(`/${href.replace(/^\.\//, "")}`),
      )
    );
  });
  if (beforeIndex === -1) return [...rest, next];
  return [...rest.slice(0, beforeIndex), next, ...rest.slice(beforeIndex)];
}

export function listTreeFromAreas(
  areas: Array<{ id: string; title: string; count: number }>,
): TaskListNavigationSnapshot {
  return {
    sections: [],
    unpinned: areas.map((area) => ({
      id: area.id,
      path: area.id,
      title: area.title,
      count: area.count,
      hasChildren: false,
      children: [],
    })),
    diagnostics: [],
  };
}

export function emptyListTree(): TaskListNavigationSnapshot {
  return { sections: [], unpinned: [], diagnostics: [] };
}

export function findListNavNode(
  tree: TaskListNavigationSnapshot,
  id: string,
): TaskListNavNode | null {
  const visit = (nodes: TaskListNavNode[]): TaskListNavNode | null => {
    for (const node of nodes) {
      if (node.id === id || node.path === id) return node;
      const nested = visit(node.children);
      if (nested) return nested;
    }
    return null;
  };
  return visit([...tree.sections.flatMap((section) => section.lists), ...tree.unpinned]);
}

export function replaceListNavChildren(
  tree: TaskListNavigationSnapshot,
  id: string,
  children: TaskListNavNode[],
): TaskListNavigationSnapshot {
  const visit = (nodes: TaskListNavNode[]): TaskListNavNode[] =>
    nodes.map((node) => {
      if (node.id === id || node.path === id) {
        return {
          ...node,
          children,
          hasChildren: children.length > 0 || node.hasChildren,
        };
      }
      return { ...node, children: visit(node.children) };
    });
  return {
    ...tree,
    sections: tree.sections.map((section) => ({
      ...section,
      lists: visit(section.lists),
    })),
    unpinned: visit(tree.unpinned),
  };
}

export function toListNavNode(
  list: TaskSummary,
  count: number,
  children: TaskListNavNode[] = [],
  extras: Pick<TaskListNavNode, "section" | "parentId"> = {},
): TaskListNavNode {
  return {
    id: list.id,
    path: list.path,
    title: list.title,
    count,
    section: extras.section,
    parentId: extras.parentId,
    hasChildren: children.length > 0,
    children,
  };
}
