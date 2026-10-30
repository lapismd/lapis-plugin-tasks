import { readFileSync } from "node:fs";
import {
  defineConfig,
  singleIdVerification,
  tableRequirements,
} from "@lapismd/spec-validator";

export default defineConfig(tableRequirements(), {
  name: "lapis-plugin-tasks",
  idPattern: /^(?:LN-TASK|LPT-SPEC)-\d{3}$/,
  ruleIds: {
    summary: "LPT-SPEC-001",
    governance: "LPT-SPEC-003",
    verification: "LPT-SPEC-003",
    book: "LPT-SPEC-001",
    bookIgnore: "LPT-SPEC-001",
    packageManifest: "LN-TASK-001",
    storybookMirrors: "LPT-SPEC-009",
    specFirst: "LPT-SPEC-002",
    internal: "LPT-SPEC-003",
    qmd: "LPT-SPEC-020",
  },
  diagnostics: {
    "SPEC-PKG-PORTABLE": "LPT-SPEC-004",
    "SPEC-PKG-MANIFEST-MISSING": "LN-TASK-001",
    "SPEC-PKG-MANIFEST": "LN-TASK-001",
    "TASKS-STORY-TAXONOMY": "LPT-SPEC-008",
  },
  validators: {
    summary: true,
    governance: {
      acceptance: false,
      normative: true,
      proseLimits: false,
      references: true,
      changeMap: false,
    },
    verification: singleIdVerification({
      headers: {
        ids: ["ID"],
        status: ["Status"],
        evidence: ["Evidence"],
        required: [],
      },
      statuses: ["Implemented", "In progress", "Planned", "Visual pending"],
    }),
    book: true,
    qmd: { collection: "lapis-tasks-spec", configPath: ".qmd/index.yml" },
    storybookMirrors: {
      style: "src-spec-mdx",
      directory: "stories/spec",
      titlePrefix: "Specification",
      verifyTarget: true,
      verifyTitle: true,
      verifyContent: true,
      previewPath: ".storybook/preview.ts",
      verifyOrder: true,
    },
    packageManifest: {
      name: "@lapis-notes/lapis-plugin-tasks",
      version: JSON.parse(
        readFileSync(new URL("./package.json", import.meta.url), "utf8"),
      ).version,
      privateAllowed: false,
      portableDependencies: true,
      manifestPath: "manifest.json",
      manifest: {
        id: "tasks",
        distribution: "first-party-external",
        provenance: "official",
        enabledByDefault: true,
      },
    },
    specFirst: {
      mode: "mapped",
      canonicalPattern:
        "^spec/src/(?:plugins/(?:index|tasks/(?:index|documents|runtime|lists|planner))|spec-governance)\\.md$",
      ignore: [
        "(^|/)node_modules/",
        "(^|/)(?:dist|build|storybook-static)/",
        "^spec/book/",
        "^spec/src/(?:SUMMARY|verification)\\.md$",
        "\\.(?:spec|test)\\.[cm]?[jt]sx?$",
      ],
      rules: [
        {
          pattern: "^stories/catalog/",
          chapters: ["spec/src/spec-governance.md"],
        },
        {
          pattern: "^crates/lapis-task-services/",
          chapters: ["spec/src/plugins/tasks/runtime.md"],
        },
        {
          pattern: "^src/lib/model/(?:task-document|task-index)\\.",
          chapters: ["spec/src/plugins/tasks/documents.md"],
        },
        {
          pattern:
            "^src/lib/model/(?:task-projection|task-queries|task-repository|vault-task-file-store|task-mutations)\\.",
          chapters: ["spec/src/plugins/tasks/runtime.md"],
        },
        {
          pattern: "^src/lib/model/(?:list-navigation|apply-catalog-task)\\.",
          chapters: ["spec/src/plugins/tasks/lists.md"],
        },
        {
          pattern:
            "^(?:src/lib/model/planner\\.|src/lib/tasks-view\\.|src/lib/tasks-workspace\\.svelte$|src/lib/tasks/)",
          chapters: ["spec/src/plugins/tasks/planner.md"],
        },
        {
          pattern:
            "^(?:package\\.json$|manifest\\.json$|\\.storybook/|src/(?!lib/model/(?:task-document|task-index|task-projection|task-queries|task-repository|vault-task-file-store|task-mutations|list-navigation|apply-catalog-task|planner)\\.|lib/tasks-view\\.|lib/tasks-workspace\\.svelte$|lib/tasks/))",
          chapters: ["spec/src/plugins/tasks/index.md"],
        },
        {
          pattern:
            "^(?:pnpm-|scripts/|\\.github/|AGENTS\\.md$|spec-validator\\.config\\.mjs$)",
          chapters: ["spec/src/spec-governance.md"],
        },
      ],
      protected: [
        "^(?:package\\.json$|manifest\\.json$|src/|crates/|stories/catalog/|\\.storybook/|pnpm-|scripts/|\\.github/|AGENTS\\.md$|spec-validator\\.config\\.mjs$)",
      ],
    },
  },
  plugins: [
    "scripts/spec-validation/storybook-taxonomy-audit.mjs",
    "scripts/spec-validation/storybook-parity.mjs",
    "scripts/spec-validation/validation-routing.mjs",
  ],
});
