import { useState } from 'react';
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

function RightPanel({ darkMode }: { darkMode: boolean }) {
  return (
    <Panel defaultSize={20} minSize={15}>
      <aside className={`h-full flex flex-col backdrop-blur-md border rounded-3xl overflow-hidden relative ${darkMode ? 'bg-[#2d2d2d] border-[#3c3c3c]' : 'bg-white/40 border-border-subtle'}`}>
        {/* Recent Activity */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className={`p-6 pb-2 flex justify-between items-center shrink-0 ${darkMode ? 'bg-[#252526]' : 'bg-white/20'}`}>
            <span className={`mono-label ${darkMode ? 'text-[#858585]' : ''}`}>最近活动</span>
          </div>
          <div className="flex-1 p-4 pt-0 overflow-y-auto">
            <div className="space-y-3">
              <div className={`rounded-xl p-3 ${darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-[#e0e0e0]' : ''}`}>人工智能发展报告.pdf</p>
                <p className={`mono-label ${darkMode ? 'text-[#858585]' : ''}`}>2小时前 上传</p>
              </div>
              <div className={`rounded-xl p-3 ${darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-[#e0e0e0]' : ''}`}>新建对话：AI 技术问答</p>
                <p className={`mono-label ${darkMode ? 'text-[#858585]' : ''}`}>5分钟前</p>
              </div>
              <div className={`rounded-xl p-3 ${darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-[#e0e0e0]' : ''}`}>知识库更新：技术架构文档</p>
                <p className={`mono-label ${darkMode ? 'text-[#858585]' : ''}`}>昨天</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={`h-[30%] flex flex-col shrink-0 ${darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-bg-base/20 border-border-subtle'}`}>
          <div className={`p-4 shrink-0 ${darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/10 border-border-subtle'}`}>
            <span className={`mono-label ${darkMode ? 'text-[#858585]' : ''}`}>本月概览</span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: '12', label: '上传文件' },
                { value: '48', label: '问答次数' },
                { value: '5', label: '新建知识库' },
                { value: '156', label: '图谱节点' },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-xl p-3 text-center ${darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card'}`}>
                  <div className={`text-lg font-bold ${darkMode ? 'text-[#e0e0e0]' : ''}`}>{stat.value}</div>
                  <div className={`mono-label text-[8px] ${darkMode ? 'text-[#858585]' : ''}`}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </Panel>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`flex h-screen font-sans overflow-hidden p-4 gap-4 ${darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main'}`}>
      {/* Left Sidebar */}
      <Sidebar darkMode={darkMode} onDarkModeChange={setDarkMode} />

      {/* Main Content + Right Panel */}
      <Group direction="horizontal" className="flex-1 min-w-0">
        {/* Center Content */}
        <Panel defaultSize={80} minSize={50}>
          <Routes>
            <Route path={RoutePaths.Home} element={<HomePage darkMode={darkMode} />} />
            <Route path={RoutePaths.Datasets} element={<DatasetsPage darkMode={darkMode} />} />
            <Route path={RoutePaths.Chats} element={<ChatsPage darkMode={darkMode} />} />
            <Route path={RoutePaths.Files} element={<FilesPage darkMode={darkMode} />} />
            <Route path="*" element={<Navigate to={RoutePaths.Home} replace />} />
          </Routes>
        </Panel>

        <ResizeHandle />

        {/* Right Panel */}
        <RightPanel darkMode={darkMode} />
      </Group>
    </div>
  );
}

export default App;