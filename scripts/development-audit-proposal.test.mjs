import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import YAML from "yaml";
const read = (path) =>
  readFileSync(new URL("../" + path, import.meta.url), "utf8");
const proposal = JSON.parse(
  read(".github/development-audit-high-proposal.json"),
);
const active = JSON.parse(read(".github/development-audit.json"));
const workflow = YAML.parse(read(".github/workflows/ci.yml"));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const pin = "63e64958e9b271d36feba06a162ee02b079a3206";

describe("exact disabled development HIGH proposal", () => {
  it("requires a separate exact decision beyond the disabled proposal", () => {
    expect(proposal.status).toBe("disabled");
    expect(proposal.approvedAt).toBeNull();
    expect(proposal.authority).toBeNull();
    expect(proposal.expiresAt).toBe("2026-11-19T00:00:00.000Z");
    expect(active.schemaVersion).toBe(2);
    expect(active.repository).toBe("lapismd/lapis-plugin-tasks");
    const high = active.approvals.filter((entry) => entry.severity === "high");
    const decision = new URL("../" + proposal.decisionRecord, import.meta.url);
    if (!high.length) expect(high).toEqual([]);
    else {
      expect(existsSync(decision)).toBe(true);
      expect(high).toHaveLength(1);
      expect(high[0]).toMatchObject({
        ...proposal.finding,
        sourceSha: proposal.bindings.sourceSha,
        manifestSha256: proposal.bindings.manifestSha256,
        lockSha256: proposal.bindings.lockSha256,
        authority: "explicit-user",
        expiresAt: proposal.expiresAt,
        record: proposal.decisionRecord,
      });
      expect(Number.isFinite(Date.parse(high[0].approvedAt))).toBe(true);
      expect(
        Date.parse(high[0].expiresAt) - Date.parse(high[0].approvedAt),
      ).toBeGreaterThan(0);
      expect(
        Date.parse(high[0].expiresAt) - Date.parse(high[0].approvedAt),
      ).toBeLessThanOrEqual(48 * 60 * 60 * 1000);
    }
  });
  it("binds actual manifest, lock and workspace without changing them", () => {
    for (const [path, field] of [
      ["package.json", "manifestSha256"],
      ["pnpm-lock.yaml", "lockSha256"],
      ["pnpm-workspace.yaml", "workspaceSha256"],
    ])
      expect(proposal.bindings[field]).toBe(hash(read(path)));
    expect(proposal.bindings.sourceSha).toBe(
      "a86b18bde00a8cb744518ad65d46d4fa87da8ecb",
    );
    expect(proposal.repository).toBe(active.repository);
  });
  it("retains the exact observed advisory version/path and complete raw counts", () => {
    expect(proposal.finding).toEqual({
      advisory: "GHSA-fc5q-39xc-vjpf",
      package: "picomatch",
      version: "4.0.7",
      severity: "high",
      path: ".>@changesets/cli>@changesets/config>picomatch",
      scope: "development-only",
      vulnerableRange: "<=4.0.7",
      patchedRange: "<0.0.0",
    });
    const full = JSON.parse(read("scripts/fixtures/development-high-all.json"));
    const production = JSON.parse(
      read("scripts/fixtures/development-high-production.json"),
    );
    expect(full.muted).toEqual([]);
    expect(production.muted).toEqual([]);
    expect(full.metadata.vulnerabilities).toEqual({
      info: 0,
      low: 0,
      moderate: 0,
      high: 1,
      critical: 0,
    });
    expect(production.metadata.vulnerabilities).toEqual({
      info: 0,
      low: 0,
      moderate: 0,
      high: 0,
      critical: 0,
    });
    expect(Object.values(full.advisories)).toHaveLength(1);
    expect(Object.values(full.advisories)[0].findings).toEqual([
      { version: "4.0.7", paths: [proposal.finding.path] },
    ]);
    expect(proposal.rawFullCounts).toEqual(full.metadata.vulnerabilities);
    expect(proposal.rawProductionCounts).toEqual(
      production.metadata.vulnerabilities,
    );
  });
  it("runs reviewed shared code with no ignored failure or extra authority", () => {
    const job = workflow.jobs.audit;
    const audit = job.steps.find((step) =>
      step.uses?.startsWith(
        "lapismd/lapis-ci/actions/check-development-audit@",
      ),
    );
    expect(audit.uses).toBe(
      "lapismd/lapis-ci/actions/check-development-audit@" + pin,
    );
    expect(proposal.collector.revision).toBe(pin);
    expect(audit.with).toEqual({
      "policy-file": ".github/development-audit.json",
    });
    expect(audit.if).toBeUndefined();
    expect(audit["continue-on-error"]).toBeUndefined();
    expect(workflow.jobs.validate.needs).toContain("audit");
    const artifact = job.steps.find(
      (step) => step.with?.path === ".local/dependency-audit/",
    );
    expect(artifact.if).toBe("always()");
    expect(artifact.with["include-hidden-files"]).toBe(true);
    expect(job.steps.some((step) => step.run === "pnpm audit --prod")).toBe(
      true,
    );
  });
  it("retains the actual blocked pre-approval collector receipt", () => {
    const decision = JSON.parse(
      read("scripts/fixtures/development-high-blocked-decision.json"),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.status).toBe("blocked");
    expect(decision.reason).toBe("unapproved-finding");
    expect(decision.accepted).toEqual([]);
    expect(decision.sourceSha).toBe(proposal.bindings.sourceSha);
    expect(decision.manifestSha256).toBe(proposal.bindings.manifestSha256);
    expect(decision.lockSha256).toBe(proposal.bindings.lockSha256);
    expect(decision.rawFullExitCode).toBe(1);
    expect(decision.rawProductionExitCode).toBe(0);
    expect(decision.rawVulnerabilities).toEqual(proposal.rawFullCounts);
    expect(decision.productionVulnerabilities).toEqual(
      proposal.rawProductionCounts,
    );
  });
  it("covers every original graph-audit route without a second raw full gate", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(
      Object.values(pkg.scripts).some((command) =>
        /\bpnpm\s+audit\b/u.test(command),
      ),
    ).toBe(false);
    const steps = Object.values(workflow.jobs).flatMap(
      (job) => job.steps ?? [],
    );
    expect(steps.filter((step) => step.run === "pnpm audit")).toEqual([]);
    expect(
      steps.filter((step) =>
        step.uses?.startsWith(
          "lapismd/lapis-ci/actions/check-development-audit@",
        ),
      ),
    ).toHaveLength(1);
    expect(
      steps.filter((step) => step.run === "pnpm audit --prod"),
    ).toHaveLength(1);
    const release = read("scripts/release.mjs");
    expect(release).not.toMatch(/run\("pnpm",\s*\["audit"/u);
    expect(release).toContain('run("npm", ["audit", "signatures"]');
  });
  it("retains existing LOW policy separately", () => {
    expect(
      active.approvals.filter((entry) => entry.severity === "low"),
    ).toEqual([]);
    expect(
      YAML.parse(read("pnpm-workspace.yaml")).auditConfig.ignoreGhsas,
    ).toEqual(["GHSA-gcqx-w48m-w2h4"]);
    expect(workflow.jobs.audit.steps[0].with["fetch-depth"]).toBe(0);
  });
});
