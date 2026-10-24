# Registration and approval

Registration uses the public Supabase Auth client. Only email, password and the site email redirect URL are submitted. No client-supplied role metadata is sent or trusted.

An account without a row in `flight_user_roles` is pending. Authenticated sessions alone do not grant journal access. The pending screen hides the application and clears its in-memory record view without modifying the stored journal. Pending users can check approval or sign out; approval is also checked every 15 seconds while the page is open.

Any existing administrator can read pending accounts through `list_pending_flight_users()` and approve them using the existing admin-only `set_flight_user_role()` RPC. The default suggested role is viewer. The queue disables approval until Supabase reports email confirmation. The queue lists up to 200 pending users, oldest first, and refreshes every 15 seconds while the roles page is open.

Apply `supabase-registration.sql` once to an existing project. It adds only the admin-only listing RPC and changes no users, roles or records. Enable new user signups and email authentication in Supabase Auth. The owner explicitly chose to disable email confirmation: registration starts a session immediately and journal access still requires manual administrator approval. Email ownership is not verified. Supabase auto-confirms these accounts, so the queue labels them ready for review rather than claiming email verification. The GitHub Pages site URL is the authentication redirect. Password recovery still requires a separately configured email delivery service.

Before enabling signups, verify there are no custom `auth.users` triggers that automatically assign journal roles and that journal RLS checks `current_flight_role()`. Do not use the old broad authenticated-user policies from the initial schema setup.

`tests/registration.cjs` uses synthetic auth and data, with all external services intercepted; it creates no real accounts or approval changes.
