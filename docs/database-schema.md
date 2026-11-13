# Database Schema

The runtime database is Cloudflare D1. `migrations/0001_create_bills.sql` is the complete schema
for a new, empty database. Earlier migrations and data are not supported.

## People and access

- `committees` stores committee names.
- `users` stores people who can propose or cosign, including imported historical people. Email is
  required and unique; historical people without a real address use a unique `.invalid` address.
  `permission_role` is `legislator` or `secretariat_admin`.
- `user_committees` links users and committees with a composite primary key. Membership is currently
  used by the admin UI, not for authorization. Deleting a committee or user removes its memberships.
- `auth_login_tokens` stores hashed, single-use magic-link tokens associated with a user. A token's
  email is read from the user; it is not duplicated in the token row.

## Sessions and proposals

- `sessions.id` is the numeric term code, such as `271`.
- `meetings` belongs to a session and optionally to a committee. Its `meeting_type_name` is a
  historical name snapshot, retained when a committee is renamed or deleted. It owns the proposal
  deadline, which must not be later than the meeting time.
- `proposals` belongs to a session, optionally to a committee, and has one proposer. The type is
  `discussion`, `report`, or `election`. There is no draft state.
- `proposal_meetings` links a proposal to zero or more meetings. The application requires matching
  session and committee on both sides. A meeting with assigned proposals must be unscheduled before
  deletion.
- `proposal_attachments` stores named URLs; a URL can occur only once per proposal.
- `proposal_cosponsors` stores one completed signature per proposal and user. `signed_at` records
  self-service signatures and may be null for historical signatures with no known date. Users sign
  themselves; there is no invitation or pending state.

## Agenda and minutes

- `meeting_agenda_entries` holds ordered headings, text, and scheduled proposal references. Text
  entries have stable `decision_key` values and may hold a decision. Saving a reordered agenda
  preserves text decisions by key; removing a text entry removes its decision.
- `meeting_proposal_decisions` stores decisions per meeting and proposal. They remain when a proposal
  is unscheduled and reappear if it returns to that meeting. Deleting the meeting or proposal removes
  its decisions.

Only secretariat admins can read or edit decisions. The public agenda hides proposal entries that
are no longer scheduled for the meeting.
