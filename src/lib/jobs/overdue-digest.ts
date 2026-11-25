import type { BackgroundJobContext } from "@lapis-notes/api/background-jobs";
import { stringify } from "yaml";
import { parseTaskDocument } from "../model/task-document";
import { matchesTaskView, taskDocumentToSummary } from "../model/task-queries";

/** No timer or renderer lifetime: the admitted native scheduler invokes this. */
export function run(context: BackgroundJobContext): void {
  const previous = context.state.load();
  if (
    previous &&
    typeof previous === "object" &&
    "notifiedOn" in previous &&
    previous.notifiedOn === context.localDate
  )
    return;
  let count = 0;
  let after: string | undefined;
  const cursors = new Set<string>();
  do {
    if (context.signal.aborted) throw new Error("Digest cancelled");
    const page = context.metadata.query({
      query: {
        excludeHiddenPaths: true,
        propertyFilters: [{ name: "type", op: "=", value: "task" }],
      },
      include: ["properties"],
      limit: 100,
      ...(after ? { after } : {}),
    });
    for (const row of page.rows) {
      const properties = Object.fromEntries(
        row.properties.map((property) => [property.name, property.value]),
      );
      const document = parseTaskDocument(
        `---\n${stringify(properties)}---\n`,
        row.file.path,
      );
      if (
        document &&
        matchesTaskView(
          taskDocumentToSummary(document, context.localDate),
          "review",
          context.localDate,
        )
      )
        count++;
    }
    after = page.nextCursor;
    if (after) {
      if (cursors.has(after))
        throw new Error("Digest metadata cursor repeated");
      cursors.add(after);
    }
  } while (after);
  if (context.signal.aborted) throw new Error("Digest cancelled");
  if (count === 0) return;
  context.notifications.notify({
    id: `overdue-${context.localDate}`,
    title: "Tasks to review",
    message: `${count} overdue ${count === 1 ? "task needs" : "tasks need"} your attention. Open Tasks Review to review them.`,
  });
  context.state.save({ notifiedOn: context.localDate, count });
}
