import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface RightPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function RightPanel({ collapsed, onToggle }: RightPanelProps) {
  const { darkMode } = useTheme();

  return (
    <aside className={cn(
      'h-full flex shrink-0 flex-col backdrop-blur-md border rounded-3xl overflow-hidden relative transition-all duration-300',
      collapsed ? 'w-[72px]' : 'w-[240px]',
      darkMode ? 'bg-[#2d2d2d] border-[#3c3c3c]' : 'bg-white/40 border-border-subtle',
    )}>
      {collapsed ? (
        <div className="flex h-full flex-col items-center justify-end px-0 py-4">
          <button
            onClick={onToggle}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
              darkMode ? 'text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]' : 'text-text-main/45 hover:bg-primary/5 hover:text-primary',
            )}
            title="展开右侧栏"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 flex flex-col">
            <div className={cn('p-6 pb-2 flex justify-between items-center shrink-0', darkMode ? 'bg-[#252526]' : 'bg-white/20')}>
              <span className={cn('mono-label', darkMode && 'text-[#858585]')}>最近活动</span>
            </div>
            <div className="flex-1 p-4 pt-0 overflow-y-auto">
              <div className="space-y-3">
                {[
                  { title: '欢迎进入 LinkRag', desc: '前后端联调版工作台' },
                  { title: '知识库、文件、对话', desc: '已接入当前可用后端接口' },
                  { title: '欢迎页已启用', desc: '退出登录会自动返回入口页' },
                ].map((item) => (
                  <div key={item.title} className={cn('rounded-xl p-3', darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card')}>
                    <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', darkMode ? 'text-[#e0e0e0]' : '')}>{item.title}</p>
                    <p className={cn('mono-label', darkMode && 'text-[#858585]')}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={cn('h-[30%] flex flex-col shrink-0', darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-bg-base/20 border-border-subtle')}>
            <div className={cn('p-4 shrink-0', darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/10 border-border-subtle')}>
              <span className={cn('mono-label', darkMode && 'text-[#858585]')}>工作台状态</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'Auth', label: '欢迎入口' },
                  { value: 'Files', label: '文件链路' },
                  { value: 'Chats', label: '会话历史' },
                  { value: 'Docs', label: '缺口文档' },
                ].map((stat) => (
                  <div key={stat.label} className={cn('rounded-xl p-3 text-center', darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card')}>
                    <div className={cn('text-lg font-bold', darkMode ? 'text-[#e0e0e0]' : '')}>{stat.value}</div>
                    <div className={cn('mono-label text-[8px]', darkMode && 'text-[#858585]')}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 justify-center px-4 py-4">
            <button
              onClick={onToggle}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                darkMode ? 'text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]' : 'text-text-main/45 hover:bg-primary/5 hover:text-primary',
              )}
              title="收起右侧栏"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
