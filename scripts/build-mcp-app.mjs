import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const root = resolve(import.meta.dirname, "../src/mcp-app");
const outDir = resolve(root, "../../dist/mcp-app");
const manifestPath = resolve(root, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const operations = JSON.parse(
  await readFile(resolve(root, "../../operations.json"), "utf8"),
);
const ids = new Set(
  operations
    .filter((entry) => entry.plugin_id === manifest.provider)
    .map((entry) => entry.id),
);
await mkdir(outDir, { recursive: true });
for (const { file, operation, actions } of manifest.apps) {
  if (![operation, ...actions].every((id) => ids.has(id))) {
    throw new Error("MCP App references an unknown Tasks operation");
  }
  const result = await build({
    configFile: false,
    root,
    base: "./",
    publicDir: false,
    plugins: [svelte(), viteSingleFile()],
    build: {
      outDir,
      write: false,
      emptyOutDir: false,
      target: "es2022",
      modulePreload: false,
      rollupOptions: { input: resolve(root, file) },
    },
  });
  const bundle = Array.isArray(result) ? result[0] : result;
  const html = bundle.output.find((asset) => asset.fileName === file)?.source;
  if (typeof html !== "string" || Buffer.byteLength(html) > 8 * 1024 * 1024) {
    throw new Error(`Missing or oversized Tasks MCP App: ${file}`);
  }
  await writeFile(resolve(outDir, file), html);
}
await copyFile(manifestPath, resolve(outDir, "manifest.json"));
