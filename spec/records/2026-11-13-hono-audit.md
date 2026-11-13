# Hono 4.13.16 audit floor

The Mira `~0.1.5` bump pulled `@modelcontextprotocol/sdk` with Hono `4.13.14`
and `@hono/node-server` `2.1.5`. Dependency audits then failed
`GHSA-4m76-xfj5-7975`, `GHSA-h7mg-cq63-vhpq`, `GHSA-46wx-v44x-9hh2`,
`GHSA-4h7h-rv7c-7m2v`, `GHSA-3gg2-335m-rxc6`, `GHSA-qv5m-9pm6-hqp3`, and
`GHSA-jpvv-r467-5p4w`. Workspace overrides now select Hono `4.13.16` and
`@hono/node-server` `2.1.6`. Deepmerge remains the only ignored advisory.
