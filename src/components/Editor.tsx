import { useEffect } from 'react';
import { Editor, rootCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, useEditor } from '@milkdown/react';
import { collab, collabServiceCtx } from '@milkdown/plugin-collab';

import * as Y from 'yjs';
import { SupabaseProvider } from 'y-supabase';
import { supabase } from '../supabaseClient';

export const MilkdownEditor = () => {
    // 取得 getInstance 函數，讓我們可以在 useEffect 中操作編輯器實體
    const { editor, getInstance } = useEditor((root) =>
        Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, root);
                // 移除 defaultValueCtx。在協作模式下，文件初始內容由 Yjs 負責派發，
                // 若強制設定預設值，會導致每次重新整理都覆蓋掉遠端資料。
            })
            .config(nord)
            .use(commonmark)
            .use(gfm)
            .use(collab) // 載入 Milkdown 的協作外掛
    );

    useEffect(() => {
        const milkdown = getInstance();
        if (!milkdown) return;

        // 1. 初始化 Yjs 的共用文件 (Document)
        const doc = new Y.Doc();

        // 2. 建立 Supabase 連線提供者
        // 這裡的 'milkdown-demo' 是房間名稱，進入同一個房間的人就能共同編輯
        const provider = new SupabaseProvider(doc, supabase, 'milkdown-demo');

        // 3. 將 Yjs 文件綁定到 Milkdown 協作服務中
        milkdown.action((ctx) => {
            const collabService = ctx.get(collabServiceCtx);
            // 綁定文件，並將使用者狀態 (如游標位置) 交給 Supabase 的 awareness 系統處理
            collabService.bindDoc(doc).setAwareness(provider.awareness);
            collabService.connect();
        });

        // 4. 清理機制：當元件卸載 (如切換頁面) 時，關閉連線以釋放記憶體
        return () => {
            milkdown.action((ctx) => {
                ctx.get(collabServiceCtx).disconnect();
            });
            provider.destroy();
            doc.destroy();
        };
    }, [getInstance]);

    return (
        <div className="max-w-4xl mx-auto mt-10 p-8 bg-white shadow-sm border border-gray-200 rounded-lg min-h-[70vh]">
            <Milkdown />
        </div>
    );
};