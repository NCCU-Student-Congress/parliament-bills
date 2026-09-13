# Database Schema Notes

本專案過去沒有直接連線到 SQL、D1、Firebase、Supabase 或其他內建資料庫；正式資料來源是另一個 repo 的 JSON 檔：

```text
https://cdn.jsdelivr.net/gh/ntpusu/legislative-data@main/data
```

目前 Nuxt server routes 會讀取：

- `bill_latestTerm.json`
- `bill_pastTerms.json`
- `committeeReports.json`

本文件整理的是既有 JSON 資料契約，以及改用 Cloudflare D1 時沿用的 relational schema。

## Current JSON Contracts

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

| Field              | Type       | Nullable | Current Usage                                                      |
| ------------------ | ---------- | -------- | ------------------------------------------------------------------ |
| `rowIndex`         | `number`   | No       | 全域流水號；未編號議案詳情頁使用 `/bill/unnumbered/:rowIndex`。    |
| `billNumber`       | `string`   | No       | 完整議案編號，例如 `26屆北大峽議字第4號`；空字串代表尚未正式編號。 |
| `term`             | `number`   | Yes      | 屆次；用於屆次列表與詳情頁路由。                                   |
| `serialNumber`     | `number`   | Yes      | 該屆內流水號；用於 `/bill/:term/:number`。                         |
| `submittedAt`      | `string`   | No       | 提案時間；目前以字串顯示及篩選。                                   |
| `proposingEntity`  | `string`   | No       | 提案機關或議員類型，例如 `本會議員`、`本會議長`。                  |
| `proposerName`     | `string`   | No       | 機關主管或議員姓名。                                               |
| `contactName`      | `string`   | No       | 聯絡人。                                                           |
| `billType`         | `string`   | No       | 提案類型；列表篩選使用。                                           |
| `subject`          | `string`   | No       | 案由；搜尋、列表、詳情、秘書處草擬系統使用。                       |
| `description`      | `string`   | No       | 說明；詳情頁與會議紀錄草稿使用。                                   |
| `proposedAction`   | `string`   | No       | 辦法；詳情頁與會議紀錄草稿使用。                                   |
| `attachments`      | `string[]` | No       | 附件 URL 清單。                                                    |
| `scheduledSession` | `string`   | No       | 排入會議。                                                         |

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

| Field                | Type                 | Nullable | Current Usage                   |
| -------------------- | -------------------- | -------- | ------------------------------- |
| `rowIndex`           | `number`             | No       | fallback 顯示編號，例如 `#12`。 |
| `proposal`           | `CommitteeProposal`  | Yes      | 委員提案資料。                  |
| `committeeReport`    | `CommitteeReport`    | Yes      | 委員會審查及建議報告資料。      |
| `governmentResponse` | `GovernmentResponse` | Yes      | 學生會回覆資料。                |

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

目前屆次不是存在資料庫，而是用日期計算：

- 每年 7 月 1 日到隔年 6 月 30 日為一屆。
- 例如 2025-07-01 到 2026-06-30 為第 26 屆。
- 計算公式概念：`baseYear - 1999`。

### Bill data source routing

目前程式把議案資料拆成兩包：

- `bill_latestTerm.json`：最新可用屆次資料。
- `bill_pastTerms.json`：歷屆資料。

換屆過渡期間，`bill_latestTerm.json` 可能仍是前一屆資料，因此 server 端會檢查 `data[].term` 是否包含目前屆次。

## Legacy Shapes

有些元件或 API 還殘留舊 AppSheet / Google Sheets 欄位，例如：

- `編號`
- `案由`
- `提案類型`
- `時間戳記`

`server/api/bills/SpecificClassic/[id].get.ts` 也呼叫了 `fetchAllBillsFromGoogleSheets()`，但目前 repo 內沒有此函式定義。這一段應視為 legacy 或未完成程式，不建議直接作為 D1 schema 依據。

## Fetched Data Examples

以下樣本是在 2026-09-09 直接從目前 CDN 資料來源抓取後整理。為了讓文件聚焦 schema，長文字欄位只保留短例子。

### Source Summary

| Source File             | CDN URL                                                                               | `cachedAt`                 | Rows |
| ----------------------- | ------------------------------------------------------------------------------------- | -------------------------- | ---- |
| `bill_latestTerm.json`  | `https://cdn.jsdelivr.net/gh/ntpusu/legislative-data@main/data/bill_latestTerm.json`  | `2026-09-08T20:39:03.536Z` | 19   |
| `bill_pastTerms.json`   | `https://cdn.jsdelivr.net/gh/ntpusu/legislative-data@main/data/bill_pastTerms.json`   | `2026-07-13T19:19:05.195Z` | 374  |
| `committeeReports.json` | `https://cdn.jsdelivr.net/gh/ntpusu/legislative-data@main/data/committeeReports.json` | `2026-04-03T07:49:43.236Z` | 2    |

### Example: Latest Term Bill

```json
{
  "rowIndex": 376,
  "billNumber": "27屆北大峽議字第1號",
  "term": 27,
  "serialNumber": 1,
  "submittedAt": "2026/7/6 上午 1:53:50",
  "proposingEntity": "三峽校區學生會 會長副會長",
  "proposerName": "謝明勳",
  "contactName": "謝明勳",
  "billType": "預算案",
  "subject": "有關第27屆第一期間暑期預算案，是否有當？敬請公決。",
  "description": "一、為維持本會暑假期間會務能正常運作...",
  "proposedAction": "敬請貴會審議後，函請會長公告之。",
  "attachments": [
    "https://docs.google.com/spreadsheets/d/1MnHguBp2kxXTW4-8uZzttNtvqw62lQTI/edit?usp=sharing&ouid=111956381691113417844&rtpof=true&sd=true",
    "https://drive.google.com/open?id=1y8J9Qir1TVNwMAwGgOID18xC_NAWOvbn"
  ],
  "scheduledSession": "27屆第1次臨時會"
}
```

### Example: Past Term Bill

```json
{
  "rowIndex": 2,
  "billNumber": "23屆北大峽議字第1號",
  "term": 23,
  "serialNumber": 1,
  "submittedAt": "2022/8/2 下午 9:29:00",
  "proposingEntity": "三峽校區學生會 會長副會長",
  "proposerName": "李芝玉",
  "contactName": "無",
  "billType": "人事案",
  "subject": "有關本會廖柔綺等 13 人人事案，敬請公決。",
  "description": "一、敬請貴會依職權完成人事案，並函請會長任命之。",
  "proposedAction": "一、 秘書長被提名人廖柔綺人事簡歷表...",
  "attachments": ["https://drive.google.com/open?id=1lSA-L36QLPMuOnWgqmk69093i3uw7NgJ"],
  "scheduledSession": "23屆第1次臨時會，活動部部長陳偉翰部分延至23屆第2次臨時會審議。"
}
```

### Example: Committee Report Item

```json
{
  "rowIndex": 1,
  "proposal": {
    "timestamp": "2026/2/10 下午 9:42:09",
    "proposer": "傅冠紘",
    "committee": "法制委員會",
    "toDept": "選舉委員會",
    "subject": "選舉投票時間延長",
    "description": "有鑑於近年來投票率持續低迷已成學生自治現實...",
    "suggestion": "自第二十七屆學生會長、學生議員選舉起，延長投票時間至二日。"
  },
  "committeeReport": {
    "serialNumber": "法26/1",
    "scheduledMeeting": "26屆第1次法制委員會",
    "committeeResolution": "一、照案通過...",
    "reportLink": "https://ntpusu.org/wp-content/uploads/2026/02/1150226_法制委員會建議報告.pdf",
    "hasReport": true
  },
  "governmentResponse": {
    "text": "詳見： https://ntpusu.org/wp-content/uploads/2026/04/1150325_選委會復法制委回覆報告.pdf",
    "refNumber": "",
    "hasResponse": true
  }
}
```

### Example: D1 Rows After Import

如果把上面的最新屆議案匯入 D1，`bills` 和 `bill_attachments` 會長得像這樣：

```sql
INSERT INTO bills (
  row_index,
  bill_number,
  term,
  serial_number,
  submitted_at,
  proposing_entity,
  proposer_name,
  contact_name,
  bill_type,
  subject,
  description,
  proposed_action,
  scheduled_session,
  source_dataset,
  cached_at
) VALUES (
  376,
  '27屆北大峽議字第1號',
  27,
  1,
  '2026/7/6 上午 1:53:50',
  '三峽校區學生會 會長副會長',
  '謝明勳',
  '謝明勳',
  '預算案',
  '有關第27屆第一期間暑期預算案，是否有當？敬請公決。',
  '一、為維持本會暑假期間會務能正常運作...',
  '敬請貴會審議後，函請會長公告之。',
  '27屆第1次臨時會',
  'bill_latestTerm',
  '2026-09-08T20:39:03.536Z'
);

INSERT INTO bill_attachments (bill_id, position, url) VALUES
  (1, 1, 'https://docs.google.com/spreadsheets/d/1MnHguBp2kxXTW4-8uZzttNtvqw62lQTI/edit?usp=sharing&ouid=111956381691113417844&rtpof=true&sd=true'),
  (1, 2, 'https://drive.google.com/open?id=1y8J9Qir1TVNwMAwGgOID18xC_NAWOvbn');
```

委員會報告如果採用初期攤平單表設計，會長得像這樣：

```sql
INSERT INTO committee_report_items (
  row_index,
  cached_at,
  proposal_timestamp,
  proposal_proposer,
  proposal_committee,
  proposal_to_dept,
  proposal_subject,
  proposal_description,
  proposal_suggestion,
  has_report,
  scheduled_meeting,
  report_serial_number,
  committee_resolution,
  report_link,
  has_response,
  response_text,
  response_ref_number
) VALUES (
  1,
  '2026-04-03T07:49:43.236Z',
  '2026/2/10 下午 9:42:09',
  '傅冠紘',
  '法制委員會',
  '選舉委員會',
  '選舉投票時間延長',
  '有鑑於近年來投票率持續低迷已成學生自治現實...',
  '自第二十七屆學生會長、學生議員選舉起，延長投票時間至二日。',
  1,
  '26屆第1次法制委員會',
  '法26/1',
  '一、照案通過...',
  'https://ntpusu.org/wp-content/uploads/2026/02/1150226_法制委員會建議報告.pdf',
  1,
  '詳見： https://ntpusu.org/wp-content/uploads/2026/04/1150325_選委會復法制委回覆報告.pdf',
  ''
);
```

## Suggested D1 Schema

以下是依目前資料契約整理的 D1 初版 schema。設計目標是先對齊現有 API 行為，避免一次重構太多應用邏輯。

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
  source_dataset TEXT NOT NULL DEFAULT 'unknown',
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

1. 先新增 D1 查詢層，不直接改頁面。
2. 讓 server routes 回傳與目前 JSON 完全相同的 shape。
3. 先處理 `bills` 和 `bill_attachments`，因為議案詳情、列表、秘書處草擬系統都依賴它。
4. 再處理 `committee_report_items`。
5. 保留 CDN JSON fallback 一段時間，避免 D1 初期匯入或權限設定出錯時整站不可用。

## Open Questions Before Final D1 Migration

- `submittedAt` 和 `proposal_timestamp` 是否要改存 ISO 8601？
- `term + serialNumber` 是否能保證在正式編號議案中唯一？
- `rowIndex` 是否會跨不同來源檔永久穩定？
- `billNumber === ''` 的未編號議案，未來是否也會補正式編號？
- 委員會報告的 `serialNumber` 是否需要唯一約束？
- 是否需要全文搜尋？若需要，D1 可以另建 FTS5 virtual table。
