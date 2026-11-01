// Existing full-shell accessibility policy, shared by functional and media stories.
export const workspaceA11y = {
  test: "error",
  config: {
    rules: [
      // Full-shell rows intentionally compose nested task controls.
      { id: "nested-interactive", enabled: false },
      // CodeMirror owns its aria-hidden gutter focus behavior upstream.
      { id: "aria-hidden-focus", enabled: false },
    ],
  },
} as const;
