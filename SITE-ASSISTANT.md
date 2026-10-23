# Site assistant

Four separate capabilities are provided:

* Static help articles explain existing UI and require no AI service.
* The record-form checker uses HTML validity and missing optional dropdowns locally;
  it never sends form values or journal rows to the server or AI, changes values,
  or saves records. It checks format/completeness, not factual correctness.
* Explicitly submitted improvement proposals are stored in `site_feedback`.
  Assigned users can read their own proposals; admins can read all. Submission is
  idempotent by request UUID and limited to five proposals per day per user.
* The opt-in AI panel sends only `{message, web}` through the `site-assistant`
  Edge Function. No form, record, role directory, map position, identity or chat
  history is included in the model request. The UI keeps up to 20 messages in
  memory, clearing them on logout/identity change. The provider request has
  `store: false`; this does not override provider abuse-monitoring policies.

The browser clearly distinguishes static help and local checking from AI.
With no provider key, the AI chat/search remain disabled and the other features
remain available. Do not claim a live AI response until an actual provider call
has been verified after key configuration.

## Setup

1. Review/apply the additive `supabase-assistant.sql` migration. It creates only
   feedback and quota tables/functions with RLS and fixed server-side writes.
   Existing auth, roles, archive and journal tables are not altered.
2. Deploy `supabase/functions/site-assistant/index.ts` as `site-assistant` with
   platform JWT verification **enabled**. The function independently verifies the
   user with Supabase Auth and checks their assigned role. It reads no journal data.
3. The owner creates an OpenAI API key in their own account and enters it directly
   into Supabase **Edge Function Secrets** as `OPENAI_API_KEY`. Never enter it in
   chat, GitHub, frontend config or logs. Key creation and billing are owner steps.
   Optionally set `OPENAI_MODEL`; default is `gpt-4.1-mini`.
4. Reload the site, open Assistant, and use Check connection. Test a harmless
   site-help question and then an explicit public web-search question. Verify
   clickable citations. Test locally first; provider failures must be visible.

Server limits: 20 requests/user/day, including at most 5 web searches; 100 total
requests/site/day including at most 20 web searches; minimum 5 seconds/user.
Counters use Kyiv calendar dates and atomic transaction locking. An attempted
provider call consumes a slot even if the provider fails. Limits restrict request
volume, not exact currency spend: configure the provider account's own budget too.
Each request allows at most 700 output tokens and one hosted search call.

Only explicit questions are sent to OpenAI. Basic coordinate/key patterns are
rejected, but automatic detection is not a guarantee of content classification.
Users are told not to enter private information. No database/mutation tools are
exposed to the model. Returned text uses text nodes, and citation links accept
only http(s), with `noopener noreferrer`. Model output cannot execute page actions.

## Validation

`node --experimental-strip-types tests/site-assistant-server.mjs` tests auth,
roles, CORS, no-key mode, invalid inputs, quotas, optional/required search,
citation handling and safe upstream failures with mocked services.

`node tests/site-assistant.cjs` tests static help, local form checking, suggestion
confirmation, request payload boundaries, unavailable/configured UI states,
escaping, error messages, logout races and mobile layouts. AI output is mocked.
The existing login/archive and map/MGRS suites also remain required.

Official references:
https://developers.openai.com/api/reference/overview
https://developers.openai.com/api/docs/guides/tools-web-search
https://supabase.com/docs/guides/functions/auth
https://supabase.com/docs/guides/functions/secrets
