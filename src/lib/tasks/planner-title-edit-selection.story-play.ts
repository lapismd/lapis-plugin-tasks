import { expect, userEvent, waitFor } from "storybook/test";

/** Integration play: title edit clears any existing planner row selection. */
export async function playTitleClickStartsInlineEdit({
  canvasElement,
}: {
  canvasElement: HTMLElement;
}) {
  const rows = [
    ...canvasElement.querySelectorAll<HTMLElement>(
      ".application-planner-task-row",
    ),
  ];
  expect(rows.length).toBeGreaterThan(1);

  const firstRow = rows[0]!;
  const secondRow = rows[1]!;

  async function clickPoint(
    host: HTMLElement,
    xRatio: number,
    yRatio: number,
  ) {
    const rect = host.getBoundingClientRect();
    const x = rect.left + rect.width * xRatio;
    const y = rect.top + rect.height * yRatio;
    const target =
      (host.ownerDocument.elementFromPoint(x, y) as HTMLElement | null) ?? host;
    await userEvent.click(target);
  }

  // Select via non-title chrome near the bottom of the row surface.
  await clickPoint(firstRow, 0.55, 0.92);
  await waitFor(() =>
    expect(firstRow).toHaveAttribute("data-planner-selected", "true"),
  );

  const title = secondRow.querySelector<HTMLElement>(".task-line__title");
  expect(title).not.toBeNull();
  expect(title).toHaveAttribute("type", "button");
  await userEvent.click(title!);

  await waitFor(() => {
    const editor = secondRow.querySelector<HTMLElement>(
      ".task-line__title-editor",
    );
    expect(editor).not.toBeNull();
    expect(editor).toHaveAttribute("contenteditable", "plaintext-only");
    expect(editor).toHaveAttribute("role", "textbox");
    expect(document.activeElement).toBe(editor);
    expect(firstRow).not.toHaveAttribute("data-planner-selected", "true");
    expect(secondRow).not.toHaveAttribute("data-planner-selected", "true");
  });

  const editor = secondRow.querySelector<HTMLElement>(
    ".task-line__title-editor",
  )!;
  const before = editor.textContent ?? "";
  editor.focus();
  const selection = editor.ownerDocument.getSelection();
  const range = editor.ownerDocument.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
  editor.ownerDocument.execCommand("insertText", false, " revised");
  expect(editor.textContent).toBe(`${before} revised`);
}
