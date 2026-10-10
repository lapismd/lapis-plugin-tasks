import { MemoryAppDatabase } from "@lapis-notes/api/app-database";
import { describe, expect, it } from "vitest";
import { parseTaskDocument, serializeTaskDocument } from "./task-document";
import { indexTaskDocument } from "./task-index";
import {
  TaskRepository,
  createMemoryTaskFileStore,
  getTaskNotes,
} from "./task-repository";
import { catalogTaskFromSummary } from "./catalog-adapter";
import { applyCatalogTaskToRepository } from "./apply-catalog-task";

const at = "2026-08-19T10:00:00Z";
const task = (id: string, body: string, status = "open") =>
  `---\ntype: task\nid: ${id}\ncustom: keep\ntask:\n  status: ${status}\n  start: anytime\n  custom: retain\n---\n\n# ${id}\n\n${body}\n`;

async function setup() {
  const files = createMemoryTaskFileStore({
    "parent.md": task(
      "parent",
      "## Work\n\n- [Child](child.md)\n- [Other](other.md)\n\nSee [Child](child.md).",
    ),
    "child.md": task(
      "child",
      "Notes\n\n- [x] Personal checklist\n\n- [Grandchild](grandchild.md)",
    ),
    "other.md": task("other", "- [x] Keep this checked", "canceled"),
    "grandchild.md": task("grandchild", "Grandchild notes", "completed"),
  });
  const database = new MemoryAppDatabase("runtime-actions");
  await database.open();
  for (const path of ["parent.md", "child.md", "other.md", "grandchild.md"])
    await indexTaskDocument(
      database,
      parseTaskDocument(await files.read(path), path)!,
    );
  const repository = new TaskRepository(database, files, () => new Date(at));
  await repository.validateStructuralGraph();
  return { repository, files, database };
}

describe("repository-backed runtime actions", () => {
  it("edits only notes, retaining a concurrent title and metadata mutation", async () => {
    const { repository } = await setup();
    const original = await repository.getTaskDocument("child.md");
    const notes = getTaskNotes(original.body);
    expect(notes).not.toContain("# child");
    await repository.setTitle("child.md", "Renamed title", at);
    await repository.setPriority("child.md", "high", at);
    const next = `${notes}\n## Follow up\n\n- [ ] New checklist\n`;
    await repository.setNotes("child.md", next, notes, at);
    const saved = await repository.getTaskDocument("child.md");
    expect(saved.title).toBe("Renamed title");
    expect(saved.task.priority).toBe("high");
    expect(saved.raw).toContain("custom: keep");
    expect(saved.raw).toContain("custom: retain");
    expect(saved.body).toBe(`\n# Renamed title\n\n${next}`);
    expect(saved.checklist).toHaveLength(2);
    await expect(
      repository.setNotes("child.md", "Stale edit", notes, at),
    ).rejects.toThrow("notes changed");
    expect(
      getTaskNotes((await repository.getTaskDocument("child.md")).body),
    ).toBe(next);
  });

  it("checks the notes inside the guarded save and retains a failed draft for retry", async () => {
    const { repository, files, database } = await setup();
    const notes = getTaskNotes(
      (await repository.getTaskDocument("child.md")).body,
    );
    const guarded = new TaskRepository(database, {
      ...files,
      async process(path, mutate) {
        await repository.setNotes(path, "Concurrent body", notes, at);
        const next = mutate(await files.read(path));
        await files.write(path, next);
        return next;
      },
    });
    await expect(
      guarded.setNotes("child.md", "My draft", notes, at),
    ).rejects.toThrow("notes changed");
    expect(
      getTaskNotes((await repository.getTaskDocument("child.md")).body),
    ).toBe("Concurrent body");
    await repository.setNotes("child.md", "My draft", "Concurrent body", at);
    expect(
      getTaskNotes((await repository.getTaskDocument("child.md")).body),
    ).toBe("My draft");
    expect(getTaskNotes("# Empty task\n")).toBe("");
    expect(getTaskNotes("Notes with no title\n")).toBe("Notes with no title\n");
  });

  it("rejects a heading action when the source changes before the vault transaction", async () => {
    const { files, database } = await setup();
    const original = await files.read("parent.md");
    const concurrent = `${original}\nA concurrent note.\n`;
    const repository = new TaskRepository(
      database,
      {
        ...files,
        async process(path, mutate) {
          await files.write(path, concurrent);
          const next = mutate(await files.read(path));
          await files.write(path, next);
          return next;
        },
      },
      () => new Date(at),
    );
    await expect(
      repository.createHeading("parent.md", "New section"),
    ).rejects.toThrow("changed");
    expect(await files.read("parent.md")).toBe(concurrent);
  });

  it("persists and clears priority through the adapter, retaining unknown YAML and body", async () => {
    const { repository, files, database } = await setup();
    const previous = catalogTaskFromSummary((await repository.get("child"))!);
    await applyCatalogTaskToRepository(
      repository,
      { ...previous, priority: "high", updatedAt: at },
      previous,
    );
    const raw = await files.read("child.md");
    expect(raw).toContain("priority: high");
    expect(raw).toContain("custom: retain");
    expect(raw).toContain("custom: keep");
    await database.deleteTaskProjection("child.md");
    await indexTaskDocument(database, parseTaskDocument(raw, "child.md")!);
    const reloaded = catalogTaskFromSummary((await repository.get("child"))!);
    expect(reloaded.priority).toBe("high");
    await applyCatalogTaskToRepository(
      repository,
      { ...reloaded, priority: undefined, updatedAt: at },
      reloaded,
    );
    expect(await files.read("child.md")).not.toContain("priority:");
    expect((await repository.getTaskDocument("child.md")).body).toContain(
      "- [Grandchild](grandchild.md)",
    );
  });

  it("retains invalid priority during an unrelated edit", () => {
    const raw = task("example", "Body").replace(
      "  start: anytime",
      "  start: anytime\n  priority: custom-value",
    );
    const document = parseTaskDocument(raw, "example.md")!;
    expect(serializeTaskDocument({ ...document, updated: at })).toContain(
      "priority: custom-value",
    );
  });

  it("saves local comments, guards concurrent edits, resolves and deletes them", async () => {
    const { repository } = await setup();
    const first = await repository.addComment("child.md", "Local note");
    expect(first.at).toBe(new Date(at).toISOString());
    await repository.updateComment(
      "child.md",
      first.id,
      { text: "Edited note" },
      first,
    );
    await expect(
      repository.updateComment(
        "child.md",
        first.id,
        { text: "Stale edit" },
        first,
      ),
    ).rejects.toThrow("changed");
    const edited = (await repository.getTaskDocument("child.md")).task
      .comments[0];
    await repository.updateComment(
      "child.md",
      first.id,
      { resolved: true },
      edited,
    );
    const resolved = (await repository.getTaskDocument("child.md")).task
      .comments[0];
    expect(resolved.resolved).toBe(true);
    await repository.removeComment("child.md", resolved);
    expect((await repository.get("child"))?.commentCount).toBe(0);
  });

  it("duplicates one task beside its parent entry and leaves children referenced", async () => {
    const { repository, files } = await setup();
    await repository.setPriority("child.md", "high", at);
    await repository.addComment("child.md", "Do not copy");
    const copy = await repository.duplicate("child.md", "child-copy.md");
    expect(copy.id).not.toBe("child");
    expect(copy.status).toBe("open");
    expect(copy.priority).toBe("high");
    expect(copy.inbox).toBe(false);
    const document = await repository.getTaskDocument("child-copy.md");
    expect(document.task.comments).toEqual([]);
    expect(document.body).toContain("- [ ] Personal checklist");
    expect(document.body).toContain("Reference: [Grandchild]");
    expect(await repository.children(copy.id)).toEqual([]);
    expect(await files.read("parent.md")).toContain(
      "- [Child](child.md)\n- [child (copy)](./child-copy.md)\n- [Other](other.md)",
    );
    expect((await repository.get("grandchild"))?.status).toBe("completed");
  });

  it("bulk reopen affects only direct completed children and its own checklist", async () => {
    const { repository } = await setup();
    await repository.complete("child.md", at);
    await repository.markDocumentIncomplete("parent.md");
    expect((await repository.get("child"))?.status).toBe("open");
    expect((await repository.get("other"))?.status).toBe("canceled");
    expect((await repository.get("grandchild"))?.status).toBe("completed");
    expect(
      (await repository.getTaskDocument("child.md")).checklist[0].checked,
    ).toBe(true);
  });

  it("deletes structural occurrences while retaining prose references and descendant files", async () => {
    const { repository, files } = await setup();
    await repository.remove("child.md");
    const parent = await files.read("parent.md");
    expect(parent).not.toContain("- [Child](child.md)");
    expect(parent).toContain("See [Child](child.md).");
    expect(await files.read("grandchild.md")).toContain("Grandchild notes");
    await expect(files.read("child.md")).rejects.toThrow("Missing");
  });
});
