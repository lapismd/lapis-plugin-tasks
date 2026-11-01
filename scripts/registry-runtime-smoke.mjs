import { createServer as httpServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { createServer, build } from "vite";
import {
  rendererHostModulePlugin,
  tursoBundleBuildPlugin,
} from "@lapis-notes/api/build/vite";
import { pluginHostModuleRegistry } from "@lapis-notes/api/plugin-host-modules";
import { chromium } from "playwright";
import { signRegistryRelease } from "./registry-release.mjs";
import { verifyPluginBundle } from "./vendor/lapis-plugins/scripts/lib/verify-plugin-release.mjs";

const root = process.cwd();
const work = await mkdtemp(join(tmpdir(), "tasks-archive-smoke-"));
const browser = await chromium.launch({ headless: true });
try {
  // A disposable acceptance key never grants production release trust.
  await mkdir(join(work, ".release"));
  await cp(".release/registry", join(work, ".release/registry"), {
    recursive: true,
  });
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const key = join(work, "acceptance-key.pem");
  await writeFile(key, privateKey.export({ type: "pkcs8", format: "pem" }));
  const request = await signRegistryRelease({
    root: work,
    privateKeyFile: key,
    keyId: "acceptance-only",
    production: false,
  });
  const bundleBytes = await readFile(
    join(work, ".release/registry", request.assetName),
  );
  const { files, releaseManifest } = verifyPluginBundle({
    bundleBytes,
    publicKey,
  });
  const specs = releaseManifest.runtime.entries.workspace.sharedDependencies;
  for (const name of specs) {
    const host = pluginHostModuleRegistry[name];
    if (!host?.public || !host.platforms.includes("web"))
      throw Error(`Unavailable public host module: ${name}`);
  }
  const hostIds = new Map(
    specs.map((name, i) => [`/registry-host-${i}.js`, name]),
  );
  const imports = Object.fromEntries(
    [...hostIds].map(([url, name]) => [name, url]),
  );
  const smokeRoot = join(root, ".release/registry-smoke");
  await mkdir(smokeRoot, { recursive: true });
  await writeFile(
    join(smokeRoot, "index.html"),
    `<!doctype html><html data-ui-theme="lapis"><head><link rel="icon" href="data:,"><link rel="stylesheet" href="/registry-plugin/styles.css"><script type="importmap">${JSON.stringify({ imports })}</script></head><body class="sb-main-fullscreen"><div id="storybook-root"></div><script type="module" src="/.release/registry-smoke/bootstrap.ts"></script></body></html>`,
  );
  await writeFile(
    join(smokeRoot, "bootstrap.ts"),
    `
import { mount, unmount } from "svelte";
import "@lapismd/design-core/storybook.css";
import "@lapismd/design-core/themes/lapis.css";
import "@lapismd/design-core/forms/form.tokens.css";
import "@lapis-notes/ui/theme.css";
import "/.storybook/preview.css";
import Fixture from "/src/stories/PluginWorkspaceDemo.svelte";
// Complete host entry evaluation before the archive imports shared host chunks.
async function startArchive() {
  const archiveUrl = "/registry-plugin/main.mjs";
  const archive = await import(/* @vite-ignore */ archiveUrl);
  const root = document.getElementById("storybook-root");
  const fixture = mount(Fixture, { target: root, props: { pluginClass: archive.default } });
  root.__archiveClass = archive.default;
  root.__disposeArchive = () => unmount(fixture);
}
void startArchive().catch(error => { queueMicrotask(() => { throw error; }); });
`,
  );
  const hosts = {
    name: "registry-archive-host-map",
    resolveId(id) {
      return hostIds.has(id) ? `\0${id}` : null;
    },
    load(id) {
      const name = hostIds.get(id.slice(1));
      if (!name) return null;
      return `export * from ${JSON.stringify(name)};${pluginHostModuleRegistry[name].defaultExport ? `export {default} from ${JSON.stringify(name)};` : ""}`;
    },
    configureServer(server) {
      server.middlewares.use(serveArchive);
    },
  };
  const { default: storybook } = await import("../.storybook/main.ts");
  // Reuse the governed host configuration, including its public package and
  // worker optimizer boundaries. The archive route remains untransformed.
  const config = await storybook.viteFinal({
    root,
    configFile: false,
    publicDir: false,
    plugins: [
      hosts,
      rendererHostModulePlugin({
        mode: "host",
        svelteVersion: createRequire(import.meta.url)("svelte/package.json")
          .version,
      }),
      tursoBundleBuildPlugin(),
    ],
    resolve: {
      dedupe: [
        "svelte",
        "@lapis-notes/api",
        "@lapismd/design-core",
        "@codemirror/state",
        "@codemirror/view",
      ],
    },
    server: { host: "127.0.0.1", port: 0, fs: { allow: [root] } },
    logLevel: "warn",
  });
  const dev = await createServer(config);
  try {
    await dev.listen();
    console.log("Starting cold development archive host.");
    await check(
      `http://127.0.0.1:${dev.httpServer.address().port}/.release/registry-smoke/index.html`,
      "development",
    );
  } finally {
    await dev.close();
  }
  const outDir = join(root, ".release/registry-smoke-static");
  await build({
    ...config,
    build: {
      outDir,
      emptyOutDir: true,
      target: "es2022",
      rollupOptions: {
        preserveEntrySignatures: "strict",
        input: {
          app: join(smokeRoot, "index.html"),
          ...Object.fromEntries(
            [...hostIds.keys()].map((url, i) => [`registry-host-${i}`, url]),
          ),
        },
        output: { entryFileNames: "[name].js" },
      },
    },
  });
  const prod = httpServer((request, response) => {
    serveArchive(request, response, async () => {
      try {
        const file = resolve(
          outDir,
          "." + new URL(request.url, "http://localhost").pathname,
        );
        if (!file.startsWith(outDir + sep)) throw Error("Unsafe path");
        response.setHeader("Content-Type", contentType(file));
        response.end(await readFile(file));
      } catch {
        response.writeHead(404).end();
      }
    });
  });
  try {
    await new Promise((done) => prod.listen(0, "127.0.0.1", done));
    await check(
      `http://127.0.0.1:${prod.address().port}/.release/registry-smoke/index.html`,
      "production",
    );
  } finally {
    prod.closeAllConnections();
    await new Promise((done) => prod.close(done));
  }

  function serveArchive(request, response, next) {
    const path = new URL(request.url, "http://localhost").pathname;
    if (!path.startsWith("/registry-plugin/")) return next();
    const bytes = files.get(path.slice("/registry-plugin/".length));
    if (!bytes) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("Content-Type", contentType(path));
    response.end(bytes);
  }
  async function check(url, mode) {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 800 },
    });
    const errors = [];
    page.on("pageerror", (error) =>
      errors.push(error.stack || error.message || String(error)),
    );
    page.on("console", (message) => {
      if (
        message.type() === "error" ||
        (message.type() === "warning" &&
          /svelte|lifecycle|context/i.test(message.text()))
      )
        errors.push(message.text());
    });
    try {
      await page.goto(url);
      await page.waitForSelector(
        '[data-testid="plugin-workspace-demo"][data-status="ready"]',
        { timeout: 30_000 },
      );
      if (
        !(await page.evaluate(() => {
          const root = document.getElementById("storybook-root");
          return (
            root
              .querySelector('[data-testid="plugin-workspace-demo"]')
              .__lapisApp.plugins.plugins.get("tasks").constructor ===
            root.__archiveClass
          );
        }))
      )
        throw Error("Fixture did not load the actual archive class");
      await page
        .getByRole("button", {
          name: "Open task details for Review interview notes",
          exact: true,
        })
        .click();
      await page.waitForSelector("[data-task-sidebar-detail]");
      await page.evaluate(() =>
        document.getElementById("storybook-root").__disposeArchive(),
      );
      await page.waitForSelector('[data-testid="plugin-workspace-demo"]', {
        state: "detached",
      });
      await page.waitForTimeout(100);
    } catch (error) {
      throw new Error(
        `${mode} archive host failed: ${error.message}\n${errors.join("\n")}\n${await page.locator("body").innerText()}`,
        { cause: error },
      );
    } finally {
      await page.close();
    }
    if (errors.length) throw Error(errors.join("\n"));
    console.log(
      `Cold ${mode} archive host: actual TasksPlugin, planner, details and teardown passed.`,
    );
  }
} finally {
  await browser.close();
  await rm(work, { recursive: true, force: true });
}

function contentType(file) {
  return (
    {
      ".mjs": "text/javascript",
      ".js": "text/javascript",
      ".css": "text/css",
      ".html": "text/html",
      ".woff2": "font/woff2",
      ".svg": "image/svg+xml",
    }[extname(file)] ?? "application/octet-stream"
  );
}
