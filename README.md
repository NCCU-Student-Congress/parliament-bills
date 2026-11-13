# 政大學生議會議案系統

## 專案簡介

「政大學生議會議案系統」由國立政治大學學生議會維護，提供議案查詢、提案建檔、會議資料管理與秘書處文件產製等功能。本專案旨在協助學生議會公開、整理並管理議事資訊，讓議案資料能以更穩定、易查詢的方式流通。

本專案以 Cloudflare Workers 與 Cloudflare D1 為核心，提供政大學生議會議案系統。

## 系統功能狀態

為使使用者與開發者清楚掌握專案進度，以下區分現有已上線功能與未來規劃：

### 現有功能

- **基礎介面與瀏覽體驗**
  - 區塊化首頁設計，提供主要服務之快速連結。
  - 具備夜間模式 (Dark Mode) 切換功能的頭部導覽列。
  - 底部頁腳包含單位名稱及版權資訊。
- **議案查詢系統** (`/bill`)
  - 會期議案列表：可顯示特定會期的所有議案。
  - 單一議案顯示 (`/bill/proposal/:id`)：提供單一議案的完整資訊、附件連結，並支援列印排版。
- **後台資料管理**
  - 管理會期、委員會、人員、會議與提案資料，並由秘書處為議案安排會議及編排議程。
  - 製作會議記錄：依議程填寫、儲存每案決議並下載 PDF。

### 開發中 / 中長期規劃功能

- **進階議案查詢**
  - 提供多維度篩選條件（例如：依會期、委員會、提案人、案由進行交叉篩選）。
  - 支援精確的日期範圍篩選功能。
- **提案流程擴充**
  - 擴充連署、附件與通知流程。

## 技術架構

本系統使用以下現代化的技術組合：

- **框架**：Nuxt 4
- **樣式**：Tailwind CSS
- **圖示庫**：Heroicons
- **議案資料庫**：Cloudflare D1
- **部署環境**：Cloudflare Workers

- **套件管理**：pnpm (Node.js 環境)
- **版本控制**：Git / GitHub

## 本機執行

請先安裝 Node.js 與 pnpm（專案的 `packageManager` 設定為 `pnpm@11.9.0`）。在專案根目錄執行：

```sh
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
pnpm dev
```

啟動後開啟 <http://localhost:3000>。`pnpm dev` 會先將 `migrations/` 套用至 `.wrangler/state` 中的本機 Cloudflare D1 資料庫，再啟動 Nuxt；新建的本機資料庫沒有議案資料。

若要登入後台，請先在 `.dev.vars` 設定一組足夠長的 `AUTH_SECRET`，並將 `AUTH_BYPASS` 改為 `true`。開啟 <http://localhost:3000/secretariat/login>、在電子郵件欄輸入 `admin`，再開啟終端機印出的一次性登入連結，並按下頁面上的登入按鈕。本機登入流程詳見 [D1 開發文件](./docs/d1-bills.md#local-auth-login)。`AUTH_BYPASS` 僅供本機開發使用。

登入頁使用 Cloudflare Turnstile 人機驗證，伺服器會先向 siteverify 驗證 token（須通過、action 為 `login`，且 hostname 符合 `TURNSTILE_HOSTNAMES`，未設定時則須與請求的 hostname 相同），才查詢資料庫或寄信。正式環境須將 Turnstile widget 的 secret key 設為 Worker secret `TURNSTILE_SECRET`；未設定時，登入請求會回傳錯誤。本機要測試登入表單時，可在 `.dev.vars` 填入 Cloudflare 的測試 secret（見 `.dev.vars.example`），伺服器只在 localhost 接受測試 secret 的結果。site key 由 `NUXT_PUBLIC_TURNSTILE_SITE_KEY` 提供：正式環境與 `pnpm preview` 使用 `wrangler.toml` 的 `[vars]`，`pnpm dev` 則使用測試 site key `1x00000000000000000000AA`。上述的 `admin` 本機登入不需通過 Turnstile。

正式部署時，Worker 的建置指令為 `pnpm run build`，部署指令為 `pnpm exec wrangler deploy`。D1 binding `DB` 定義在 `wrangler.toml`；`AUTH_SECRET`、`RESEND_API_KEY` 與 `TURNSTILE_SECRET` 等機密值須設為 Worker secrets，`.dev.vars` 只供本機使用。可執行 `pnpm preview`，透過 Wrangler 在本機預覽建置成果（預設 <http://localhost:8787>）。GitHub 已連接的 Pages 專案不會自動轉成 Worker；需在 Cloudflare 建立 Worker Builds 的 Git 連線，並停用舊 Pages 的自動部署。

後續由 agent 匯入舊站會議與議案時，請依照[會議資訊匯入規則](./docs/meeting-data-migration.md)處理來源、提案人與附件。

## 授權與聯絡資訊

- **維護單位**：國立政治大學學生議會， NCCU Student Congress
- **專案授權**：國立政治大學學生議會自行創作的內容保留所有權利，不以開源授權釋出。專案使用了 `NTPUSU/open-parliament` 的部分內容；其原有的 MIT 授權與著作權聲明見 [第三方聲明](./THIRD_PARTY_NOTICES.md)。詳見 [LICENSE](./LICENSE)。
