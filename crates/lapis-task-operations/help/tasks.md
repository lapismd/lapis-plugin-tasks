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

Structured flag values are JSON. Times and local dates are explicit action
inputs; the CLI does not infer them from its own timezone. Creation and
title/body editing are not part of this operation catalog.
