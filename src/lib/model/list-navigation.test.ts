import { MemoryAppDatabase } from "@lapis-notes/api/app-database";
import { describe, expect, it } from "vitest";
import {
  moveNavigationPin,
  navigationPinHref,
  rewriteNavigationBody,
  TaskListMutationError,
} from "./list-navigation";
import { parseTaskDocument } from "./task-document";
import { indexTaskDocument, taskEdges } from "./task-index";
import {
  createMemoryTaskFileStore,
  TaskRepository,
} from "./task-repository";

const AT = "2026-08-19T12:00:00.000Z";

const FILES: Record<string, string> = {
  "lists.md": `---
type: task-list-navigation
id: lists-nav
---
# Lists

## Applications
- [Applications](./lists/applications.md)

## Docs
- [Docs](./lists/docs.md)
`,
  "extra-nav.md": `---
type: task-list-navigation
id: extra-nav
---
# Extra
`,
  "lists/applications.md": `---
type: task-list
id: list-applications
list:
  status: active
---
# Applications

## Items
`,
  "lists/docs.md": `---
type: task-list
id: list-docs
list:
  status: active
---
# Docs

## Items
- [Writing](./writing.md)
`,
  "lists/writing.md": `---
type: task-list
id: list-writing
list:
  status: active
---
# Writing

## Items
`,
  "lists/cv.md": `---
type: task-list
id: list-cv
list:
  status: active
---
# CV

## Items
`,
};

async function openRepository(files = FILES) {
  const database = new MemoryAppDatabase("list-nav");
  await database.open();
  const store = createMemoryTaskFileStore(files);
  for (const [path, raw] of Object.entries(files)) {
    const document = parseTaskDocument(raw, path);
    if (!document) throw new Error(`Invalid fixture ${path}`);
    await indexTaskDocument(database, document);
  }
  return { database, files: store, repository: new TaskRepository(database, store) };
}

describe("list navigation Markdown", () => {
  it("indexes navigation-item edges with section data", () => {
    const document = parseTaskDocument(FILES["lists.md"]!, "lists.md");
    expect(document?.kind).toBe("task-list-navigation");
    expect(taskEdges(document!)).toEqual([
      {
        sourceRowId: "lists-nav",
        relation: "navigation-item",
        targetPath: "lists/applications.md",
        targetText: "./lists/applications.md",
        ordinal: 0,
        data: { section: "Applications" },
      },
      {
        sourceRowId: "lists-nav",
        relation: "navigation-item",
        targetPath: "lists/docs.md",
        targetText: "./lists/docs.md",
        ordinal: 0,
        data: { section: "Docs" },
      },
    ]);
  });

  it("rewrites pinned roots and relative hrefs", () => {
    expect(navigationPinHref("lists.md", "lists/cv.md")).toBe("./lists/cv.md");
    expect(
      rewriteNavigationBody("Lists", [
        { title: "CV", href: "./lists/cv.md", section: "Career" },
        { title: "Docs", href: "./lists/docs.md", section: "Docs" },
      ]),
    ).toBe(`# Lists

## Career
- [CV](./lists/cv.md)

## Docs
- [Docs](./lists/docs.md)
`);
    expect(
      moveNavigationPin(
        [
          { title: "Applications", href: "./lists/applications.md", section: "Applications" },
          { title: "Docs", href: "./lists/docs.md", section: "Docs" },
        ],
        "./lists/docs.md",
        { section: "Applications" },
      ),
    ).toEqual([
      { title: "Applications", href: "./lists/applications.md", section: "Applications" },
      { title: "Docs", href: "./lists/docs.md", section: "Applications" },
    ]);
  });

  it("queries pinned roots, nested children, and unpinned lists", async () => {
    const { repository } = await openRepository();
    await expect(repository.navigation()).resolves.toMatchObject({
      path: "lists.md",
      kind: "task-list-navigation",
    });
    await expect(repository.pinnedRoots()).resolves.toMatchObject([
      { section: "Applications", list: { id: "list-applications" } },
      { section: "Docs", list: { id: "list-docs" } },
    ]);
    await expect(repository.listChildren("list-docs")).resolves.toMatchObject([
      { id: "list-writing" },
    ]);
    await expect(repository.listParents("list-writing")).resolves.toMatchObject([
      { id: "list-docs" },
    ]);
    await expect(repository.parent("list-writing")).resolves.toMatchObject({
      id: "list-docs",
    });
    await expect(repository.unpinnedRoots()).resolves.toMatchObject([
      { id: "list-cv" },
    ]);
  });

  it("ignores extra navigation documents and nested pins", async () => {
    const { repository } = await openRepository();
    const extras = await repository.navigationDocuments();
    expect(extras.map((row) => row.path)).toEqual(
      expect.arrayContaining(["lists.md", "extra-nav.md"]),
    );
    await expect(repository.navigation()).resolves.toMatchObject({
      path: "lists.md",
    });
    const pins = await repository.navigationPins();
    expect(pins.some((pin) => pin.list.id === "list-writing")).toBe(false);
  });

  it("reorders pins, nests, unnests, and refuses cycles", async () => {
    const { repository, files } = await openRepository();
    await repository.movePinnedRoot(
      "lists/docs.md",
      { section: "Applications" },
      AT,
    );
    expect(await files.read("lists.md")).toContain("## Applications");
    expect(await files.read("lists.md")).toContain("[Docs]");
    expect(await files.read("lists.md")).not.toContain("## Docs");

    await repository.nestList("lists/docs.md", "lists/applications.md", AT);
    expect(await files.read("lists/applications.md")).toContain("./docs.md");
    expect(await files.read("lists.md")).not.toContain("./lists/docs.md");
    await expect(repository.listParents("list-docs")).resolves.toMatchObject([
      { id: "list-applications" },
    ]);
    await expect(
      repository.nestList("lists/applications.md", "lists/docs.md", AT),
    ).rejects.toBeInstanceOf(TaskListMutationError);

    await repository.unnestList("lists/docs.md", { section: "Docs" }, AT);
    expect(await files.read("lists.md")).toContain("./lists/docs.md");
    expect(await files.read("lists/applications.md")).not.toContain(
      "lists/docs.md",
    );

    await repository.applyListTreeDrop(
      "lists/writing.md",
      { kind: "nest", parentPath: "lists/applications.md" },
      AT,
    );
    expect(await files.read("lists/docs.md")).not.toContain("./writing.md");
    expect(await files.read("lists/applications.md")).toContain("./writing.md");

    const created = await repository.createList({
      path: "lists/notes.md",
      title: "Notes",
      at: AT,
    });
    expect(created.kind).toBe("task-list");
    expect(await files.read("lists/notes.md")).toContain("# Notes");
    await expect(repository.unpinnedRoots()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    );
  });
});
