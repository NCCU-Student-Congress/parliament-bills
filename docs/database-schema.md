# Database Schema Notes

本專案過去沒有直接連線到 SQL、D1、Firebase、Supabase 或其他內建資料庫；議案正式資料來源曾是另一個 repo 的 JSON 檔：

```text
https://cdn.jsdelivr.net/gh/ntpusu/legislative-data@main/data
```

舊 JSON repo 曾提供：

- `bill_latestTerm.json`
- `bill_pastTerms.json`
- `committeeReports.json`

本文件整理的是既有 JSON 資料契約，以及目前 Cloudflare D1 沿用的 relational schema。D1 是議案 runtime 的唯一資料來源；舊 JSON repo 不作 runtime fallback，也不應匯入既有舊議案資料。

## Legacy JSON Contracts

### BillResponse

`bill_latestTerm.json` 與 `bill_pastTerms.json` 都使用同一個外層格式。

```ts
interface BillResponse {
  cachedAt: string;
  data: Bill[];
}
```

| Field      | Type     | Notes                |
| ---------- | -------- | -------------------- |
| `cachedAt` | `string` | 資料產生或快取時間。 |
| `data`     | `Bill[]` | 議案清單。           |

### Bill

來源：`shared/types/bill.ts`

```ts
interface Bill {
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

| Field              | Type       | Nullable | Current Usage                                                     |
| ------------------ | ---------- | -------- | ----------------------------------------------------------------- |
| `rowIndex`         | `number`   | No       | 全域流水號；未編號議案詳情頁使用 `/bill/unnumbered/:rowIndex`。   |
| `billNumber`       | `string`   | No       | 完整議案編號，例如 `271北大峽議字第4號`；空字串代表尚未正式編號。 |
| `term`             | `number`   | Yes      | 會期代碼，例如 `25-2` 存為 `252`；用於會期列表與詳情頁路由。      |
| `serialNumber`     | `number`   | Yes      | 該會期內流水號；用於 `/bill/:term/:number`。                      |
| `submittedAt`      | `string`   | No       | 提案時間；目前以字串顯示及篩選。                                  |
| `proposingEntity`  | `string`   | No       | 提案機關或議員類型，例如 `本會議員`、`本會議長`。                 |
| `proposerName`     | `string`   | No       | 機關主管或議員姓名。                                              |
| `contactName`      | `string`   | No       | 聯絡人。                                                          |
| `billType`         | `string`   | No       | 提案類型；列表篩選使用。                                          |
| `subject`          | `string`   | No       | 案由；搜尋、列表、詳情、秘書處草擬系統使用。                      |
| `description`      | `string`   | No       | 說明；詳情頁與會議紀錄草稿使用。                                  |
| `proposedAction`   | `string`   | No       | 辦法；詳情頁與會議紀錄草稿使用。                                  |
| `attachments`      | `string[]` | No       | 附件 URL 清單。                                                   |
| `scheduledSession` | `string`   | No       | 排入會議。                                                        |

### CommitteeReportsResponse

目前沒有 TypeScript 型別檔，以下是從 `app/pages/committee-reports.vue` 使用方式推得。

```ts
interface CommitteeReportsResponse {
  cachedAt: string;
  count: number;
  data: CommitteeReportItem[];
}
```

| Field      | Type                    | Notes                    |
| ---------- | ----------------------- | ------------------------ |
| `cachedAt` | `string`                | 資料產生或快取時間。     |
| `count`    | `number`                | 報告筆數。               |
| `data`     | `CommitteeReportItem[]` | 委員會政策建議報告清單。 |

### CommitteeReportItem

```ts
interface CommitteeReportItem {
  rowIndex: number;
  proposal?: CommitteeProposal;
  committeeReport?: CommitteeReport;
  governmentResponse?: GovernmentResponse;
}
```

| Field                | Type                 | Nullable | Current Usage              |
| -------------------- | -------------------- | -------- | -------------------------- |
| `rowIndex`           | `number`             | No       | 備用顯示編號，例如 `#12`。 |
| `proposal`           | `CommitteeProposal`  | Yes      | 委員提案資料。             |
| `committeeReport`    | `CommitteeReport`    | Yes      | 委員會審查及建議報告資料。 |
| `governmentResponse` | `GovernmentResponse` | Yes      | 學生會回覆資料。           |

### CommitteeProposal

```ts
interface CommitteeProposal {
  timestamp?: string;
  proposer?: string;
  committee?: string;
  toDept?: string;
  subject?: string;
  description?: string;
  suggestion?: string;
}
```

| Field         | Type     | Current Usage                |
| ------------- | -------- | ---------------------------- |
| `timestamp`   | `string` | 提交時間。                   |
| `proposer`    | `string` | 提案議員。                   |
| `committee`   | `string` | 委員會名稱；篩選使用。       |
| `toDept`      | `string` | 建議部門。                   |
| `subject`     | `string` | 主旨；搜尋、列表、詳情使用。 |
| `description` | `string` | 說明。                       |
| `suggestion`  | `string` | 建議方案。                   |

### CommitteeReport

```ts
interface CommitteeReport {
  hasReport?: boolean;
  scheduledMeeting?: string;
  serialNumber?: string;
  committeeResolution?: string;
  reportLink?: string;
}
```

| Field                 | Type      | Current Usage                                |
| --------------------- | --------- | -------------------------------------------- |
| `hasReport`           | `boolean` | 狀態判斷；`true` 且尚無回覆時顯示 `待回覆`。 |
| `scheduledMeeting`    | `string`  | 排入會議。                                   |
| `serialNumber`        | `string`  | 秘書處追蹤字號。                             |
| `committeeResolution` | `string`  | 委員會決議摘要。                             |
| `reportLink`          | `string`  | 完整報告文件連結。                           |

### GovernmentResponse

```ts
interface GovernmentResponse {
  hasResponse?: boolean;
  text?: string;
  refNumber?: string;
}
```

| Field         | Type      | Current Usage                                 |
| ------------- | --------- | --------------------------------------------- |
| `hasResponse` | `boolean` | 狀態判斷；`true` 顯示 `已回覆`。              |
| `text`        | `string`  | 學生會回覆內容；支援自動連結 `https://` URL。 |
| `refNumber`   | `string`  | 參照提案編號。                                |

## Derived Application State

### Current term

目前會期不是存在資料庫，而是用臺北時間日期計算：

- 每年 8 月 1 日到隔年 1 月 31 日為下一屆第 1 會期，例如 `27-1` 存為 `271`。
- 每年 2 月 1 日到 7 月 31 日為同屆第 2 會期，例如 `26-2` 存為 `262`。
- 有效資料自 `25-2` 會期起，內部存為 `252`。

### Legacy JSON split

舊資料 repo 把議案資料拆成兩包：

- `bill_latestTerm.json`：最新可用會期資料。
- `bill_pastTerms.json`：歷史會期資料。

D1 runtime 不再使用這個拆分，也不讀取這兩個 JSON。現在最新會期由 D1 中的 `MAX(term)` 推得，歷史資料由 D1 查詢條件取得。

## Legacy Shapes

有些元件或 API 還殘留舊 AppSheet / Google Sheets 欄位，例如：

- `編號`
- `案由`
- `提案類型`
- `時間戳記`

`server/api/bills/SpecificClassic/[id].get.ts` 也呼叫了 `fetchAllBillsFromGoogleSheets()`，但目前 repo 內沒有此函式定義。這一段應視為 legacy 或未完成程式，不建議直接作為 D1 schema 依據。

## Current D1 Schema

以下是目前議案 D1 schema。設計目標是對齊現有 API 行為，避免一次重構太多應用邏輯。

```sql
CREATE TABLE bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  row_index INTEGER NOT NULL UNIQUE,
  bill_number TEXT NOT NULL DEFAULT '',
  term INTEGER,
  serial_number INTEGER,
  submitted_at TEXT NOT NULL DEFAULT '',
  proposing_entity TEXT NOT NULL DEFAULT '',
  proposer_name TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  bill_type TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  proposed_action TEXT NOT NULL DEFAULT '',
  scheduled_session TEXT NOT NULL DEFAULT '',
  cached_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX bills_term_serial_number_idx
  ON bills (term, serial_number)
  WHERE term IS NOT NULL AND serial_number IS NOT NULL;

CREATE INDEX bills_term_idx ON bills (term);
CREATE INDEX bills_bill_type_idx ON bills (bill_type);
CREATE INDEX bills_submitted_at_idx ON bills (submitted_at);

CREATE TABLE bill_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE,
  UNIQUE (bill_id, position)
);

CREATE TABLE committee_report_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  row_index INTEGER NOT NULL UNIQUE,
  cached_at TEXT,

  proposal_timestamp TEXT,
  proposal_proposer TEXT NOT NULL DEFAULT '',
  proposal_committee TEXT NOT NULL DEFAULT '',
  proposal_to_dept TEXT NOT NULL DEFAULT '',
  proposal_subject TEXT NOT NULL DEFAULT '',
  proposal_description TEXT NOT NULL DEFAULT '',
  proposal_suggestion TEXT NOT NULL DEFAULT '',

  has_report INTEGER NOT NULL DEFAULT 0,
  scheduled_meeting TEXT NOT NULL DEFAULT '',
  report_serial_number TEXT NOT NULL DEFAULT '',
  committee_resolution TEXT NOT NULL DEFAULT '',
  report_link TEXT NOT NULL DEFAULT '',

  has_response INTEGER NOT NULL DEFAULT 0,
  response_text TEXT NOT NULL DEFAULT '',
  response_ref_number TEXT NOT NULL DEFAULT '',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (has_report IN (0, 1)),
  CHECK (has_response IN (0, 1))
);

CREATE INDEX committee_report_items_committee_idx
  ON committee_report_items (proposal_committee);

CREATE INDEX committee_report_items_status_idx
  ON committee_report_items (has_report, has_response);
```

### Why attachments are separate

目前 JSON 使用 `attachments: string[]`。D1 / SQLite 沒有原生 array 型別，建議拆成 `bill_attachments`，保留附件順序並方便未來補上檔名、mime type、來源等欄位。

### Why committee reports are flattened

目前委員會報告 JSON 是巢狀物件，但應用端沒有複雜 join 需求。D1 初期可以用單表攤平，讓 `/api/committee-reports` 很容易組回原本 JSON：

```ts
{
  rowIndex,
  proposal: { ... },
  committeeReport: { ... },
  governmentResponse: { ... }
}
```

未來如果委員會、議員、部門需要獨立維護，再拆出 normalized tables。

## Migration Notes For D1

1. D1 查詢層已接到現有 bills server routes。
2. Server routes 回傳與既有 JSON 完全相同的 shape。
3. 議案詳情、列表、秘書處草擬系統都從 D1-backed `/api/bills` 讀取。
4. 舊 JSON repo 不作 runtime fallback，也不作 D1 seed/import 來源；D1 從空資料庫開始，透過寫入 API/UI 新增資料。

## Open Questions Before Final D1 Migration

- `submittedAt` 和 `proposal_timestamp` 是否要改存 ISO 8601？
- `term + serialNumber` 是否能保證在正式編號議案中唯一？
- `rowIndex` 是否會跨不同來源檔永久穩定？
- `billNumber === ''` 的未編號議案，未來是否也會補正式編號？
- 委員會報告的 `serialNumber` 是否需要唯一約束？
- 是否需要全文搜尋？若需要，D1 可以另建 FTS5 virtual table。
