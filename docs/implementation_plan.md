# Markdown-Collab 開發推進計畫

根據目前的專案架構（Milkdown v7 + Yjs）以及 `GEMINI.md` 所列出的「下一步計畫」，為您整理了後續開發項目的實作計畫與技術評估。

## User Review Required

> [!IMPORTANT]
> 請確認以下功能實作的優先順序，或是有其中幾項不符合您目前的預期？一旦獲得您的許可，我就會開始撰寫並修改程式碼。

## Proposed Changes

這五個主要功能將會分為四個階段來實作：

### 第一階段：多組別與多屆共用機制 (Dynamic Rooms & Paths)

要讓同一套系統同時給不同屆、不同組的學生使用，且互不干擾，並將檔案存檔在同一個 `markdown-collab` Repo 裡面：

#### [MODIFY] `src/components/Editor.tsx` 與 網址邏輯
*   **動態協作房間 (Dynamic Yjs Room)**：
    修改目前寫死的 `lin-chan-collab-2026` 房間名稱，改為抓取網址參數。
    例如輸入網址 `http://localhost:5173/?room=2026-group-A`，Y-Websocket 就會分配至對應的房間，達成「**一組一房間，互不干擾**」。
*   **動態儲存路徑 (Dynamic File Path)**：
    未來的 GitHub 存檔路徑也可以根據房號動態產生，例如存在：
    `/docs/2026/group-A.md`。這樣日後每一屆、每一組的內容都會在同一個 Repo 中依序排列好，非常乾淨！

---

### 第二階段：編輯器體驗升級 (Slash Menu & Floating Toolbar)

增加 Milkdown 的官方外掛，建立直覺的快捷編輯體驗。

#### [NEW] 安裝套件
透過 `npm install` 安裝以下相容 Milkdown v7.20.0 的官方套件：
*   `@milkdown/plugin-slash`：提供輸入 `/` 叫出區塊選擇選單（Slash Menu）。
*   `@milkdown/plugin-tooltip`：提供選取文字後浮出的格式化工具列（Floating Toolbar）。

#### [MODIFY] `src/components/Editor.tsx`
*   在 `Editor.make()` 鍊式呼叫中導入並 `.use(slashFactory)` 與 `.use(tooltipFactory)`。
*   針對 Nord Theme 建立對應的 CSS 或樣式定義，確保浮動選單外觀不會跑版。

---

### 第三階段：協作感知增強 (Cursor Names)

讓協作者之間能看到彼此的游標名稱與顏色。

#### [NEW] 認證機制與 [MODIFY] `src/components/Editor.tsx`
*   **身分識別**：我注意到專案已經配置了 `supabaseClient.ts`。我們可以加入 **Supabase GitHub OAuth 登入**。學生進來編輯前先透過 GitHub 登入。
*   **游標更新**：取得登入資訊後，把學生的 GitHub 帳號名稱與頭像傳給協作游標：
    `awareness.setLocalStateField('user', { name: githubUser.user_name, avatar: githubUser.avatar_url })`
*   這樣畫面上就能直接辨識出是哪一位學生在打字了！

---

### 第四階段：雲端存檔功能 (GitHub Sync)

將目前的 Markdown 文本同步提交回遠端 GitHub Repo。

#### [NEW] 安裝套件
*   安裝 `octokit`，便於透過前端網頁直接呼叫 GitHub REST API 進行檔案提交。

#### [NEW] 存檔 UI 與機制
*   在編輯器上方或下方，增加一個「儲存至 GitHub」的按鈕，以及輸入框以供填寫使用者的 Personal Access Token（PAT）。
*   **目標 Repo 固定化**：直接寫死目標 Repo 為 `seraphwu/markdown-collab`。
*   **目標路徑動態化**：配合第一階段，存檔路徑會是 `/docs/{room}.md` 形式。
*   透過 Milkdown 取出 Markdown 文本，呼叫 Octokit 發送 API，實作 Commit 行為更新 GitHub。

> [!WARNING]  
> **關於 GitHub 同步的安全性：**  
> GitHub PAT 密碼不應長期存在於公開的程式碼中，建議作為本地協作開發工具的專案，我們讓使用者在介面上**手動輸入 Token**（並可存在瀏覽器 LocalStorage），而非寫定在 `.env`，以保障安全性。

## Open Questions

1. **請確認多組別機制**：利用網址 `?room=2026-group-A` 來動態分配 Yjs 房間與 GitHub 存檔資料夾的設計，您覺得適合嗎？
2. **存檔權限設計**：
   如果所有學生都要把檔案存進 `seraphwu/markdown-collab` 裡面，在純前端架構下，**所有存檔的人都必須持有該Repo的 GitHub Token**。
   👉 您的期望是：
   **(A)** 提供一組設定好的專用 Token 給學生（風險較高，但操作簡單）。
   **(B)** 把所有組員學生加入您的 Repo 成為 Collaborator，讓大家各自用各自的 Token 存進去。
   **(C)** 藉助 Supabase 後端（Edge Functions），將您的主代碼 Token 藏在伺服器，由伺服器代理提交（最安全也最統一，但開發稍微花時間）。

## Verification Plan

### Manual Verification
1. 執行 `npm run dev` 並透過兩個不同的瀏覽器分頁開心網頁，測試游標是否顯示彼此的暱稱。
2. 在編輯器內打字並輸入 `/`，觀察是會彈出區塊選單。
3. 反白文字，觀察上方是否有浮出的粗體/斜體/加上連結工具列。
4. 點擊 GitHub Sync 後，輸入 Repo / Path / Token，成功後檢查 GitHub Repo。
