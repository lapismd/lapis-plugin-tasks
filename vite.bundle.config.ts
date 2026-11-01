import { createRequire } from "node:module";
import { rendererHostModulePlugin } from "@lapis-notes/api/build/vite";
import { pluginHostModuleRegistry } from "@lapis-notes/api/plugin-host-modules";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [
    rendererHostModulePlugin({
      mode: "plugin",
      svelteVersion: createRequire(import.meta.url)("svelte/package.json")
        .version,
    }),
    svelte(),
  ],
  build: {
    target: "es2022",
    outDir: ".release/runtime",
    emptyOutDir: true,
    lib: {
      entry: "src/lib/index.ts",
      formats: ["es"],
      fileName: () => "main.mjs",
      cssFileName: "styles",
    },
    rollupOptions: {
      external: (specifier) => {
        const hosts: Record<
          string,
          { public: boolean; platforms: readonly string[] }
        > = pluginHostModuleRegistry;
        const host = hosts[specifier];
        return (
          /^(?:@lapis-notes\/api(?:$|\/)|@lapismd\/design-core(?:$|\/)|@codemirror\/(?:state|view)$)/.test(
            specifier,
          ) && Boolean(host?.public && host.platforms.includes("web"))
        );
      },
    },
  },
});
