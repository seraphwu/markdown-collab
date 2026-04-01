import { useEffect, useState, useRef } from 'react';
import { Editor, rootCtx, editorViewCtx, serializerCtx, commandsCtx } from '@milkdown/core';
import {
    insertTableCommand,
    addRowAfterCommand,
    addColAfterCommand,
} from '@milkdown/preset-gfm';
import { deleteRow, deleteColumn, deleteTable } from '@milkdown/prose/tables';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, useEditor } from '@milkdown/react';
import { collab, collabServiceCtx } from '@milkdown/plugin-collab';
import { slashFactory } from '@milkdown/plugin-slash';
import { tooltipFactory } from '@milkdown/plugin-tooltip';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

export const MilkdownEditor = ({ user }: { user: User }) => {
    const [saving, setSaving] = useState(false);
    const [isInTable, setIsInTable] = useState(false);
    const collabReady = useRef<{ doc: Y.Doc, provider: WebsocketProvider } | null>(null);

    const { get, loading } = useEditor((root) =>
        Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, root);
            })
            .config(nord)
            .use(commonmark)
            .use(gfm)
            .use(collab)
            .use(slashFactory('slash'))
            .use(tooltipFactory('tooltip'))
    );

    // 偵測游標是否在表格內，用於顯示浮動表格工具列
    useEffect(() => {
        if (loading) return;
        const editor = get();
        if (!editor) return;

        const view = editor.action((ctx) => ctx.get(editorViewCtx));
        if (!view) return;

        const originalDispatch = view.dispatch.bind(view);
        view.dispatch = (tr) => {
            originalDispatch(tr);
            // 每次 transaction 後重新偵測游標位置
            editor.action((ctx) => {
                const v = ctx.get(editorViewCtx);
                const { selection } = v.state;
                let node = selection.$anchor.node();
                let inTable = false;
                for (let depth = selection.$anchor.depth; depth >= 0; depth--) {
                    if (selection.$anchor.node(depth).type.name === 'table') {
                        inTable = true;
                        break;
                    }
                }
                void node; // suppress unused warning
                setIsInTable(inTable);
            });
        };

        return () => {};
    }, [get, loading]);

    // Yjs 協作連線
    useEffect(() => {
        if (loading) return;
        const editor = get();
        if (!editor) return;

        if (!collabReady.current) {
            const doc = new Y.Doc();
            const urlParams = new URLSearchParams(window.location.search);
            const roomName = urlParams.get('room') || 'lin-chan-collab-2026';
            console.log(`🏠 正在嘗試加入房間：${roomName}`);

            // 從環境變數取得 WebSocket 網址，預設為本地端
            const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:1234';
            const provider = new WebsocketProvider(
                wsUrl,
                roomName,
                doc,
                { connect: true }
            );
            collabReady.current = { doc, provider };
        }

        const { doc, provider } = collabReady.current;

        provider.on('status', (event: { status: string }) => {
            console.log(`📡 WebSocket 狀態: ${event.status}`);
        });

        provider.on('sync', (isSynced: boolean) => {
            if (isSynced) console.log('🔄 文件已同步完成');
        });

        editor.action((ctx) => {
            const collabService = ctx.get(collabServiceCtx);
            const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padEnd(6, '0');
            const name = user.user_metadata.user_name || user.email?.split('@')[0] || 'User';
            provider.awareness.setLocalStateField('user', { name, color, avatar: user.user_metadata.avatar_url });
            collabService.bindDoc(doc).setAwareness(provider.awareness);
            collabService.connect();
            console.log('🔗 Milkdown 協作服務已啟動');
        });

        return () => {
            editor.action((ctx) => {
                ctx.get(collabServiceCtx).disconnect();
            });
        };
    }, [get, loading, user]);

    // 表格操作
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callCommand = (cmd: any) => {
        const editor = get();
        if (!editor) return;
        editor.action((ctx) => ctx.get(commandsCtx).call(cmd.key));
    };

    const handleInsertTable = () => callCommand(insertTableCommand);
    const handleAddRow = () => callCommand(addRowAfterCommand);
    const handleAddCol = () => callCommand(addColAfterCommand);

    const handleDeleteRow = () => {
        const editor = get();
        if (!editor) return;
        editor.action((ctx) => {
            const view = ctx.get(editorViewCtx);
            deleteRow(view.state, view.dispatch);
        });
    };

    const handleDeleteCol = () => {
        const editor = get();
        if (!editor) return;
        editor.action((ctx) => {
            const view = ctx.get(editorViewCtx);
            deleteColumn(view.state, view.dispatch);
        });
    };

    const handleDeleteTable = () => {
        const editor = get();
        if (!editor) return;
        editor.action((ctx) => {
            const view = ctx.get(editorViewCtx);
            deleteTable(view.state, view.dispatch);
        });
    };

    // 儲存至 GitHub
    const handleSaveToGithub = async () => {
        const editor = get();
        if (!editor) return;
        setSaving(true);
        try {
            const markdown = editor.action((ctx) => {
                const editorView = ctx.get(editorViewCtx);
                const serializer = ctx.get(serializerCtx);
                return serializer(editorView.state.doc);
            });
            const urlParams = new URLSearchParams(window.location.search);
            const roomName = urlParams.get('room') || 'lin-chan-collab-2026';
            const path = `workspaces/${roomName}.md`;
            // 從環境變數取得 GitHub Sync API 網址，預設為本地端代理
            const syncApiUrl = import.meta.env.VITE_SYNC_API_URL || 'http://localhost:1234/github-sync';
            const res = await fetch(syncApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markdown, path, username: user.user_metadata.user_name })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || '伺服器錯誤');
            alert(`✅ 成功同步至文件庫！\n${result.url || ''}`);
        } catch (err: unknown) {
            alert('❌ 儲存失敗：' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto mt-10">
            {/* 主工具列 */}
            <div className="flex justify-between mb-2">
                <button
                    onClick={handleInsertTable}
                    className="px-4 py-2 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 text-gray-700 text-sm"
                >
                    📊 插入表格
                </button>
                <button
                    onClick={handleSaveToGithub}
                    disabled={saving}
                    className="px-4 py-2 bg-emerald-600 text-white rounded shadow hover:bg-emerald-500 disabled:opacity-50"
                >
                    {saving ? '正在同步...' : '💾 儲存並發佈至文件庫'}
                </button>
            </div>

            {/* 游標在表格內時出現的浮動工具列 */}
            {isInTable && (
                <div className="flex gap-2 mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    <span className="font-medium self-center mr-1">表格操作：</span>
                    <button onClick={handleAddRow} className="px-3 py-1 bg-white border border-blue-300 rounded hover:bg-blue-100">
                        ＋ 新增列 (下方)
                    </button>
                    <button onClick={handleAddCol} className="px-3 py-1 bg-white border border-blue-300 rounded hover:bg-blue-100">
                        ＋ 新增欄 (右方)
                    </button>
                    <button onClick={handleDeleteRow} className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50">
                        🗑 刪除此列
                    </button>
                    <button onClick={handleDeleteCol} className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50">
                        🗑 刪除此欄
                    </button>
                    <button onClick={handleDeleteTable} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
                        ✕ 刪除整個表格
                    </button>
                </div>
            )}

            {/* 編輯器本體 */}
            <div className="p-8 bg-white shadow-sm border border-gray-200 rounded-lg min-h-[70vh]">
                <Milkdown />
            </div>
        </div>
    );
};