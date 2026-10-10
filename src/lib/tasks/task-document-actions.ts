import {
  Component,
  MarkdownRenderer,
  hasNativeDesktopBridge,
  createLapisFileUrl,
  type App,
} from "@lapis-notes/api";
import type { TaskDocument } from "../model";

export function taskFileUrl(app: App, path: string): string {
  return createLapisFileUrl(
    app.appDatabase.vaultId || app.vault.getName(),
    path,
  );
}

export function supportsTaskPrinting(): boolean {
  return (
    !hasNativeDesktopBridge() &&
    typeof window !== "undefined" &&
    typeof window.print === "function"
  );
}

/** Render through the host Markdown API; the detached print frame owns disposal. */
export async function printTaskDocument(
  app: App,
  task: TaskDocument,
): Promise<void> {
  if (!supportsTaskPrinting())
    throw new Error("This host does not support task printing.");
  const frame = document.createElement("iframe");
  frame.title = "Task print document";
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;";
  document.body.append(frame);
  const target = frame.contentDocument;
  if (!target || !frame.contentWindow) {
    frame.remove();
    throw new Error("Could not create the task print document.");
  }
  target.title = task.title;
  const style = target.createElement("style");
  const fontFaces: string[] = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules)
        if (rule.type === CSSRule.FONT_FACE_RULE) fontFaces.push(rule.cssText);
    } catch {
      /* Cross-origin stylesheets are not required for printing. */
    }
  }
  style.textContent = `${fontFaces.join("\n")} body { font-family: 'DM Sans Variable', 'DM Sans', sans-serif; color: #111; margin: 24px; } h1 { font-size: 20px; } .task-print-metadata { font-size: 12px; } button,[data-task-drag-handle],[data-task-preview-hover-actions] { display: none !important; } img { max-width: 100%; }`;
  target.head.append(style);
  const heading = target.createElement("h1");
  heading.textContent = task.title;
  target.body.append(heading);
  const metadata = target.createElement("p");
  metadata.className = "task-print-metadata";
  metadata.textContent = [
    task.task.status,
    task.task.priority ? `${task.task.priority} priority` : "",
    task.task.plan ? `Planned ${task.task.plan.date}` : "",
    task.task.deadline ? `Due ${task.task.deadline}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  target.body.append(metadata);
  const body = target.createElement("div");
  target.body.append(body);
  class PrintOwner extends Component {}
  const owner = new PrintOwner();
  owner.containerEl = body;
  owner.load();
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    owner.unload();
    frame.remove();
  };
  try {
    await MarkdownRenderer.render(
      app,
      task.body.replace(/^\s*#\s+.+(?:\r?\n|$)/, ""),
      body,
      task.path,
      owner,
    );
    for (const control of body.querySelectorAll(
      "input,button,textarea,[contenteditable]",
    )) {
      if (control.tagName === "INPUT") control.setAttribute("disabled", "");
      control.removeAttribute("contenteditable");
    }
    for (const comment of task.task.comments) {
      const p = target.createElement("p");
      p.textContent = `${comment.text} — ${comment.at}${comment.resolved ? " (resolved)" : ""}`;
      target.body.append(p);
    }
    target.body.inert = true;
    await target.fonts.ready;
    frame.contentWindow.addEventListener("afterprint", dispose, { once: true });
    frame.contentWindow.focus();
    frame.contentWindow.print();
    // Browser print() completes after its modal closes, including cancellation.
    dispose();
  } catch (error) {
    dispose();
    throw error;
  }
}
