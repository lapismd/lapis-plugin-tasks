# Concurrent native Task inspection references

The retained lifecycle client stored inspection references in cached whole
plugin data. A second App opened before submission can overwrite the first
App's unresolved UUID when it saves an ordinary planner preference. This is
a source storage defect, independent of the native operation journal.

The source repair isolates references under one plugin-owned App database
metadata key and uses the existing conditional transaction contract. Concurrent
remember/settle/Forget operations merge current state, enforce a bounded capacity
without eviction and fail before native admission on storage/contention errors.
Only request identity/path/action/time are retained. Ordinary settings no longer
own these references. The existing command reads fresh references and explicit
Forget removes one selected identity, including when the menu is stale.

Legacy pre-release plugin-data references import before that field is cleared.
No native journal, wire API, automatic retry, replacement bytes or custom screen
is added. Read-only inspect remains independent of the editing guard.

Source run `445f52dc` records one missing-module baseline suite before the new
store exists; it is not a passing behavior qualification. Focused after-run
`05f531c7` passes 34 cases across storage/adapter/menu/settings and 27 unchanged
native cases. The final storage implementation removes synthetic action casts;
exact run `c41f06eb` passes all seven store cases and 27 native cases.

The actual two-App hosted baseline `05ab8beb` against retained Tasks archive
`9522bdb7` does not reach native submission: the cached plugin-data save is
blocked with BUSY on `.lapis/app.json`, then shutdown reaches its deadline. This
is retained as failed admission evidence, not as a proved lost-reference result.
One fixture-only settings JSON nesting error is corrected for the next run.
Complete source qualification and fresh archive adoption follow. Actual editor
handoff and native host adoption remain separate from source qualification.

Complete owning run `1db3d180` passes all 2,882 unit cases, 27 native cases,
63 cold interaction/accessibility catalog cases, strict checks, build/publint,
static catalog and full specification gates. Its public package is packed from
the same worker. Only supporting evidence changes after this full run; the final
receipt specification check precedes the source commit. Actual hosted and native
editor acceptance remain separate, pending the qualified coherent host cohort.
