import { expect, userEvent, waitFor } from "storybook/test";

/** Component-contract play: title button → focused contenteditable textbox. */
export async function playTitleClickStartsInlineEditOnRow({
  canvasElement,
}: {
  canvasElement: HTMLElement;
}) {
  const row =
    canvasElement.querySelector<HTMLElement>(".application-planner-task-row") ??
    canvasElement.querySelector<HTMLElement>(".task-preview-row-shell") ??
    canvasElement.querySelector<HTMLElement>(".task-preview-row");
  expect(row).not.toBeNull();

  const title = row!.querySelector<HTMLElement>(".task-line__title");
  expect(title).not.toBeNull();
  expect(title).toHaveAttribute("type", "button");
  expect(title).toHaveAttribute("data-swipe-item-gesture-ignore");
  await userEvent.click(title!);

  await waitFor(() => {
    const editor = row!.querySelector<HTMLElement>(".task-line__title-editor");
    expect(editor).not.toBeNull();
    expect(editor).toHaveAttribute("contenteditable", "plaintext-only");
    expect(editor).toHaveAttribute("role", "textbox");
    expect(editor).toHaveAttribute("data-swipe-item-gesture-ignore");
    expect(document.activeElement).toBe(editor);
  });

  const editor = row!.querySelector<HTMLElement>(".task-line__title-editor")!;
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
