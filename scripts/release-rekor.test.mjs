import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  attest,
  integrity,
  packageName,
  verifyProvenanceSigner,
} from "./release.mjs";

const control = vi.hoisted(() => ({ url: "", witness: [], signer: [] }));
const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/design-core-0.7.1-provenance.json", import.meta.url),
    "utf8",
  ),
);

// Keep real bundle construction, Rekor transport and verification. Only signing
// replays a public fixture signature, and Rekor's URL is fenced to local HTTP.
vi.mock("@sigstore/sign", async (original) => {
  const sdk = await original();
  const { readFileSync } = await import("node:fs");
  const { X509Certificate } = await import("node:crypto");
  const bundle = JSON.parse(
    readFileSync(
      new URL("./fixtures/design-core-0.7.1-provenance.json", import.meta.url),
      "utf8",
    ),
  );
  return {
    ...sdk,
    FulcioSigner: class {
      constructor(options) {
        control.signer.push(options);
      }
      async sign() {
        return {
          signature: Buffer.from(
            bundle.dsseEnvelope.signatures[0].sig,
            "base64",
          ),
          key: {
            $case: "x509Certificate",
            certificate: new X509Certificate(
              Buffer.from(
                bundle.verificationMaterial.certificate.rawBytes,
                "base64",
              ),
            ).toString(),
          },
        };
      }
    },
    RekorWitness: class extends sdk.RekorWitness {
      constructor(options) {
        control.witness.push(options);
        super({ ...options, rekorBaseURL: control.url, retry: 0 });
      }
    },
  };
});

vi.mock("sigstore", async (original) => {
  const sdk = await original();
  return {
    ...sdk,
    verify: vi.fn(sdk.verify),
    // Reproduce the installed high-level API's explicit fatal-conflict setting.
    attest: async (data, type) => {
      const sign = await import("@sigstore/sign");
      const { bundleToJSON } = await import("@sigstore/bundle");
      return bundleToJSON(
        await new sign.DSSEBundleBuilder({
          signer: new sign.FulcioSigner({
            identityProvider: new sign.CIContextProvider("sigstore"),
          }),
          witnesses: [
            new sign.RekorWitness({
              fetchOnConflict: false,
              entryType: "dsse",
            }),
          ],
        }).create({ data, type }),
      );
    },
  };
});

let server, root, requests;
let mode = "conflict";
function entry() {
  const t = fixture.verificationMaterial.tlogEntries[0];
  const p = t.inclusionProof;
  return {
    body: t.canonicalizedBody,
    integratedTime: Number(t.integratedTime),
    logIndex: Number(t.logIndex),
    logID: Buffer.from(t.logId.keyId, "base64").toString("hex"),
    verification: {
      signedEntryTimestamp: t.inclusionPromise.signedEntryTimestamp,
      inclusionProof: {
        logIndex: Number(p.logIndex),
        treeSize: Number(p.treeSize),
        rootHash: Buffer.from(p.rootHash, "base64").toString("hex"),
        hashes: p.hashes.map((h) => Buffer.from(h, "base64").toString("hex")),
        checkpoint: p.checkpoint.envelope,
      },
    },
  };
}

beforeEach(async () => {
  requests = [];
  mode = "conflict";
  control.witness = [];
  control.signer = [];
  server = createServer(async (req, res) => {
    for await (const _chunk of req) {
      /* drain the actual SDK request */
    }
    requests.push(`${req.method} ${req.url}`);
    res.setHeader("Content-Type", "application/json");
    if (req.method === "POST") {
      res.statusCode =
        mode === "forbidden" ? 403 : mode === "created" ? 201 : 409;
      if (mode !== "missing-location")
        res.setHeader("Location", "/api/v1/log/entries/fixture-entry");
      res.end(
        JSON.stringify(
          mode === "created"
            ? { "fixture-entry": entry() }
            : { message: "equivalent entry already exists" },
        ),
      );
    } else {
      res.statusCode = mode === "fetch-failure" ? 503 : 200;
      res.end(
        JSON.stringify(
          mode === "malformed" ? {} : { "fixture-entry": entry() },
        ),
      );
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  control.url = `http://127.0.0.1:${server.address().port}`;
  root = await mkdtemp(join(tmpdir(), "tasks-rekor-"));
  await mkdir(join(root, ".release"));
  const bytes = Buffer.from("qualified Tasks package");
  const candidate = {
    schema: 1,
    installation: "frozen-registry",
    name: packageName,
    version: "0.2.1",
    source: "a".repeat(40),
    tarball: "tasks.tgz",
    integrity: integrity(bytes),
    size: bytes.length,
  };
  await writeFile(join(root, ".release/tasks.tgz"), bytes);
  await writeFile(
    join(root, ".release/candidate.json"),
    JSON.stringify(candidate),
  );
  await writeFile(join(root, "package.json"), JSON.stringify(candidate));
  for (const [key, value] of Object.entries({
    GITHUB_SHA: candidate.source,
    GITHUB_REPOSITORY: "lapismd/lapis-plugin-tasks",
    GITHUB_REF: "refs/heads/main",
    GITHUB_RUN_ID: "123",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_WORKFLOW_REF:
      "lapismd/lapis-plugin-tasks/.github/workflows/ci.yml@refs/heads/main",
    GITHUB_REPOSITORY_ID: "1440023837",
    GITHUB_REPOSITORY_OWNER_ID: "311425888",
    GITHUB_EVENT_NAME: "push",
  }))
    vi.stubEnv(key, value);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
  );
});
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
});

it("recovers the real SDK duplicate entry before refusing a foreign or mismatched subject", async () => {
  await expect(attest(root)).rejects.toThrow();
  expect(requests).toEqual([
    "POST /api/v1/log/entries",
    "GET /api/v1/log/entries/fixture-entry",
  ]);
  for (const file of ["provenance.sigstore.json", "provenance.statement.json"])
    await expect(access(join(root, ".release", file))).rejects.toThrow();
}, 30_000);

async function replay() {
  const { attestWithRecovery } = await import("./release-sigstore.mjs");
  return attestWithRecovery(
    Buffer.from(fixture.dsseEnvelope.payload, "base64"),
    fixture.dsseEnvelope.payloadType,
  );
}

it("keeps a cryptographically valid bundle across creation and equivalent-entry recovery", async () => {
  const { verify } = await import("sigstore");
  mode = "created";
  const created = await replay();
  mode = "conflict";
  const recovered = await replay();
  expect(recovered).toEqual(created);
  const signer = await verify(recovered);
  expect(signer.identity.subjectAlternativeName).toBe(
    "https://github.com/lapismd/design-core/.github/workflows/release.yml@refs/heads/main",
  );
  await expect(verifyProvenanceSigner(recovered)).rejects.toThrow(
    /certificate identity|signer does not match/,
  );
  expect(requests).toEqual([
    "POST /api/v1/log/entries",
    "POST /api/v1/log/entries",
    "GET /api/v1/log/entries/fixture-entry",
  ]);
  expect(control.witness[0]).toEqual({
    rekorBaseURL: "https://rekor.sigstore.dev",
    entryType: "dsse",
    fetchOnConflict: true,
    retry: { retries: 2 },
    timeout: 5000,
  });
  expect(control.signer[0]).toMatchObject({
    fulcioBaseURL: "https://fulcio.sigstore.dev",
    retry: { retries: 2 },
    timeout: 5000,
    identityProvider: { audience: "sigstore" },
  });
}, 30_000);

it.each(["missing-location", "forbidden"])(
  "leaves %s fatal without a recovery fetch",
  async (scenario) => {
    mode = scenario;
    await expect(replay()).rejects.toMatchObject({
      code: "TLOG_CREATE_ENTRY_ERROR",
    });
    expect(requests).toEqual(["POST /api/v1/log/entries"]);
  },
);

it.each(["fetch-failure", "malformed"])(
  "leaves a %s recovery response fatal",
  async (scenario) => {
    mode = scenario;
    await expect(replay()).rejects.toMatchObject({
      code: "TLOG_FETCH_ENTRY_ERROR",
    });
    expect(requests).toEqual([
      "POST /api/v1/log/entries",
      "GET /api/v1/log/entries/fixture-entry",
    ]);
  },
);

it("still rejects changed subjects and changed fetched transparency evidence", async () => {
  const { verify } = await import("sigstore");
  const recovered = await replay();
  const subject = structuredClone(recovered);
  subject.dsseEnvelope.payload =
    Buffer.from('{"subject":[]}').toString("base64");
  await expect(verify(subject)).rejects.toThrow();
  const evidence = structuredClone(recovered);
  const body = JSON.parse(
    Buffer.from(
      evidence.verificationMaterial.tlogEntries[0].canonicalizedBody,
      "base64",
    ),
  );
  body.spec.payloadHash.value = "0".repeat(64);
  evidence.verificationMaterial.tlogEntries[0].canonicalizedBody = Buffer.from(
    JSON.stringify(body),
  ).toString("base64");
  await expect(verify(evidence)).rejects.toThrow();
}, 30_000);
