import { useState, useEffect } from 'react';
import { MilkdownProvider } from '@milkdown/react';
import { MilkdownEditor } from './components/Editor';
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGithub = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'github' });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">正在載入專案資料...</div>;

  return (
    // ✨ 關鍵在這裡：用 MilkdownProvider 把整個應用程式或編輯器區塊包起來
    <MilkdownProvider>
      <div className="w-full h-full p-4">
        <header className="max-w-4xl mx-auto mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-700">專案文件庫</h1>
            <p className="text-sm text-gray-500">所有的草稿都會自動同步，發布後即可生成正式文件。</p>
          </div>
          <div>
            {!user ? (
              <button onClick={signInWithGithub} className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">
                使用 GitHub 登入以編輯
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <img src={user.user_metadata.avatar_url} alt="avatar" className="w-8 h-8 rounded-full" />
                <span className="text-sm font-medium">{user.user_metadata.user_name || user.email}</span>
                <button onClick={signOut} className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300">
                  登出
                </button>
              </div>
            )}
          </div>
        </header>

        <main>
          {user ? (
            <MilkdownEditor user={user} />
          ) : (
            <div className="max-w-4xl mx-auto mt-10 p-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 min-h-[50vh] flex items-center justify-center">
              請先點擊右上方按鈕登入 GitHub，以加入協作。
            </div>
          )}
        </main>
      </div>
    </MilkdownProvider>
  );
}

export default App;