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
  const secondTaskId = secondRow.dataset.plannerTaskId;
  expect(secondTaskId).toBeTruthy();

  function currentSecondRow() {
    const current = [
      ...canvasElement.querySelectorAll<HTMLElement>(
        ".application-planner-task-row",
      ),
    ].find((row) => row.dataset.plannerTaskId === secondTaskId);
    expect(current).not.toBeUndefined();
    return current!;
  }

  // Select the row itself through its keyboard contract. This avoids coupling
  // the selection setup to body/footer geometry or to whichever child happens
  // to occupy a percentage-based pointer coordinate.
  firstRow.focus();
  await userEvent.keyboard(" ");
  await waitFor(() =>
    expect(firstRow).toHaveAttribute("data-planner-selected", "true"),
  );

  // Selection updates can replace keyed row elements. Reacquire the next row
  // by task identity before starting title edit.
  const editableRow = currentSecondRow();
  expect(editableRow).not.toHaveAttribute("data-planner-select-on-surface");
  expect(editableRow).not.toHaveClass("application-planner-task-row--expanded");
  const title = editableRow.querySelector<HTMLElement>(".task-line__title");
  expect(title).not.toBeNull();
  expect(title).toHaveAttribute("type", "button");
  await userEvent.click(title!);

  await waitFor(() => {
    const currentRow = currentSecondRow();
    const editor = currentRow.querySelector<HTMLElement>(
      ".task-line__title-editor",
    );
    expect(editor).not.toBeNull();
    expect(editor).toHaveAttribute("contenteditable", "plaintext-only");
    expect(editor).toHaveAttribute("role", "textbox");
    expect(document.activeElement).toBe(editor);
    expect(firstRow).not.toHaveAttribute("data-planner-selected", "true");
    expect(currentRow).not.toHaveAttribute("data-planner-selected", "true");
  });

  const editor = currentSecondRow().querySelector<HTMLElement>(
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
