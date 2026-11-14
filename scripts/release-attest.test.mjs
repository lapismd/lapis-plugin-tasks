import { mkdtemp, mkdir, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { attest, integrity, packageName } from "./release.mjs";

const signing = vi.hoisted(() => ({ attest: vi.fn(), verify: vi.fn() }));
vi.mock("sigstore", () => signing);
let root;
let metadata;

beforeEach(async () => {
  vi.resetAllMocks();
  root = await mkdtemp(join(tmpdir(), "tasks-attestation-"));
  await mkdir(join(root, ".release"));
  const bytes = Buffer.from("qualified Tasks package");
  const candidate = {
    schema: 1, installation: "frozen-registry", name: packageName,
    version: "0.1.2", source: "a".repeat(40), tarball: "tasks.tgz",
    integrity: integrity(bytes), size: bytes.length,
  };
  await writeFile(join(root, ".release/tasks.tgz"), bytes);
  await writeFile(join(root, ".release/candidate.json"), JSON.stringify(candidate));
  await writeFile(join(root, "package.json"), JSON.stringify(candidate));
  metadata = { name: packageName, version: candidate.version, dist: { integrity: candidate.integrity } };
  const env = {
    GITHUB_SHA: candidate.source, GITHUB_REPOSITORY: "lapismd/lapis-plugin-tasks",
    GITHUB_REF: "refs/heads/main", GITHUB_RUN_ID: "123", GITHUB_RUN_ATTEMPT: "1",
    GITHUB_WORKFLOW_REF: "lapismd/lapis-plugin-tasks/.github/workflows/ci.yml@refs/heads/main",
    GITHUB_REPOSITORY_ID: "1440023837", GITHUB_REPOSITORY_OWNER_ID: "311425888",
    GITHUB_EVENT_NAME: "push",
  };
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  signing.attest.mockResolvedValue({ mediaType: "test bundle" });
  signing.verify.mockResolvedValue({ identity: {
    extensions: { issuer: "https://token.actions.githubusercontent.com" },
    subjectAlternativeName: "https://github.com/lapismd/lapis-plugin-tasks/.github/workflows/ci.yml@refs/heads/main",
  } });
});

afterEach(async () => {
  vi.unstubAllEnvs(); vi.unstubAllGlobals();
  await rm(root, { recursive: true, force: true });
});

it.each([false, true])("does not sign an existing version when candidate bytes differ: %s", async (different) => {
  if (different) metadata.dist.integrity = "different published bytes";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(metadata))));
  await attest(root);
  expect(signing.attest).not.toHaveBeenCalled();
  expect(signing.verify).not.toHaveBeenCalled();
  await expect(access(join(root, ".release/provenance.sigstore.json"))).rejects.toThrow();
});

it("signs and verifies a new version only after a registry 404", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
  await attest(root);
  expect(signing.attest).toHaveBeenCalledOnce();
  expect(signing.verify).toHaveBeenCalledOnce();
  await expect(access(join(root, ".release/provenance.sigstore.json"))).resolves.toBeUndefined();
});

it.each([403, 429, 503])("fails closed before signing on registry HTTP %s", async (status) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
  await expect(attest(root)).rejects.toThrow(`npm metadata request failed: ${status}`);
  expect(signing.attest).not.toHaveBeenCalled();
});

it.each(["{}", "null", "false"])("rejects malformed registry metadata %s without signing", async (body) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
  await expect(attest(root)).rejects.toThrow("npm metadata identity mismatch");
  expect(signing.attest).not.toHaveBeenCalled();
});
