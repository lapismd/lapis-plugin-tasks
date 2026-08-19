import type { StorybookConfig } from "@storybook/svelte-vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergeConfig, searchForWorkspaceRoot } from "vite";

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(storybookDir, "..");
const packageLib = path.resolve(storybookDir, "../src/lib");

const linkedSiblingPackages = [
  "@lapis-notes/api",
  "@lapis-notes/ui",
  "@lapismd/design-core",
] as const;

const linkedSiblingRoots = linkedSiblingPackages.flatMap((packageName) => {
  const candidate = path.join(repoRoot, "node_modules", packageName);
  return existsSync(candidate) ? [realpathSync(candidate)] : [];
});
const linkedSiblingWorkspaceRoots = [
  ...new Set(linkedSiblingRoots.map(searchForWorkspaceRoot)),
];
const linkedAssetPackages = [
  "@fontsource-variable/dm-sans",
  "@fontsource-variable/source-code-pro",
  "@fontsource/source-code-pro",
] as const;
const linkedAssetRoots = linkedSiblingRoots.flatMap((root) =>
  linkedAssetPackages.flatMap((packageName) => {
    const candidate = path.join(root, "node_modules", packageName);
    return existsSync(candidate) ? [realpathSync(candidate)] : [];
  }),
);

const config: StorybookConfig = {
  stories: ["../stories/**/*.mdx", "../src/**/*.stories.@(js|ts|svelte)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-svelte-csf",
    "@storybook/addon-themes",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/svelte-vite",
    options: {},
  },
  viteFinal: async (viteConfig) =>
    mergeConfig(viteConfig, {
      plugins: [
        svelte({
          preprocess: vitePreprocess(),
          compilerOptions: { runes: undefined },
        }),
        tailwindcss(),
      ],
      resolve: {
        dedupe: ["svelte", "@internationalized/date", "bits-ui"],
        alias: [
          {
            find: /^\$lib(?:\/(.*))?$/,
            replacement: `${packageLib}/$1`,
          },
          {
            find: "@lapis-notes/lapis-plugin-tasks",
            replacement: path.join(packageLib, "index.ts"),
          },
          {
            find: "@internationalized/date",
            replacement: path.join(repoRoot, "node_modules/@internationalized/date"),
          },
          {
            find: "bits-ui",
            replacement: path.join(repoRoot, "node_modules/bits-ui"),
          },
        ],
      },
      esbuild: { target: "esnext" },
      optimizeDeps: {
        exclude: ["@storybook/svelte"],
        esbuildOptions: { target: "esnext" },
        include: [
          "aria-query",
          "react",
          "react-dom",
          "react-dom/client",
          "@lucide/svelte/icons/calendar-days",
          "@lucide/svelte/icons/check",
          "@lucide/svelte/icons/arrow-left",
        ],
      },
      server: {
        fs: {
          allow: [
            repoRoot,
            ...linkedSiblingRoots,
            ...linkedSiblingWorkspaceRoots,
            ...linkedAssetRoots,
          ],
        },
      },
    }),
};

export default config;
