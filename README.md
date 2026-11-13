# 政大學生議會議案系統

## 專案簡介

「政大學生議會議案系統」由國立政治大學學生議會維護，提供議案查詢、提案建檔、會議資料管理與秘書處文件產製等功能。本專案旨在協助學生議會公開、整理並管理議事資訊，讓議案資料能以更穩定、易查詢的方式流通。

本專案以 Cloudflare Pages 與 Cloudflare D1 為核心，提供政大學生議會議案系統。

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
  - 舊版議案網址 (`/bill/:term/:number`) 會在確認會期與議案相符後重新導向。
- **秘書處文件草擬系統**
  - 提供秘書處人員撰寫會議紀錄之輔助介面。
- **後台資料管理**
  - 管理會期、委員會、人員、會議與提案資料，並由秘書處為議案安排會議及編排議程。

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
- **部署環境**：Cloudflare Pages [![Powered by Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-orange?logo=cloudflare)](https://pages.cloudflare.com/)

- **套件管理**：pnpm (Node.js 環境)
- **版本控制**：Git / GitHub

## 本機執行

請先安裝 Node.js 與 pnpm（專案的 `packageManager` 設定為 `pnpm@11.9.0`）。在專案根目錄執行：

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

啟動後開啟 <http://localhost:3000>。`pnpm dev` 會先將 `migrations/` 套用至 `.wrangler/state` 中的本機 Cloudflare D1 資料庫，再啟動 Nuxt；新建的本機資料庫沒有議案資料。

若要登入秘書處或後台，請先在 `.env` 設定一組足夠長的 `AUTH_SECRET`，並將 `AUTH_BYPASS` 改為 `true`。開啟 <http://localhost:3000/secretariat/login>、在電子郵件欄輸入 `admin`，再開啟終端機印出的一次性登入連結。本機登入流程詳見 [D1 開發文件](./docs/d1-bills.md#local-auth-login)。`AUTH_BYPASS` 僅供本機開發使用。

## 授權與聯絡資訊

- **維護單位**：國立政治大學學生議會， NCCU Student Congress
- **專案授權**：本專案採混合授權。國立政治大學學生議會新增或修改之部分保留所有權利；其餘授權與來源資訊詳見 [LICENSE](./LICENSE)。
