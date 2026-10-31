import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  integrity,
  packageName,
  validateCandidate,
  validateIdentity,
  verifyRegistryIdentity,
  provenanceStatement,
  validateExistingRelease,
  prepare,
  verifyProvenanceSigner,
} from "./release.mjs";

describe("Tasks immutable npm release boundary", () => {
  const bytes = Buffer.from("qualified package bytes");
  const source = "a".repeat(40);
  const candidate = {
    schema: 1,
    installation: "frozen-registry",
    name: packageName,
    version: "0.1.1",
    source,
    tarball: "tasks-0.1.1.tgz",
    integrity: integrity(bytes),
    size: bytes.length,
  };
  const metadata = {
    name: packageName,
    version: "0.1.1",
    dist: {
      integrity: candidate.integrity,
      attestations: {
        provenance: { predicateType: "https://slsa.dev/provenance/v1" },
      },
    },
  };

  it("refuses temporary archive dependencies before preparing a publishable artifact", async () => {
    vi.stubEnv("LAPIS_TASKS_VALIDATION_WORKER", "1");
    vi.stubEnv("LAPIS_TASKS_VALIDATION_ARCHIVE_COUNT", "1");
    try {
      await expect(prepare("/unused-validation-root")).rejects.toThrow(
        "registry-only",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("rejects stale source, changed bytes and path traversal before publication", () => {
    expect(() => validateCandidate(candidate, source, bytes)).not.toThrow();
    for (const patch of [
      { installation: "temporary-archive" },
      { source: "b".repeat(40) },
      { integrity: integrity(Buffer.from("changed")) },
      { size: 1 },
      { tarball: "../tasks.tgz" },
      { name: "other-package" },
    ])
      expect(() =>
        validateCandidate({ ...candidate, ...patch }, source, bytes),
      ).toThrow();
    expect(() =>
      validateCandidate(candidate, source, Buffer.from("changed")),
    ).toThrow();
  });

  it("requires package and runtime identity agreement and portable runtime dependencies", () => {
    const pkg = {
      name: packageName,
      version: "0.1.1",
      dependencies: { "@lapis-notes/api": "^0.2.0" },
    };
    const manifest = {
      id: "tasks",
      version: "0.1.1",
      distribution: "first-party-external",
    };
    expect(() => validateIdentity(pkg, manifest)).not.toThrow();
    expect(() =>
      validateIdentity(pkg, { ...manifest, version: "0.1.0" }),
    ).toThrow();
    expect(() =>
      validateIdentity({ ...pkg, private: true }, manifest),
    ).toThrow();
    for (const range of [
      "workspace:*",
      "file:../api",
      "link:../api",
      "git+https://example.test/api.git",
      "/Users/example/api",
    ])
      expect(() =>
        validateIdentity({ ...pkg, dependencies: { api: range } }, manifest),
      ).toThrow();
  });

  it("requires exact downloadable bytes and published provenance", () => {
    expect(() =>
      verifyRegistryIdentity(candidate, metadata, bytes),
    ).not.toThrow();
    expect(() =>
      verifyRegistryIdentity(
        candidate,
        { ...metadata, version: "0.1.0" },
        bytes,
      ),
    ).toThrow();
    expect(() =>
      verifyRegistryIdentity(candidate, metadata, Buffer.from("different")),
    ).toThrow();
    expect(() =>
      verifyRegistryIdentity(
        candidate,
        { ...metadata, dist: { integrity: candidate.integrity } },
        bytes,
      ),
    ).toThrow("provenance");
  });

  it("retries identical published bytes without moving the original release source", () => {
    const release = { targetCommitish: "b".repeat(40) };
    expect(() =>
      validateExistingRelease(candidate, metadata, release),
    ).not.toThrow();
    expect(() => validateExistingRelease(candidate, null, release)).toThrow(
      "different source",
    );
    expect(() =>
      validateExistingRelease(
        candidate,
        { ...metadata, dist: { integrity: "changed" } },
        release,
      ),
    ).toThrow("different bytes");
  });

  it("signs one npm PURL and tarball digest only in the qualified main workflow", () => {
    const env = {
      GITHUB_REPOSITORY: "lapismd/lapis-plugin-tasks",
      GITHUB_REF: "refs/heads/main",
      GITHUB_SHA: source,
      GITHUB_WORKFLOW_REF:
        "lapismd/lapis-plugin-tasks/.github/workflows/ci.yml@refs/heads/main",
      GITHUB_RUN_ID: "123",
      GITHUB_RUN_ATTEMPT: "2",
    };
    const statement = provenanceStatement(candidate, env);
    expect(statement.subject).toEqual([
      {
        name: "pkg:npm/%40lapis-notes/lapis-plugin-tasks@0.1.1",
        digest: {
          sha512: Buffer.from(candidate.integrity.slice(7), "base64").toString(
            "hex",
          ),
        },
      },
    ]);
    expect(
      statement.predicate.buildDefinition.resolvedDependencies[0].digest
        .gitCommit,
    ).toBe(source);
    for (const patch of [
      { GITHUB_REF: "refs/heads/feature" },
      { GITHUB_SHA: "b".repeat(40) },
      { GITHUB_WORKFLOW_REF: "different" },
      { GITHUB_RUN_ID: "" },
    ])
      expect(() =>
        provenanceStatement(candidate, { ...env, ...patch }),
      ).toThrow();
  });
  it("rejects a cryptographically valid foreign workflow provenance", async () => {
    const { verify } = await import("sigstore");
    const bundle = JSON.parse(
      readFileSync(
        new URL(
          "./fixtures/design-core-0.7.1-provenance.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const signer = await verify(bundle);
    expect(signer.identity.subjectAlternativeName).toBe(
      "https://github.com/lapismd/design-core/.github/workflows/release.yml@refs/heads/main",
    );
    await expect(verifyProvenanceSigner(bundle)).rejects.toThrow(
      /certificate identity|signer does not match/,
    );
    const tampered = structuredClone(bundle);
    tampered.dsseEnvelope.payload = Buffer.from("{}").toString("base64");
    await expect(verifyProvenanceSigner(tampered)).rejects.toThrow();
  }, 30_000);
});
