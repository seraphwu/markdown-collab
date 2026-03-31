import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { ReactEditor, useEditor } from '@milkdown/react';

export const MilkdownEditor = () => {
    const { editor } = useEditor((root) =>
        Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, root);
                // 這裡設定編輯器的初始預設內容
                ctx.set(defaultValueCtx, '# 歡迎來到團隊協作平台 🚀\n\n試著在這裡輸入 `/` 或使用 **Markdown** 語法開始撰寫 PRD 吧！');
            })
            // 套用 Nord 主題 (自帶好看的樣式)
            .config(nord)
            // 載入標準 Markdown 與 GitHub Flavored Markdown (支援表格、任務清單)
            .use(commonmark)
            .use(gfm)
    );

    return (
        <div className="max-w-4xl mx-auto mt-10 p-8 bg-white shadow-sm border border-gray-200 rounded-lg min-h-[70vh]">
            <ReactEditor editor={editor} />
        </div>
    );
};