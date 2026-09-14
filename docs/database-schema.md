# Database Schema Notes

The runtime database is Cloudflare D1. New development starts from the proposal schema in
`migrations/0001_create_bills.sql`; old public JSON bill data is no longer a runtime fallback.

## Tables

### `committees`

Stores committee names used by meetings, proposals, and user filtering.

- `id`
- `name`
- `code`
- `created_at`
- `updated_at`

### `users`

Stores people for proposer/cosponsor references and future permission management.

- `id`
- `name`
- `email`
- `permission_role`
- `committee_ids`
- `created_at`
- `updated_at`

`committee_ids` is a JSON array of committee ids. It is only used for filtering in the current
student council use case.

### `meetings`

Stores meetings that proposals can be submitted to.

- `id`
- `committee_id`
- `session`
- `meeting_date`
- `proposal_deadline_at`
- `title`
- `status`
- `created_at`
- `updated_at`

Proposal deadlines live here. Proposals do not store their own deadline or deadline snapshot.

### `proposals`

Stores submitted proposals. There is no draft state.

- `id`
- `committee_id`
- `session`
- `proposed_at`
- `proposer_id`
- `meeting_id`
- `subject`
- `description`
- `created_at`
- `updated_at`

### `proposal_attachments`

Stores proposal attachments. Files should be uploaded to R2 and recorded here; links store their URL
directly.

- `id`
- `proposal_id`
- `kind`
- `url`
- `r2_key`
- `filename`
- `mime_type`
- `size_bytes`
- `created_at`

`kind` is `file` or `link`.

### `proposal_cosponsors`

Stores cosponsor invitation and confirmation state.

- `id`
- `proposal_id`
- `user_id`
- `status`
- `invited_at`
- `confirmed_at`
- `declined_at`
- `token_hash`
- `token_expires_at`
- `created_at`
- `updated_at`

`status` is one of `pending`, `confirmed`, `declined`, `expired`, or `cancelled`.
