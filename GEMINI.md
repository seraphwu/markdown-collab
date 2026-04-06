# 🚀 Project: Markdown-Collab (Milkdown v7 + Yjs)

這份文件記錄了目前專案的技術架構與本地開發環境的啟動方式，方便在 Antigravity 中直接參考與接續開發。

---

## 🛠️ 技術棧 (Tech Stack)
- **Framework**: React 19 + Vite 8
- **Editor**: [Milkdown v7](https://milkdown.dev/) (Headless WYSIWYG Markdown)
- **Sync Engine**: [Yjs](https://yjs.dev/) (CRDTs)
- **WebSocket Server**: `ws-server.mjs`（自建本地伺服器，取代 y-websocket v3 移除的 binary）
- **Auth**: Supabase GitHub OAuth（學生游標顯示 GitHub 頭像與暱稱）
- **GitHub Sync**: `ws-server.mjs` 本地代理 → GitHub Contents API
- **Theme**: Milkdown Nord Theme（本地 CSS 載入 `/public/milkdown-theme.css`）

---

## 🚦 啟動流程 (Workflow)

開發時需開啟兩個終端機分頁：

```bash
# Terminal A（WebSocket 協作伺服器 + GitHub API 代理）
node ws-server.mjs

# Terminal B（Vite 前端）
npm run dev
```

---

## 🌐 多組別使用方式

不同組別學生使用不同的 `?room=` 參數，即可進入各自隔離的協作空間，存檔時也自動分開儲存：

```
http://localhost:5173/?room=2026-classA-group1  → 存至 workspaces/2026-classA-group1.md
http://localhost:5173/?room=2026-classA-group2  → 存至 workspaces/2026-classA-group2.md
```

### 📁 支援子資料夾路徑格式（年份分類）

`room` 參數**支援斜線**，系統會自動把斜線對應到 GitHub 的資料夾結構，**無需修改任何程式碼**：

```
?room=2026/classA-group1  → 存至 workspaces/2026/classA-group1.md
?room=2027/classB-group3  → 存至 workspaces/2027/classB-group3.md
```

建議每年度教學時使用以下格式，方便長期歸檔：

```
http://localhost:5173/?room=2026/classA-group1
http://localhost:5173/?room=2026/classA-group2
```

---

## 🏗️ 核心檔案說明

| 檔案 | 說明 |
|---|---|
| `src/components/Editor.tsx` | 主編輯器元件：Yjs 協作、Auth 游標、表格工具列、GitHub 存檔 |
| `src/App.tsx` | Supabase GitHub OAuth 登入流程與 session 管理 |
| `ws-server.mjs` | 本地 Yjs WebSocket 伺服器 + `/github-sync` HTTP 代理端點 |
| `src/supabaseClient.ts` | Supabase 客戶端初始化 |
| `src/index.css` | 修正 Tailwind reset 導致表格 `display` 消失的全域樣式 |
| `public/milkdown-theme.css` | Milkdown Nord 主題樣式（本地載入） |
| `supabase/functions/github-sync/index.ts` | 雲端部署用 Deno Edge Function（正式環境備用） |
| `.env` | 環境變數（見下方說明） |

---

## 🔐 環境變數 (.env)

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
GITHUB_PAT=ghp_您的Token（ws-server.mjs 讀取，用於呼叫 GitHub API）
```

---

## 🚀 雲端部署指南 (Production Deployment)

本系統已解耦本地依賴，支援完全雲端部署（ Frontend 取代 localhost ）：

1. **後端代理 (Render / Railway)**：
   - 原理：平台會自動執行 `package.json` 中的 `"start"` 指令 (`node ws-server.mjs`)，且程式碼已支援動態 `process.env.PORT`。
   - 設定：需在雲端平台的 Environment Variables 注入 `GITHUB_PAT`。
     - ⚠️ **易錯提醒**：在 Render 填寫環境變數時，Value 欄位請「直接貼上 `ghp_...` 開頭的金鑰字串」即可，**千萬不要**連同 `GITHUB_PAT=` 一起貼進去，否則會出現 `Bad credentials` 無效存取的錯誤！
   - 獲得：一組 WebSocket 連線用網址 (`wss://...`) 與一組 HTTP API 網址 (`https://.../github-sync`)。

2. **前端介面 (Vercel / Netlify)**：
   - 設定：在平台的 Environment Variables 內，除了填寫 Supabase 雙金鑰外，需額外補上：
     - `VITE_WS_URL` = (上述取得的 wss 網址)
     - `VITE_SYNC_API_URL` = (上述取得的 https 網址)
   - 授權：部署成功後，**務必**至 Supabase 後台的 `Authentication -> URL Configuration` 將新的 Vercel 網域加入白名單，否則 GitHub OAuth 會拒絕登入。

---

## 📝 待辦 / 可延伸功能

- [ ] **正式部署**：將 `GITHUB_PAT` 設為 Supabase Secret，部署 `github-sync` Edge Function，讓學生透過公開網址使用
- [ ] **游標顏色標籤**：在畫面上顯示每個協作者的彩色名稱標記
- [ ] **歷史版本**：利用 GitHub commit history 實現文件回溯
- [ ] **老師廣播**：老師端可以鎖定學生編輯、廣播提示訊息

---

## 🗂️ 開發慣例

- 每次對話結束前，請將相關的計畫文件與紀錄同步複製到專案的 `docs/` 資料夾（將專案開發文件與學生作業 `workspaces/` 分開存放）：
  ```powershell
  mkdir -Force docs
  Copy-Item "$env:USERPROFILE\.gemini\antigravity\brain\<conversation-id>\*.md" .\docs\ -Force
  ```