import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const packageName = "@lapis-notes/lapis-plugin-tasks";
export const integrity = (bytes) =>
  "sha512-" + createHash("sha512").update(bytes).digest("base64");
const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: "inherit", ...options });
const output = (command, args, options = {}) =>
  run(command, args, { encoding: "utf8", stdio: "pipe", ...options }).trim();
const json = async (path) => JSON.parse(await readFile(path, "utf8"));

export function validateIdentity(pkg, manifest) {
  if (
    pkg.name !== packageName ||
    pkg.private ||
    !/^\d+\.\d+\.\d+$/.test(pkg.version) ||
    pkg.version !== manifest.version ||
    manifest.id !== "tasks" ||
    manifest.distribution !== "first-party-external"
  )
    throw Error("Tasks public package/runtime manifest identity mismatch");
  for (const field of [
    "dependencies",
    "peerDependencies",
    "optionalDependencies",
  ])
    for (const [name, range] of Object.entries(pkg[field] ?? {}))
      if (
        !/^[~^\d*><=| ]/.test(range) ||
        /(?:file:|link:|workspace:|git|\/Users\/)/.test(range)
      )
        throw Error(`Non-registry dependency: ${name}`);
}

export function validateCandidate(candidate, source, bytes) {
  if (
    candidate.schema !== 1 ||
    candidate.installation !== "frozen-registry" ||
    candidate.name !== packageName ||
    !/^\d+\.\d+\.\d+$/.test(candidate.version) ||
    !/^[a-f0-9]{40}$/.test(candidate.source) ||
    candidate.source !== source ||
    basename(candidate.tarball) !== candidate.tarball ||
    !candidate.tarball.endsWith(".tgz") ||
    candidate.integrity !== integrity(bytes) ||
    candidate.size !== bytes.length
  )
    throw Error("Release candidate source, identity or checksum mismatch");
}

export function verifyRegistryIdentity(candidate, metadata, bytes) {
  if (
    metadata.name !== candidate.name ||
    metadata.version !== candidate.version ||
    metadata.dist?.integrity !== candidate.integrity ||
    integrity(bytes) !== candidate.integrity
  )
    throw Error("Published npm artifact differs from the qualified candidate");
  if (!metadata.dist.attestations?.provenance)
    throw Error("Published npm artifact has no provenance attestation");
}

export function validateExistingRelease(candidate, existing, release) {
  if (existing && existing.dist?.integrity !== candidate.integrity)
    throw Error(
      "Existing npm version has different bytes; immutable version cannot be replaced",
    );
  if (release && !existing && release.targetCommitish !== candidate.source)
    throw Error("Existing GitHub release targets a different source");
}

export function provenanceStatement(candidate, env = process.env) {
  const repository = "https://github.com/lapismd/lapis-plugin-tasks";
  if (
    env.GITHUB_REPOSITORY !== "lapismd/lapis-plugin-tasks" ||
    env.GITHUB_REF !== "refs/heads/main" ||
    env.GITHUB_SHA !== candidate.source ||
    env.GITHUB_WORKFLOW_REF !==
      "lapismd/lapis-plugin-tasks/.github/workflows/ci.yml@refs/heads/main" ||
    !/^\d+$/.test(env.GITHUB_RUN_ID ?? "")
  )
    throw Error(
      "Provenance signing requires the exact qualified main workflow",
    );
  return {
    _type: "https://in-toto.io/Statement/v1",
    subject: [
      {
        name: `pkg:npm/${candidate.name.replace(/^@/, "%40")}@${candidate.version}`,
        digest: {
          sha512: Buffer.from(
            candidate.integrity.slice("sha512-".length),
            "base64",
          ).toString("hex"),
        },
      },
    ],
    predicateType: "https://slsa.dev/provenance/v1",
    predicate: {
      buildDefinition: {
        buildType:
          "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
        externalParameters: {
          workflow: {
            repository,
            ref: env.GITHUB_REF,
            path: ".github/workflows/ci.yml",
          },
        },
        internalParameters: {},
        resolvedDependencies: [
          {
            uri: `git+${repository}@${env.GITHUB_REF}`,
            digest: { gitCommit: candidate.source },
          },
        ],
      },
      runDetails: {
        builder: { id: "https://github.com/actions/runner/github-hosted" },
        metadata: {
          invocationId: `${repository}/actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT ?? "1"}`,
        },
      },
    },
  };
}

export async function verifyProvenanceSigner(bundle) {
  const { verify } = await import("sigstore");
  const signer = await verify(bundle, {
    certificateIssuer: "https://token.actions.githubusercontent.com",
    certificateIdentityURI:
      "^https://github\\.com/lapismd/lapis-plugin-tasks/\\.github/workflows/ci\\.yml@refs/heads/main$",
  });
  if (
    signer?.identity?.extensions?.issuer !==
      "https://token.actions.githubusercontent.com" ||
    signer.identity.subjectAlternativeName !==
      "https://github.com/lapismd/lapis-plugin-tasks/.github/workflows/ci.yml@refs/heads/main"
  )
    throw Error(
      "Provenance signer does not match the qualified Tasks workflow",
    );
  return signer;
}

export async function attest(root = process.cwd()) {
  const { candidate } = await loadCandidate(root);
  const statement = provenanceStatement(candidate);
  const { attest: sign } = await import("sigstore");
  const bundle = await sign(
    Buffer.from(JSON.stringify(statement)),
    "application/vnd.in-toto+json",
  );
  await verifyProvenanceSigner(bundle);
  await writeFile(
    join(root, ".release/provenance.sigstore.json"),
    JSON.stringify(bundle, null, 2) + "\n",
  );
  await writeFile(
    join(root, ".release/provenance.statement.json"),
    JSON.stringify(statement, null, 2) + "\n",
  );
  console.log(
    `Verified CI provenance bundle for ${candidate.name}@${candidate.version}`,
  );
}

export async function version(root = process.cwd()) {
  run("pnpm", ["exec", "changeset", "version"], { cwd: root });
  const pkg = await json(join(root, "package.json"));
  const path = join(root, "manifest.json");
  const manifest = await json(path);
  manifest.version = pkg.version;
  validateIdentity(pkg, manifest);
  await writeFile(path, JSON.stringify(manifest, null, 2) + "\n");
  const chapter = join(root, "spec/src/plugins/tasks/index.md");
  const text = await readFile(chapter, "utf8");
  const marker =
    /Release package and runtime manifest version: `\d+\.\d+\.\d+`\./;
  if (!marker.test(text))
    throw Error("Canonical release version declaration missing");
  await writeFile(
    chapter,
    text.replace(
      marker,
      `Release package and runtime manifest version: \`${pkg.version}\`.`,
    ),
  );
  run("pnpm", ["install", "--lockfile-only", "--ignore-pnpmfile"], {
    cwd: root,
  });
}

export async function prepare(root = process.cwd()) {
  if (process.env.LAPIS_TASKS_VALIDATION_WORKER !== "1")
    throw Error("Release preparation requires the governed Docker worker");
  if (process.env.LAPIS_TASKS_VALIDATION_ARCHIVE_COUNT !== "0")
    throw Error("Release artifacts require frozen registry-only dependencies");
  const pkg = await json(join(root, "package.json"));
  validateIdentity(pkg, await json(join(root, "manifest.json")));
  for (const path of [
    "dist/index.js",
    "dist/index.d.ts",
    "dist/styles.css",
    "LICENSE",
  ])
    if (!existsSync(join(root, path)))
      throw Error(`Release input missing: ${path}`);
  const directory = join(root, ".release");
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  run("npm", ["pack", "--ignore-scripts", "--pack-destination", directory], {
    cwd: root,
  });
  const tarball = `lapis-notes-lapis-plugin-tasks-${pkg.version}.tgz`;
  const path = join(directory, tarball);
  const bytes = await readFile(path);
  const packed = JSON.parse(
    output("tar", ["-xOf", path, "package/package.json"]),
  );
  const manifest = JSON.parse(
    output("tar", ["-xOf", path, "package/manifest.json"]),
  );
  validateIdentity(packed, manifest);
  const files = output("tar", ["-tf", path]).split("\n");
  for (const file of files)
    if (
      !file.startsWith("package/") ||
      /(?:^|\/)(?:node_modules|\.env|\.git|\.local)(?:\/|$)/.test(file) ||
      /\.(?:test|spec|stories)\./.test(file)
    )
      throw Error(`Forbidden npm archive entry: ${file}`);
  const source = output(
    "jj",
    [
      "--ignore-working-copy",
      "log",
      "-r",
      "@",
      "--no-graph",
      "-T",
      "commit_id",
    ],
    { cwd: root },
  );
  const candidate = {
    schema: 1,
    installation: "frozen-registry",
    name: packageName,
    version: pkg.version,
    source,
    tarball,
    integrity: integrity(bytes),
    size: bytes.length,
    files,
  };
  validateCandidate(candidate, source, bytes);
  await writeFile(
    join(directory, "candidate.json"),
    JSON.stringify(candidate, null, 2) + "\n",
  );
  console.log(
    `Qualified npm candidate ${candidate.name}@${candidate.version}: ${candidate.integrity}`,
  );
}

async function loadCandidate(root) {
  const directory = join(root, ".release");
  const candidate = await json(join(directory, "candidate.json"));
  const path = join(directory, candidate.tarball);
  const bytes = await readFile(path);
  const source =
    process.env.GITHUB_SHA ??
    output(
      "jj",
      [
        "--ignore-working-copy",
        "log",
        "-r",
        "@-",
        "--no-graph",
        "-T",
        "commit_id",
      ],
      { cwd: root },
    );
  validateCandidate(candidate, source, bytes);
  const pkg = await json(join(root, "package.json"));
  if (pkg.name !== candidate.name || pkg.version !== candidate.version)
    throw Error("Candidate does not match the checked-out package version");
  return { candidate, path };
}

async function registry(candidate) {
  const response = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(candidate.name)}/${candidate.version}`,
    {
      headers: { "Cache-Control": "no-cache" },
    },
  );
  if (response.status === 404) return null;
  if (!response.ok)
    throw Error(`npm metadata request failed: ${response.status}`);
  return response.json();
}

export async function verify(root = process.cwd()) {
  const { candidate } = await loadCandidate(root);
  let metadata;
  for (let attempt = 0; attempt < 12; attempt++) {
    metadata = await registry(candidate);
    if (metadata) break;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  if (!metadata) throw Error("Published npm version is not downloadable");
  const response = await fetch(metadata.dist?.tarball);
  if (!response.ok)
    throw Error(`npm archive request failed: ${response.status}`);
  verifyRegistryIdentity(
    candidate,
    metadata,
    Buffer.from(await response.arrayBuffer()),
  );
  const consumer = await mkdtemp(join(tmpdir(), "lapis-tasks-npm-consumer-"));
  try {
    await writeFile(
      join(consumer, "package.json"),
      JSON.stringify({
        name: "tasks-clean-registry-acceptance",
        version: "0.0.0",
        private: true,
        dependencies: { [candidate.name]: candidate.version },
      }),
    );
    run(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--registry=https://registry.npmjs.org",
        "--strict-peer-deps",
      ],
      { cwd: consumer },
    );
    run(
      "npm",
      [
        "ci",
        "--ignore-scripts",
        "--registry=https://registry.npmjs.org",
        "--strict-peer-deps",
      ],
      { cwd: consumer },
    );
    run("npm", ["audit", "signatures"], { cwd: consumer });
    run(
      "pnpm",
      ["exec", "publint", join(consumer, "node_modules", candidate.name)],
      { cwd: root },
    );
    await writeFile(
      join(root, ".release/registry-receipt.json"),
      JSON.stringify(
        {
          schema: 1,
          name: candidate.name,
          version: candidate.version,
          source: candidate.source,
          integrity: candidate.integrity,
          tarball: metadata.dist.tarball,
          attestations: metadata.dist.attestations,
          signatures: metadata.dist.signatures,
          verified: new Date().toISOString(),
          cleanConsumer:
            "npm install, frozen npm ci, strict peers, audit signatures and publint",
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
  console.log(`Registry verified ${candidate.name}@${candidate.version}`);
  return candidate;
}

export async function publish(root = process.cwd()) {
  if (
    process.env.LAPIS_TASKS_RELEASE_APPROVED !== "1" ||
    process.env.GITHUB_REF !== "refs/heads/main"
  )
    throw Error(
      "Publication requires the approved main-source release workflow",
    );
  const { candidate, path } = await loadCandidate(root);
  const existing = await registry(candidate);
  const tag = `${candidate.name}@${candidate.version}`;
  let release;
  try {
    release = JSON.parse(
      output("gh", [
        "release",
        "view",
        tag,
        "--repo",
        "lapismd/lapis-plugin-tasks",
        "--json",
        "targetCommitish",
      ]),
    );
  } catch (error) {
    if (!String(error.stderr ?? "").includes("release not found")) throw error;
  }
  validateExistingRelease(candidate, existing, release);
  if (!existing)
    run(
      "npm",
      [
        "publish",
        path,
        "--access=public",
        "--provenance-file",
        join(root, ".release/provenance.sigstore.json"),
        "--tag=latest",
        "--ignore-scripts",
      ],
      { cwd: root },
    );
  await verify(root);
  if (release)
    console.log(
      `Existing release remains at ${release.targetCommitish}; current qualified artifact has identical npm bytes.`,
    );
  if (!release)
    run(
      "gh",
      [
        "release",
        "create",
        tag,
        path,
        join(root, ".release/candidate.json"),
        join(root, ".release/registry-receipt.json"),
        "--repo",
        "lapismd/lapis-plugin-tasks",
        "--target",
        candidate.source,
        "--title",
        tag,
        "--generate-notes",
      ],
      { cwd: root },
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const commands = { version, prepare, attest, publish, verify };
  const command = commands[process.argv[2]];
  if (!command || process.argv.length !== 3)
    throw Error("Usage: release.mjs version|prepare|attest|publish|verify");
  await command();
}
