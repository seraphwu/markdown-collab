# Markdown-Collab 開發任務追蹤

這份文件用於追蹤本次對話中所有功能的實作進度。

## ✅ 已完成

- [x] **第一階段：多組別動態房間 (Dynamic Rooms)**
  - [x] 修改 `Editor.tsx`，以 `?room=` 網址參數動態分配 Yjs 房間
  - [x] 無參數時預設使用 `lin-chan-collab-2026`

- [x] **第二階段：編輯體驗升級**
  - [x] 安裝並整合 `@milkdown/plugin-slash` (Slash Menu)
  - [x] 安裝並整合 `@milkdown/plugin-tooltip` (浮動工具列)

- [x] **第三階段：GitHub 身份識別 (Supabase Auth)**
  - [x] 整合 Supabase GitHub OAuth 登入流程
  - [x] 登入後游標顯示 GitHub 頭像與暱稱 (Yjs Awareness)

- [x] **第四階段：GitHub 存檔代理**
  - [x] 建立 `supabase/functions/github-sync/index.ts`（Supabase Edge Function 備用）
  - [x] 建立 `ws-server.mjs` 本地代理 HTTP endpoint `/github-sync`
  - [x] 前端「💾 儲存並發佈至文件庫」按鈕，存檔路徑為 `docs/{room}.md`
  - [x] 測試成功：`docs/test-group-app.md` 已出現於 GitHub Repo

- [x] **第五階段：表格功能修復與增強**
  - [x] 修正 Tailwind reset 導致表格 `display` 屬性被清除的問題
  - [x] 加入「📊 插入表格」按鈕（使用 `insertTableCommand`）
  - [x] 加入游標進入表格時自動出現的浮動工具列：
    - [x] ＋ 新增列（下方）— `addRowAfterCommand`
    - [x] ＋ 新增欄（右方）— `addColAfterCommand`
    - [x] 🗑 刪除此列 — `deleteRow` from `@milkdown/prose/tables`
    - [x] 🗑 刪除此欄 — `deleteColumn` from `@milkdown/prose/tables`
    - [x] ✕ 刪除整個表格 — `deleteTable` from `@milkdown/prose/tables`

- [x] **第六階段：WebSocket 伺服器修復**
  - [x] 發現 `y-websocket` v3.0.0 已移除 server binary
  - [x] 撰寫 `ws-server.mjs` 自建本地 Yjs WebSocket 伺服器
  - [x] 更新 `package.json` 的 `y-server` script 指向 `node ws-server.mjs`
  - [x] 修正 React Strict Mode 造成 `Y.Doc` 被反覆銷毀的問題（改用 `useRef` 快取）

- [x] **第七階段：部署準備與環境切換 (Deployment Prep)**
  - [x] 修改後端伺服器 (ws-server.mjs) 支援 `process.env.PORT` 與雲端環境變數
  - [x] 替換前端 (Editor.tsx) 硬編碼之連線網址為 `import.meta.env`
  - [x] 於 `.env` 設定預設連線變數
  - [x] 於 `package.json` 新增 `"start"` 指令支援雲端自動啟動

- [x] **文件維護階段**
  - [x] 解耦並更新 `GEMINI.md` 的雲端部署指南
  - [x] 於 `requirements.md` 新增 TOC 索引目錄

## 📋 環境需求

- `.env` 需包含：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `GITHUB_PAT`（供 `ws-server.mjs` 讀取以呼叫 GitHub API）
