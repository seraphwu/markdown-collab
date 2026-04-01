# 🏗️ Markdown-Collab 專案架構分析與重構建議

這份文件分析了目前專案的結構現況，指出潛在的維護風險，並提供未來規模化擴充時的重構方案。

---

## 1. 目前架構狀態 (Current State)

專案為了快速打通「編輯＋協作＋存檔」這套核心功能，目前採取了非常直接集中的實作方式：

- **大泥球元件 (God Component)**：`src/components/Editor.tsx`。這個檔案高達 200 多行，且混雜了四大責任：
  1. Editor 實例化與外掛配置（UI 層）
  2. Yjs WebSocket 連線與房間分配（網路與狀態層）
  3. 表格操作的自訂執行邏輯（業務邏輯層）
  4. 呼叫 `/github-sync` 代理服務的非同步行為（API 層）
- **混合型伺服器**：`ws-server.mjs` 同時擔任 Websocket 服務（給 Yjs）以及一個 HTTP REST Endpoint（給存檔代理）。這在本地開發非常方便，但上正式環境時擴充性受限。
- **寫死的配置 (Hardcoded configs)**：前端程式中出現了 `http://localhost:1234/github-sync` 這樣的絕對網址，這在部屬時會導致問題。

---

## 2. 潛在風險與問題

1. **元件難以測試與重複使用**：若未來想在另一個頁面也放一個同樣的編輯器（但不需要存檔功能），因為目前的 `Editor.tsx` 把 GitHub 的邏輯和工具列都綁死在裡面，就沒辦法輕易抽離重用。
2. **React Strict Mode 效能副作用**：由於所有邏輯（連線、UI 繪製、指令綁定）都寫在 `useEffect` 裡，只要該元件觸發 re-render，這些 `useEffect` 就算有依賴陣列把關，整個組件的心智負擔還是很高，容易不小心意外觸發重連機制（Memory Leak 隱患）。
3. **正式上線時的靈活性不佳**：目前存檔強制依賴本地的 `1234` 埠號伺服器，若伺服器改動埠號或要切換回 Supabase Edge Function，需要改動原始碼。

---

## 3. 改善方案 (Refactoring Plan)

為了讓未來加入「歷史紀錄回溯」、「老師廣播廣播」、「聊天室」等功能時程式碼不會無限膨脹，建議採取**關注點分離 (Separation of Concerns)** 的重構。

### 步驟一：抽離自訂 Hooks（狀態與網路層）
將 `Editor.tsx` 中與畫面（JSX）無關的邏輯移出去。

- 建立 `src/hooks/useCollaboration.ts`：專門負責建立 `Y.Doc`、連上 WebSocket、設定 `Awareness`（把頭像名字丟進去），完成後回傳 `doc` 和 `provider`。
- 建立 `src/hooks/useGithubSync.ts`：專門負責組裝 `fetch` 呼叫、處理 `try...catch`、和 Loading State 狀態（`saving` / `error`）。

### 步驟二：抽象化編輯器設定檔（設定層）
- 將連串的 `.use(commonmark).use(gfm)...` 拉出成一支獨立的工廠函數 `src/editor/setupEditor.ts`，讓 `Editor.tsx` 中只需要傳入這份設定，畫面會更乾淨。

### 步驟三：拆分 UI 元件（展示層）
`Editor.tsx` 應該被拆分成：
1. `<EditorToolbar />`：畫面上方那排包含「插入表格」、「發佈」的按鈕。
2. `<TableFloatingMenu />`：那排藍色的表格增刪按鍵。
3. `<CoreEditor />`：最底層純粹只負責把 Markdown 畫出來的文字框。

### 步驟四：環境變數管理
在 `.env` 中加入：
```env
VITE_WS_URL=ws://localhost:1234
VITE_SYNC_API_URL=http://localhost:1234/github-sync
# 上線時可直接換成 Edge Function 的網址，不需改 code
```

---

## 4. 理想架構圖

重構後的元件結構將長這樣：

```mermaid
graph TD
    App[App.tsx (Supabase Auth)] --> CollabRoom[RoomView.tsx (房間外層)]
    
    CollabRoom --> Hook1(useCollaboration)
    CollabRoom --> Hook2(useGithubSync)
    
    CollabRoom --> Toolbar[<EditorToolbar />]
    CollabRoom --> EditorArea[<CoreEditor />]
    
    EditorArea --> Setup[setupEditor.ts]
    EditorArea --> TableMenu[<TableFloatingMenu />]

    Hook1 -.WebSocket.-> WSServer[ws-server]
    Hook2 -.HTTP POST.-> WSServer
```

---

## 5. 目錄結構 (Directory Structure)

### 目前的結構 (Current)
所有的程式碼都擠在 `components` 裡面，未依照功能模組化：

```text
markdown-collab/
├── ws-server.mjs               # Yjs server + GitHub proxy API
├── src/
│   ├── App.tsx                 # Supabase Auth + Render
│   ├── supabaseClient.ts
│   └── components/
│       └── Editor.tsx          # 【大泥球】Yjs + Milkdown + Fetch API
└── supabase/
    └── functions/github-sync/  # 備用的 Edge Function
```

### 重構後的理想結構 (Refactored)
透過分離 Hooks、Configs 與 UI，讓程式碼分類更明確、容易尋找：

```text
markdown-collab/
├── ws-server.mjs               # 專注於 WebSocket (Yjs)
├── src/
│   ├── App.tsx                 # App 進入點 (Auth Context)
│   ├── supabaseClient.ts
│   ├── hooks/
│   │   ├── useCollaboration.ts # 負責處理 Yjs 邏輯與 WebSocket 連線
│   │   └── useGithubSync.ts    # 負責處理發佈至 GitHub 的 API 邏輯
│   ├── editor/
│   │   └── setupEditor.ts      # 抽離 Milkdown 的所有的 `.use()` 註冊邏輯
│   └── components/
│       ├── CollabRoom.tsx      # 取代原有的 Editor.tsx 作為房間容器
│       ├── CoreEditor.tsx      # 單純的 Milkdown 渲染層
│       ├── EditorToolbar.tsx   # 頂部工具列 (插入表格、發佈按鈕)
│       └── TableFloatingMenu.tsx # 表格操作的藍色浮動選單
└── supabase/
    └── functions/github-sync/  # 上線後將 API 代理職責移交給此處
```

---

## 6. 文件存放位置與倉儲策略 (Document Storage Strategy)

目前學生協作完成的 Markdown 檔案是透過 GitHub API 直接 Commit 到**專案原始碼所在的 Repository**（即存放在當前專案下的 `docs/` 目錄）。

### 目前的隱患
1. **源碼與作業資料混雜 (Code mixed with Data)**：經過多個班級一段時間的上課後，Git History 會被海量的「學生存檔更新 Commit」給洗版，要追蹤或尋找系統本身修復的 Commit 紀錄將變得極為困難。
2. **Repository 體積膨脹**：幾年下來累積的上百、上千份報告與筆記，會讓整個系統專案在被 Clone 或部署時變得無謂龐大。
3. **沒有彈性的存取權限**：原始碼與學生報告綁在同一個 Repo 裡，無法針對學生作業設定不同的觀看或協作權限。

### 改善建議方案

**📝 方案 A：分離文件專屬 Repo (最推薦且成本最低)**
保持目前非常棒的 GitHub API Commit 機制（學生有天生的版控可以使用），但在您的 GitHub 上開另一個**專門放作業的 Repo**（例如 `seraphwu/markdown-collab-docs`）。
這只需要在伺服器端把 API 呼叫的網址改掉，或透過 `.env` 加入 `VITE_TARGET_REPO`，就能優雅地將「系統本身」與「學生產出資料」徹底切開。

**📊 方案 B：移轉至資料庫 (適合未來進階擴充)**
若未來希望把這些 Markdown 報告變成類似部落格文章發佈在學校網頁上，或者需要加上「老師評分機制」、「多重標籤過濾」，建議在專案中整合 Supabase 的 PostgreSQL。將存入 GitHub file 的作法，改為一行 Row 存進資料庫的 `documents` Table，可獲得最強大的查詢與擴充能力。

### 延伸議題：專案本身的開發文件存放 (Development Docs)

目前由 AI 協助產出的 `requirements.md` (需求文件)、`walkthrough.md` (開發導覽)、`architecture_analysis.md` (架構分析) 等檔案，都暫時散落在**專案根目錄**下。

這引出了一個結構衝突：在標準的軟體工程中，這些文件通常會放在 `docs/` 目錄下；然而在目前系統中，`docs/` 已經被用來當作「學生作業存檔」的目標資料夾。

**改善建議方案：**
1. **方案一（變更學生作業路徑）**：將學生作業的存檔路徑從 `docs/{room}.md` 改為 `student-data/{room}.md`（或前述的移到別的 Repo），將乾淨的 `docs/` 還給系統開發文件使用。
2. **方案二（建立獨立開發目錄）**：將這些開發文件移入 `.docs/`、`docs/system/` 或 `design/` 目錄中集中管理，避免根目錄過於雜亂。

---

## 7. 何時應該執行這個重構？

**建議：在您想將系統「正式部屬到雲端主機」給學生實際使用之前。**
目前的寫法對於「概念驗證 (PoC)」和「本地開發測試」來說非常適合，因為檔案少、更動快。但在進入下一個階段（例如要加老師功能或權限管理時），這個重構將能節省大量的 Debug 時間。
