# Administrative archive and interface update

The dark green presentation layer preserves the existing sign-in, password reset,
roles, flight forms, exports, maps, equipment and directory code. It adds active
navigation announcements and an admin-only archive view.

## Optional Supabase activation

`admin-monthly-summaries.sql` is a one-time transaction for the database owner.
Apply only after reviewing it in a Supabase test project with the existing role
schema. It creates one new table and one zero-argument RPC. It does not alter
existing tables, roles, users or records. No privileged key belongs in the website.
The existing publishable/anon key continues to be used with authenticated sessions.

Only role counts are captured. No flight table or cache is read by the archive;
no coordinates, outcomes, aircraft identifiers, names or email addresses are stored.
RLS restricts archive reads to admins. Direct client writes are revoked. The RPC
independently checks the current authenticated admin role before writing.
The month primary key and `on conflict do nothing` preserve the first snapshot,
including simultaneous requests. Regular users cannot overwrite or delete it.

The snapshot describes assigned roles **at capture time**, not historical activity.
It is captured automatically on the first admin session in each Kyiv calendar month,
or within a minute of a new month while an admin tab stays open. This is not an
unattended scheduled job: months without an admin session are skipped. Past months
are not invented. Existing snapshots are loaded newest first. No browser archive
cache is created; logout/demotion invalidates pending reads and clears the view.

Without the migration or sufficient permission, the archive reports that saving
is unconfirmed. It does not fall back to writing files, GitHub, or local storage.

## Validation before enabling in production

Browser test: `npm install --no-save playwright@1.62.1`, then
`npx playwright install chromium` and
`PLAYWRIGHT_CHANNEL=chromium node tests/dark-admin-archive.cjs` (set the environment
variable using your shell). On Windows with installed Chrome, omit the variable.
All remote scripts and queries are intercepted; only synthetic fixtures are used.
The PR workflow runs the same checks and has no deploy step or secrets.

Database acceptance checks, required in a test Supabase project before migration:

1. An anonymous caller cannot read the table or execute the RPC.
2. Viewer, executor and moderator sessions cannot read snapshots or capture them.
3. Admin capture creates the current Kyiv month; repeat capture preserves its timestamp.
4. A role change does not modify that month's snapshot. Concurrent captures create one row.
5. Direct insert, update and delete as authenticated admin are denied.
6. Compare existing user, role and record counts before/after; they must be unchanged.

The live migration and these database checks have not been executed by this change.
The PR must stay unmerged until the desired review and production checks pass.
To revert the UI, revert the branch commit. Archive data can remain safely in its
separate table; reverting the interface does not require deleting it.

## Existing synchronization safeguard

The old empty-cloud path automatically uploaded all cached flight records with
new ownership. It now preserves the local cache and stops with a diagnostic
message instead. Explicit data recovery remains an administrator operation.
