import { isAbsolute, basename } from "node:path";
import { pathToFileURL } from "node:url";

export const TASKS_READINESS_BUDGET_MS = 300000;
export const TASKS_NPM_VERSION = "12.0.2";
export async function loadTasksReadiness(
  modulePath = process.env.LAPIS_REGISTRY_READINESS_MODULE,
) {
  if (
    !modulePath ||
    !isAbsolute(modulePath) ||
    basename(modulePath) !== "registry-readiness.mjs"
  )
    throw Error(
      "Tasks verification requires the source-pinned shared registry readiness setup",
    );
  const api = await import(pathToFileURL(modulePath).href);
  if (
    typeof api.installPublishedConsumer !== "function" ||
    typeof api.registryInstaller !== "function"
  )
    throw Error("Shared registry readiness contract is unavailable");
  return api;
}
export async function installTasksConsumer(
  { cwd, candidate, metadata, published, budgetMs = TASKS_READINESS_BUDGET_MS },
  readiness,
) {
  if (
    candidate.name !== "@lapis-notes/lapis-plugin-tasks" ||
    metadata.name !== candidate.name ||
    metadata.version !== candidate.version ||
    !/^sha512-[A-Za-z0-9+/]{86}==$/.test(published?.integrity ?? "") ||
    metadata.dist?.integrity !== published.integrity
  )
    throw Error(
      "Installation readiness requires the independently verified published Tasks identity",
    );
  if (
    !Number.isSafeInteger(budgetMs) ||
    budgetMs < 1 ||
    budgetMs > TASKS_READINESS_BUDGET_MS
  )
    throw Error("Tasks registry readiness budget is exhausted or invalid");
  readiness ??= await loadTasksReadiness();
  await readiness.installPublishedConsumer({
    cwd,
    entries: [
      {
        name: metadata.name,
        version: metadata.version,
        integrity: published.integrity,
      },
    ],
    registry: "https://registry.npmjs.org",
    policy: {
      budgetMs,
      delaysMs: Array(60)
        .fill(5000)
        .filter((delay) => delay < budgetMs),
    },
    installer: readiness.registryInstaller(
      "npm12-strict-peers",
      TASKS_NPM_VERSION,
    ),
  });
}
