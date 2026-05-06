

在撰寫專案文件時，良好的命名規範（Naming Convention）能幫助團隊快速定位檔案，並確保文件系統的邏輯清晰。

針對 **APP 使用者流程（User Flow）** 的 Markdown 檔案，建議遵循以下幾種命名策略：

---

## 1. 職能導向命名法 (推薦)
如果你的文件是按照 **APP 的功能模組** 劃分，這是最直覺且容易擴展的方式。

*   **格式：** `flow-[模組名]-[子功能].md` 或 `userflow-[模組名].md`
*   **範例：**
    *   `flow-auth-login.md` (登入流程)
    *   `flow-cart-checkout.md` (購物車結帳流程)
    *   `flow-profile-edit.md` (個人資料編輯流程)

## 2. 編號序位命名法
如果你的專案有明確的開發先後順序，或者需要引導讀者按順序閱讀，可以使用數字前綴。

*   **格式：** `[編號]-[功能名稱].md`
*   **範例：**
    *   `01-onboarding.md`
    *   `02-registration.md`
    *   `03-main-dashboard.md`

## 3. 目錄結構命名法
當流程非常複雜時，建議配合 **資料夾分層**，檔案名則保持簡潔。

*   **路徑範例：**
    *   `/docs/user-flows/auth/login.md`
    *   `/docs/user-flows/payment/credit-card.md`
    *   `/docs/user-flows/payment/apple-pay.md`

---

## 命名建議小撇步

*   **全小寫與連字號：** 建議使用全小寫字母，並以連字號 `-` 取代空格（Kebab-case），這在不同作業系統與 Git 環境中具備最好的相容性。
*   **動詞起頭：** 由於「流程」通常代表一個動作，使用動詞可以更精確描述內容，例如 `register-account.md` 比 `registration.md` 更具動態感。
*   **保持一致性：** 無論選擇哪一種，請確保整個專案的命名規則統一，不要同時出現 `UserFlow_Login.md` 和 `flow-register.md`。

## 文件內容標記
如果你在 Markdown 中使用 Mermaid 語法來繪製流程圖，建議在檔案開頭的 YAML 區塊中標註，方便搜尋：

```markdown
---
title: 使用者登入流程
version: 1.0.2
type: "User Flow"
---

```

這樣的命名與結構，不論是用於 Git 管理或是在 Obsidian 等筆記軟體中檢索，都會非常高效。
