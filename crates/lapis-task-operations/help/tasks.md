# Tasks automation

Tasks commands operate on saved Markdown in an explicitly admitted vault.
Use `tasks list` to discover Tasks and `tasks get --path <path>` to obtain the
current saved version. Pass that version as `--if-version` when changing a Task.
An active dirty editor or a changed source causes a conflict.

Complete and skip retain their request identity in the native lifecycle journal.
After a lost response, inspect that identity with `tasks inspect --request-id`.
Use `tasks retry --request-id` only after reviewing the retained disposition.
Commands never retry writes automatically. Complete and skip may also update
the configured daily note before advancing the Task.

Grant `tasks:read` for list/get/inspect, and `tasks:write` for guarded actions.
Use `--invocation-id <uuid>` for a caller-known lifecycle identity. MCP writes
require the equivalent `invocation_id`; HTTP uses the envelope's `request_id`.

Host and credential flags precede the plugin command. For example:

```sh
lapis --target https://notes.example --token-file token --json tasks list --vault <vault-uuid>
lapis --target https://notes.example --token-file token --json tasks get --vault <vault-uuid> --path Task.md
lapis --target https://notes.example --token-file token --json tasks complete --vault <vault-uuid> --invocation-id <request-uuid> --input-file complete.json
lapis --target https://notes.example --token-file token --json tasks inspect --vault <vault-uuid> --request-id <request-uuid>
```

`complete.json` is an input object, for example
`{"path":"Task.md","expected_version":"<saved-version>","at":"2026-11-14T12:00:00Z","localDate":"2026-11-14"}`.
`--input-file` accepts at most 64 KiB; explicit field flags override file fields.
JSON output retains `protocol_version`, `request_id` and an `outcome` with `status`
`ok`/`error`. Errors also produce a nonzero exit code. Keep the request identity
when investigating a conflict or unknown outcome; do not generate a new identity
to blindly retry a completion.

Structured flag values are JSON. Times and local dates are explicit action
inputs; the CLI does not infer them from its own timezone. Creation and
title/body editing are not part of this operation catalog.
