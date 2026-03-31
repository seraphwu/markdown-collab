import { MilkdownProvider } from '@milkdown/react';
import { MilkdownEditor } from './components/Editor';

function App() {
  return (
    // ✨ 關鍵在這裡：用 MilkdownProvider 把整個應用程式或編輯器區塊包起來
    <MilkdownProvider>
      <div className="w-full h-full p-4">
        <header className="max-w-4xl mx-auto mb-6">
          <h1 className="text-2xl font-bold text-gray-700">專案文件庫</h1>
          <p className="text-sm text-gray-500">所有的草稿都會自動同步，發布後即可生成正式文件。</p>
        </header>

        <main>
          <MilkdownEditor />
        </main>
      </div>
    </MilkdownProvider>
  );
}

export default App;