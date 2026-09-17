# D1 Bills Setup

Bills now use the proposal schema in Cloudflare D1. The old row index, formal bill number,
bill type, proposed action, and scheduled session fields are no longer part of the primary model.

## Binding

Nuxt server routes expect a Cloudflare D1 binding named:

```text
DB
```

Configure the same binding in Cloudflare Pages and `wrangler.toml`.

## Migration

Schema lives in:

```text
migrations/0001_create_bills.sql
```

It creates:

- `committees`
- `users`
- `sessions`
- `meetings`
- `proposals`
- `proposal_attachments`
- `proposal_cosponsors`

## Main Rules

- A proposal has no draft status. Once created, it is a submitted proposal.
- Meetings and proposals reference `sessions.id`; the id is the existing numeric term code such as `271`.
- `POST /api/sessions` does not accept manual fields. It starts at `252` and appends the next session.
- Proposal deadlines belong to meetings: `meetings.proposal_deadline_at`.
- Proposals do not store a deadline snapshot.
- User committee membership is stored as a JSON array in `users.committee_ids`.
- Attachments are separate records. Link attachments store the URL directly; file attachments can store an R2 key plus metadata.
- Confirmed cosponsors are `proposal_cosponsors.status = 'confirmed'`.

## API

Reference data:

- `GET /api/committees`
- `POST /api/committees`
- `PUT /api/committees/:id`
- `DELETE /api/committees/:id`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/meetings`
- `POST /api/meetings`
- `PUT /api/meetings/:id`
- `DELETE /api/meetings/:id`

Reference data write routes, `GET /api/users`, and the reference data admin UI require a
secretariat admin session.

Proposal reads:

- `GET /api/bills`
- `GET /api/bills?term=271`
- `GET /api/bills?limit=10`
- `GET /api/bills?type=all`
- `GET /api/proposals/:id`

Proposal writes:

- `POST /api/bills`

Proposal writes require a secretariat admin session. The selected proposer must be a user with
`permissionRole: "legislator"`.

`POST /api/bills` accepts:

```ts
{
  committeeId: number;
  session: number;
  proposedAt?: string;
  proposerId: number;
  meetingId: number;
  subject: string;
  description?: string;
  attachments?: Array<string | ProposalAttachment>;
  cosponsorIds?: number[];
}
```

The protected write UI is:

```text
/bill/new
```

The protected reference data admin is:

```text
/admin
```
