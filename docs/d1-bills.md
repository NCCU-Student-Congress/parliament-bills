# D1 Bills Setup

Bills now use the proposal schema in Cloudflare D1. The old row index, formal bill number,
proposed action, and scheduled session fields are no longer part of the primary model.

## Binding

Nuxt server routes expect a Cloudflare D1 binding named:

```text
DB
```

Configure the same binding in Cloudflare Pages and `wrangler.toml`.

## Migration

The fresh D1 schema lives in one migration:

```text
migrations/0001_create_bills.sql
```

Earlier local-only migrations were consolidated into this file. Remove the old local D1 state at
`.wrangler/state/v3/d1` before applying it to an existing development checkout.

It creates:

- `committees`
- `users`
- `auth_login_tokens`
- `sessions`
- `meetings`
- `proposals`
- `proposal_attachments`
- `proposal_cosponsors`

## Main Rules

- A proposal has no draft status. Once created, it is a submitted proposal without a meeting.
- Proposal types are `discussion` (討論案), `report` (報告案), and `election` (選舉案).
  Create requests without a type default to `discussion`. The type cannot be changed after
  submission.
- The secretariat assigns or clears its meeting later in the admin's `議案排案` tab. The meeting must match the proposal's session and committee.
- Meetings and proposals reference `sessions.id`; the id is the existing numeric term code such as `271`.
- `POST /api/sessions` does not accept manual fields. It starts at `252` and appends the next session.
- Proposal deadlines belong to meetings: `meetings.proposal_deadline_at`.
- A meeting's proposal deadline must be no later than its meeting time; equal times are allowed.
- Meeting times are entered as a date plus `HH:mm` in 24-hour time and displayed in 24-hour time.
- Meeting locations are optional plain text stored on `meetings.location`.
- Proposals do not store a deadline snapshot.
- User committee membership is stored as a JSON array in `users.committee_ids`.
- Attachments are separate link records with a required display name and URL.
- Confirmed cosponsors are `proposal_cosponsors.status = 'confirmed'`.
- Legislators can cosign any other proposer's unscheduled discussion or election proposal,
  regardless of committee or session. Reports cannot be cosigned. Assigning a meeting closes
  cosigning; clearing it reopens cosigning for eligible proposals.

## Local Auth Login

Secretariat routes use passwordless magic-link login. For local development, enable the auth bypass
so you can log in without Resend:

```dotenv
AUTH_SECRET=replace-with-a-long-local-secret
AUTH_BYPASS=true
AUTH_BYPASS_ADMIN_EMAIL=test@test.test
```

After starting the local Nuxt server, open:

```text
/secretariat/login
```

Enter this value in the email field:

```text
admin
```

When `AUTH_BYPASS=true`, the server creates or updates a local `secretariat_admin` user for
`AUTH_BYPASS_ADMIN_EMAIL` and prints a one-time login link to the server terminal:

```text
[auth] Bypass admin login link: http://localhost:3000/api/secretariat/auth/verify?token=...
```

Open that link in the browser to set the local `secretariat_session` cookie and continue to the
requested page. Keep `AUTH_BYPASS=false` outside local development.

## API

Reference data:

- `GET /api/committees`
- `POST /api/committees`
- `PUT /api/committees/:id`
- `DELETE /api/committees/:id`
- `GET /api/users`
- `POST /api/users`
- `POST /api/users/bulk`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/meetings`
- `POST /api/meetings`
- `PUT /api/meetings/:id`
- `DELETE /api/meetings/:id`

Reference data write routes, `GET /api/users`, and the reference data admin UI require a
passwordless secretariat admin session. Login emails are sent through Resend to addresses in the
`users` table.

All system email uses `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME`.
The default sender is `政大學生議會議案系統 <bill@notify.nccusc.org>` when the sender settings
are omitted.

Proposal reads:

- `GET /api/bills`
- `GET /api/bills?term=271`
- `GET /api/bills?limit=10`
- `GET /api/bills?type=all`
- `GET /api/proposals/:id`
- `GET /api/proposals/signable` (public, unscheduled discussion and election proposals from every session)

Proposal writes:

- `POST /api/bills`
- `PUT /api/proposals/:id` (secretariat only; updates one editable field)
- `DELETE /api/proposals/:id` (secretariat only; permanently deletes the proposal)
- `PUT /api/proposals/:id/meeting`
- `POST /api/proposals/:id/cosponsors` (logged-in legislators only; signs as the caller)

Creating a proposal requires a logged-in legislator or secretariat account. The server always
records the logged-in user as proposer; a client-supplied `proposerId` cannot change it.
Meeting assignments require a secretariat account.
On the proposal detail page, secretariat users can edit one proposal field at a time: `session`,
`committeeId`, `proposedAt`, `subject`, `description`, or `attachments`. `PUT /api/proposals/:id`
accepts `{ field, value }` and returns the updated proposal. A scheduled proposal's session or
committee cannot change until the secretariat clears its meeting assignment. Deleting a proposal
also deletes its attachments and cosponsors through the existing foreign keys.

`POST /api/bills` accepts:

```ts
{
  proposalType?: 'discussion' | 'report' | 'election';
  committeeId: number | null;
  session: number;
  proposedAt?: string;
  subject: string;
  description?: string;
  attachments?: Array<{ name: string; url: string }>;
}
```

The proposal form sends `proposedAt` as a date selected by the user and displays proposal dates without a time of day. Existing timestamp values remain readable.
Both legislators and secretariat users can select any proposal type. The form defaults to `discussion`.
Attachment rows are optional. Each non-empty row requires a name and an HTTP(S) URL; a missing
scheme is saved with `https://`. File attachment payloads are rejected.
It loads the current proposer from the protected `GET /api/proposals/form-data` endpoint.
`POST /api/bills` rejects `cosponsorIds`; each legislator must cosign from `/cosign` themselves.
Cosigning is idempotent, and the UI shows `已連署` after signing. There is no self-service withdrawal.

`PUT /api/proposals/:id/meeting` accepts `{ meetingIds: number[] }`. Use an empty array to clear all assignments. Each meeting must match the proposal's session and committee. The proposal response includes its assigned `meetings` array.

The public query pages follow `/bill` → `/bill/:term` → `/bill/:term/meetings/:id` → proposal detail. `GET /api/meetings/scheduled` lists only meetings with assigned proposals and includes `proposalCount`; it accepts an optional `session` query. `GET /api/meetings/:id/proposals` returns the proposals assigned to one meeting.

The protected write UI is:

```text
/bill/new
```

The reference data admin is available only to secretariat accounts:

```text
/admin
```

The admin's `製作會議記錄` tab saves decisions for each proposal in a meeting through
`GET/PUT /api/meetings/:id/minutes` and downloads a PDF. The PDF embeds the CNS11643
`TW-Kai.ttf` 全字庫正楷體 font. Its two static asset parts are reassembled in the browser
before PDF generation.
