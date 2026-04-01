# Markdown-Collab 開發成果導覽

## 🎯 最終完成功能

### 1. 多組別動態房間
透過 `?room=組名` 網址參數隔離不同組別的 Yjs 協作空間，存檔時自動對應至 `docs/{room}.md`。

| 班級 | 範例網址 |
|---|---|
| 甲班第一組 | `http://localhost:5173/?room=2026-classA-group1` |
| 乙班第二組 | `http://localhost:5173/?room=2026-classB-group2` |

### 2. GitHub 身份識別
- 未登入者看到「使用 GitHub 登入」按鈕，無法進入編輯區
- 登入後游標自動顯示學生的 **GitHub 頭像 + 暱稱**
- 使用 Supabase Auth + Yjs Awareness 實現

### 3. 表格功能
- **📊 插入表格**：點擊按鈕在游標處插入 3×3 表格
- **浮動工具列**：游標進入表格時自動出現，提供：
  - ＋ 新增列（下方）
  - ＋ 新增欄（右方）
  - 🗑 刪除此列
  - 🗑 刪除此欄
  - ✕ 刪除整個表格

### 4. 儲存發佈至 GitHub
- 點擊「💾 儲存並發佈至文件庫」
- `ws-server.mjs` 代理呼叫 GitHub API，使用 `.env` 中的 `GITHUB_PAT`
- 成功後彈出 GitHub 檔案連結

---

## 🚦 每次開發的啟動流程

```bash
# Terminal A（WebSocket + GitHub 代理伺服器）
node ws-server.mjs

# Terminal B（Vite 前端）
npm run dev
```

---

## 🏗️ 關鍵檔案說明

| 檔案 | 用途 |
|---|---|
| `src/components/Editor.tsx` | 主編輯器，含 Yjs、Auth、表格工具列邏輯 |
| `src/App.tsx` | Supabase GitHub OAuth 登入流程 |
| `ws-server.mjs` | 本地 Yjs WebSocket 伺服器 + GitHub API 代理 |
| `src/index.css` | 修正 Tailwind reset 導致表格無法顯示的樣式 |
| `supabase/functions/github-sync/index.ts` | 雲端部署用 Edge Function（備用） |
| `.env` | `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`GITHUB_PAT` |

---

## ⚠️ 已知限制

- 目前 GitHub 同步是透過本地 `ws-server.mjs` 代理，**僅適合本地開發測試**
- 正式上課前，應將 `GITHUB_PAT` 設為 Supabase Secret，並部署 Edge Function，讓學生透過公開網址存取

```bash
# 部署 Edge Function（正式環境用）
npx supabase secrets set GITHUB_PAT=您的Token
npx supabase functions deploy github-sync
```
