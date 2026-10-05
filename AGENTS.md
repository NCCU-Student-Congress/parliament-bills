# AGENTS.md｜政大學生議會議案系統

給所有 AI 助理（ChatGPT／Codex、Claude 等）與人工維護者的本 repo 規則。**請一律用繁體中文回答。**

## 先讀

1. 組織共通治理 [`GOVERNANCE.md`](https://github.com/NCCU-Student-Congress/.github/blob/main/GOVERNANCE.md)（所有 repo 共用：Issue 工作鎖、狀態留言、PR／複查、AI 權限基線、`待議長決定` label）。讀不到先回報，不要憑記憶猜。
2. 本檔（本 repo 特則；只會加嚴，不放寬共通基線）。
3. `README.md`、`docs/d1-bills.md`、`docs/database-schema.md`。

## 這個 repo 是什麼

- 議案系統的**程式、schema、migration 與部署設定**的正本。
- **正式環境的 D1 資料庫是議案、會議、人員資料的執行正本**；repo 裡沒有正式資料。
- 法規條文與歷史真偽不由本系統裁決：以 `nccusa-regulations` 與議會文史的原始證據為準。
  系統裡的結構化資料不取代提案、議決、會議紀錄等原始文件。
- 本 repo 是**公開**的：程式、Issue、PR、留言、CI 紀錄任何人都看得到。
  不得寫入個資（姓名＋學號／信箱的名單、正式資料匯出）、密碼、`AUTH_SECRET`、Cloudflare token，也不寫私有 repo 的內部細節。

## 技術組成（2026-10-05 由 repo 內容確認）

- Nuxt 4、Tailwind CSS、Cloudflare Pages（`wrangler.toml` 的 `pages_build_output_dir = "dist"`）、Cloudflare D1（binding `DB`）。
- 套件管理：**pnpm，版本以 `package.json` 的 `packageManager` 為準**（目前 `pnpm@11.9.0`），用 `corepack pnpm` 執行。
  安裝一律 `pnpm install --frozen-lockfile`；要改依賴時，`package.json` 與 `pnpm-lock.yaml` 同一個 PR 提交。
  不要用 npm／yarn 產生其他 lockfile。
- 格式：Prettier（`pnpm format:check`）。
- 祕密值（`AUTH_SECRET`、`SEC_PASSWORD`）只在 Cloudflare 與本機 `.env`，**不提交**；範例只放在 `.env.example`，值留空。

## 每個 PR 都要過的檢查（CI 會跑，本機也可跑）

```
corepack pnpm install --frozen-lockfile
corepack pnpm format:check
corepack pnpm build
corepack pnpm exec wrangler d1 migrations apply DB --local --persist-to <暫存資料夾>
```

- 第四行只建立**本機暫存**資料庫，確認 migration 從空資料庫依序跑得過；不連 Cloudflare、不需要帳號。
- CI 綠燈只代表「可以建置、migration 在空資料庫跑得過」，**不代表正式站正常，也不代表 migration 對正式資料安全**。

## D1 schema 與 migration

- `migrations/` 只**新增**，不修改、不刪除、不重新編號已經存在的檔案。
  為什麼：已套用過的 migration 改了也不會重跑；本機與正式環境的 schema 會安靜地分岔。
  要修正舊 migration 的錯，寫一個新的 migration。
- 新檔名照現有格式：`NNNN_說明.sql`（四位數、接續最後一號）。
- 改 schema 的 PR 要同時更新 `docs/database-schema.md`（以及影響 API 規則時的 `docs/d1-bills.md`），並在 PR 說明寫：
  1. 會不會改到或刪除既有資料（`UPDATE`／`DELETE`／`DROP`／改欄位型別或限制）；
  2. 對正式資料的預期影響（筆數或範圍；不知道就寫「未驗證」）；
  3. **退回方式**：要用哪一個反向 migration，或要從哪個備份／時間點還原。
- 會改到或刪除既有資料的 migration，屬**高風險**：要由製作者以外的執行者獨立複查，
  複查要看 SQL 本身，不能只看 CI 綠燈。

## Cloudflare 與正式環境

以下**只限人工**（AI 即使有權限也不做；依共通治理第 6 節）：

- 對正式 D1 執行任何指令：`wrangler d1 ... --remote`、`migrations apply --remote`、`execute --remote`、匯入或刪除資料。
- Cloudflare Pages／D1 的設定、環境變數與祕密值、binding、自訂網域、部署的重新部署或退回（rollback）。
- 修改 `wrangler.toml` 的 `database_id`、`binding`、`migrations_dir` 這類指向正式資源的值：可以在 PR 提議，但要由議長確認後才合併。

AI 可以做：改程式與文件、新增 migration 檔、在本機或 CI 用 `--local` 測試、寫正式環境操作的**步驟與退回方式**給人執行。

## 上正式環境前後

**合併前**，PR 說明要寫：

- 這次合併後，正式環境需要人工做什麼（例如：套用 migration `NNNN`、設定新的環境變數），**順序**是什麼（先 migration 還是先部署程式）。
- 退回方式：程式用哪一個 commit 或 Pages 的上一個部署；資料用哪一個備份或還原點。
- 正式驗收要看哪些網址、哪些功能。

**正式驗收**（由人工或有瀏覽器的執行者）：

- 驗收留言寫「已驗收 commit：完整 SHA」，並確認 Cloudflare 正式部署對應的就是這個 commit。
- 至少打開首頁、`/bill` 列表、一筆議案頁；改到後台或權限的，另測登入與該功能。
- 有 migration 的，寫出套用時間與結果（`wrangler d1 migrations list --remote` 的輸出，由執行的人提供）。
- 沒有實際看過正式站，就寫「未驗證」。

## 退回（rollback）

- **程式**：以 revert PR 回到前一版；或由議長在 Cloudflare Pages 把正式部署退回前一個部署。
- **資料**：正式 D1 的備份與還原只由人工執行。高風險 migration 套用前，先由人工備份正式資料（例如 `wrangler d1 export --remote`），
  備份檔含個資，**不得放進本 repo、Issue 或 PR**。
- Cloudflare D1 時間點還原（Time Travel）的可用天數與指令，依當時 Cloudflare 文件；本專案尚未實測（未驗證）。

## 部署連動（2026-10-05 部分實測）

- **已實測**：Cloudflare Pages 已連到本 repo。PR 的每個 commit 會自動產生 Preview 部署（PR 的 checks 會出現「Cloudflare Pages」與 Preview 網址）；`main` 的 commit 也有「Cloudflare Pages」部署紀錄。
- **推論**：合併到 `main` 就會部署到正式站。在有人到 Cloudflare 確認之前，**一律當作「合併＝上線」處理**。
- **未驗證**：Preview 部署綁定的是哪一個 D1（可能是正式資料庫）。確認前，不要在 Preview 網址做任何會寫入資料的操作，也不要假設 Preview 使用的是測試資料。

上面的推論與未驗證項目確認後，由確認的人開 PR 更新本節（附確認方式與日期）。

## 本 repo 的獨立複查

依共通治理「依影響判斷」。在本 repo，以下一定要獨立複查：

- `migrations/`、`server/`（尤其 `server/utils/auth.ts`、權限角色、會寫入資料的 API）；
- `wrangler.toml`、`nuxt.config.ts`、`.github/workflows/`、依賴升級；
- 會改變議案、會議、人員資料呈現或計算方式的程式。

純文案、樣式微調、文件錯字可以只看 CI。
