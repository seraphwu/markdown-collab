import { useEffect } from 'react';
import { Editor, rootCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, useEditor } from '@milkdown/react';
import { collab, collabServiceCtx } from '@milkdown/plugin-collab';

import * as Y from 'yjs';
// 🌟 改引入 WebRTC 供應器
import { WebrtcProvider } from 'y-webrtc';

export const MilkdownEditor = () => {
    const { editor, getInstance } = useEditor((root) =>
        Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, root);
            })
            .config(nord)
            .use(commonmark)
            .use(gfm)
            .use(collab)
    );

    useEffect(() => {
        const milkdown = getInstance();
        if (!milkdown) return;

        // 1. 初始化 Yjs 共用文件
        const doc = new Y.Doc();

        // 2. 🌟 建立 WebRTC 連線
        // 'milkdown-collab-room' 是房間名稱，進入同一個房間的瀏覽器會自動 P2P 互連！
        const provider = new WebrtcProvider('milkdown-collab-room', doc);

        // 3. 綁定文件與游標狀態
        milkdown.action((ctx) => {
            const collabService = ctx.get(collabServiceCtx);
            collabService.bindDoc(doc).setAwareness(provider.awareness);
            collabService.connect();
        });

        // 4. 清理機制
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