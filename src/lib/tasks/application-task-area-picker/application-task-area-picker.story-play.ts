import { expect, userEvent, waitFor } from "storybook/test";

/** Opens the Area picker and asserts the searchable list is Command View. */
export async function playAreaPickerUsesCommandView({
  canvasElement,
}: {
  canvasElement: HTMLElement;
}) {
  const trigger = canvasElement.querySelector<HTMLButtonElement>(
    '[data-task-area-picker] button[aria-label="Task area"]',
  );
  expect(trigger).not.toBeNull();
  await userEvent.click(trigger!);

  await waitFor(() => {
    const panel = document.querySelector<HTMLElement>(
      ".application-task-area-picker__panel",
    );
    expect(panel).not.toBeNull();
    expect(
      panel!.querySelector(
        '[data-ui-component="command-view"][data-ui-part="root"]',
      ),
    ).not.toBeNull();
  });
}
