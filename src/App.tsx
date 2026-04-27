import { Routes, Route, Navigate } from 'react-router';
import { Routes as RoutePaths } from './routes';
import { Sidebar } from './components/Sidebar';
import { Group, Panel, Separator } from 'react-resizable-panels';
import HomePage from './pages/home';
import DatasetsPage from './pages/datasets';
import ChatsPage from './pages/chats';
import FilesPage from './pages/files';

function ResizeHandle() {
  return (
    <Separator className="w-1.5 flex items-center justify-center group transition-all rounded-full hover:bg-primary/10">
      <div className="w-0.5 h-8 bg-border-subtle group-hover:bg-primary rounded-full transition-colors" />
    </Separator>
  );
}

function RightPanel() {
  return (
    <Panel defaultSize={30} minSize={20}>
      <aside className="h-full flex flex-col bg-white/40 backdrop-blur-md border border-border-subtle rounded-3xl overflow-hidden relative">
        {/* Recent Activity */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="p-6 pb-2 flex justify-between items-center bg-white/20 shrink-0">
            <span className="mono-label">最近活动</span>
          </div>
          <div className="flex-1 p-4 pt-0 overflow-y-auto">
            <div className="space-y-3">
              <div className="art-card rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1">人工智能发展报告.pdf</p>
                <p className="mono-label">2小时前 上传</p>
              </div>
              <div className="art-card rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1">新建对话：AI 技术问答</p>
                <p className="mono-label">5分钟前</p>
              </div>
              <div className="art-card rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1">知识库更新：技术架构文档</p>
                <p className="mono-label">昨天</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="h-[30%] flex flex-col bg-bg-base/20 border-t border-border-subtle shrink-0">
          <div className="p-4 border-b border-border-subtle bg-white/10">
            <span className="mono-label">本月概览</span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="art-card rounded-xl p-3 text-center">
                <div className="text-lg font-bold">12</div>
                <div className="mono-label text-[8px]">上传文件</div>
              </div>
              <div className="art-card rounded-xl p-3 text-center">
                <div className="text-lg font-bold">48</div>
                <div className="mono-label text-[8px]">问答次数</div>
              </div>
              <div className="art-card rounded-xl p-3 text-center">
                <div className="text-lg font-bold">5</div>
                <div className="mono-label text-[8px]">新建知识库</div>
              </div>
              <div className="art-card rounded-xl p-3 text-center">
                <div className="text-lg font-bold">156</div>
                <div className="mono-label text-[8px]">图谱节点</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </Panel>
  );
}

function App() {
  return (
    <div className="flex h-screen bg-bg-base text-text-main font-sans overflow-hidden p-4 gap-4">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content + Right Panel */}
      <Group direction="horizontal" className="flex-1 min-w-0">
        {/* Center Content */}
        <Panel defaultSize={70} minSize={50}>
          <Routes>
            <Route path={RoutePaths.Home} element={<HomePage />} />
            <Route path={RoutePaths.Datasets} element={<DatasetsPage />} />
            <Route path={RoutePaths.Chats} element={<ChatsPage />} />
            <Route path={RoutePaths.Files} element={<FilesPage />} />
            <Route path="*" element={<Navigate to={RoutePaths.Home} replace />} />
          </Routes>
        </Panel>

        <ResizeHandle />

        {/* Right Panel */}
        <RightPanel />
      </Group>
    </div>
  );
}

export default App;