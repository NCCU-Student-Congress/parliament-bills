# D1 Bills Setup

Bills now use Cloudflare D1 as the server-side data source. The public API still returns the existing bill JSON shape:

```ts
{
  rowIndex: number;
  billNumber: string;
  term: number | null;
  serialNumber: number | null;
  submittedAt: string;
  proposingEntity: string;
  proposerName: string;
  contactName: string;
  billType: string;
  subject: string;
  description: string;
  proposedAction: string;
  attachments: string[];
  scheduledSession: string;
}
```

## Binding

The Nuxt server routes expect a Cloudflare D1 binding named:

```text
DB
```

Configure the same binding in Cloudflare Pages: project settings, bindings, D1 database binding.

For local Wrangler-based testing, update `wrangler.toml` with the real D1 `database_id`.

## Migration

Schema lives in:

```text
migrations/0001_create_bills.sql
```

It creates:

- `bills`
- `bill_attachments`

The API maps snake_case D1 rows back to the existing camelCase `Bill` shape.

## Seed From Existing Data Repo

The existing source repo should be fetched into the ignored local directory:

```text
tmp/legislative-data-main
```

Generate seed SQL:

```bash
pnpm --silent db:seed:sql > tmp/seed-bills.sql
```

Then execute it with Wrangler against the intended D1 database. Example:

```bash
wrangler d1 execute parliament-bills --file tmp/seed-bills.sql
```

Wrangler D1 commands execute against the local database by default. Add `--remote` only when intentionally writing the remote D1 database:

```bash
wrangler d1 execute parliament-bills --remote --file tmp/seed-bills.sql
```

## API

Read routes:

- `GET /api/bills`
- `GET /api/bills?term=27`
- `GET /api/bills?limit=10`
- `GET /api/bills?type=all`
- `GET /api/bills/:term/:number`
- `GET /api/bills/byRowIndex/:rowIndex`

Write route:

- `POST /api/bills`

`POST /api/bills` accepts the existing `Bill` shape. `rowIndex` may be omitted; the server will assign the next available row index. If `billNumber` matches `27屆北大峽議字第1號`, the server derives `term` and `serialNumber` when they are not provided.

## UI

The temporary unprotected write UI is:

```text
/bill/new
```
