import { defineConfig } from "vite";
export default defineConfig({
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    target: "es2022",
    outDir: ".release/runtime/jobs",
    emptyOutDir: true,
    minify: true,
    lib: {
      entry: "src/lib/jobs/overdue-digest.ts",
      formats: ["es"],
      fileName: () => "overdue-digest.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
