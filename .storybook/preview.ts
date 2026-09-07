import type { Preview } from "@storybook/svelte-vite";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/source-code-pro";
import "@lapismd/design-core/storybook.css";
import "@lapismd/design-core/themes/lapis.css";
import "@lapismd/design-core/forms/form.tokens.css";
import "@lapis-notes/ui/theme.css";
import "../src/lib/styles.css";
import "../src/lib/storybook.css";
import "./preview.css";

const preview: Preview = {
  tags: ["autodocs", "test"],
  globalTypes: {
    theme: {
      description: "Brand theme",
      defaultValue: "lapis",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "lapis", title: "Obsidian" },
          { value: "default", title: "Default" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    colorMode: "light",
    theme: "lapis",
  },
  decorators: [
    withThemeByDataAttribute({
      themes: {
        default: "default",
        lapis: "lapis",
      },
      defaultTheme: "lapis",
      attributeName: "data-ui-theme",
    }),
    (story, context) => {
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute(
          "data-ui-theme",
          String(context.globals.theme ?? "lapis"),
        );
        document.documentElement.classList.toggle(
          "dark",
          context.globals.colorMode === "dark",
        );
      }
      return story();
    },
  ],
  parameters: {
    layout: "fullscreen",
    options: {
      storySort: {
        order: [
          "Specification",
          [
            "Specification governance",
            "Plugins",
            [
              "Tasks",
              [
                "Documents",
                ["Recurrence"],
                "Runtime",
                "Lists",
                "Planner",
                [
                  "Workspace surfaces",
                  "Daily agenda",
                  "Task rows and checklists",
                ],
              ],
            ],
            "Verification",
          ],
          "Plugins",
          [
            "Tasks",
            [
              "Overview",
              "App Shell",
              "Panels",
              "Planners",
              ["Planner Mode", "Planner"],
              "Editors",
              "Due, When, and Area",
              "References",
              "Rows",
              "*",
            ],
          ],
          "*",
        ],
      },
    },
    a11y: {
      test: "error",
    },
    backgrounds: { disable: true },
    themes: { disable: true },
  },
};

export default preview;
