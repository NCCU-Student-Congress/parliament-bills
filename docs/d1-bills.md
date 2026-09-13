# D1 Bills Setup

Bills use Cloudflare D1 as the only runtime server-side data source. The database starts empty unless bills are created through the write API/UI. The public API still returns the existing bill JSON shape:

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

## Data Policy

Do not import the old public `legislative-data` bill JSON into D1. New bill records should be created through `POST /api/bills` or the temporary `/bill/new` UI.

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
