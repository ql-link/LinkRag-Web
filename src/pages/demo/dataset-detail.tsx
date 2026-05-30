import { NavLink, useParams, useLocation } from 'react-router';
import {
  ArrowLeft,
  FolderOpen,
  Search,
  BarChart3,
  Settings,
  GitBranch,
  FileText,
  Upload,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

const sidebarNav = [
  { path: 'files', label: '文件管理', icon: FolderOpen },
  { path: 'testing', label: '检索测试', icon: Search },
  { path: 'overview', label: '概览', icon: BarChart3 },
  { path: 'config', label: '配置', icon: Settings },
  { path: 'graph', label: '知识图谱', icon: GitBranch },
];

const mockDocs = [
  { name: 'API 参考手册 v3.2.pdf', size: '2.4 MB', status: 'done', chunks: 156, time: '12 分钟前' },
  { name: '产品使用指南.docx', size: '1.8 MB', status: 'done', chunks: 89, time: '1 小时前' },
  { name: '更新日志 2024.md', size: '128 KB', status: 'done', chunks: 24, time: '2 小时前' },
  { name: '架构设计文档.pdf', size: '4.2 MB', status: 'processing', chunks: 0, time: '处理中...' },
  { name: '数据库 ER 图.pdf', size: '890 KB', status: 'done', chunks: 12, time: '3 小时前' },
  { name: '部署运维手册.md', size: '256 KB', status: 'error', chunks: 0, time: '解析失败' },
  { name: '前端组件库文档.pdf', size: '3.1 MB', status: 'done', chunks: 201, time: '昨天' },
  { name: '测试用例汇总.xlsx', size: '560 KB', status: 'done', chunks: 45, time: '昨天' },
];

function StatusIcon({ status }: { status: string }) {
  if (status === 'done') return <CheckCircle2 size={14} className="text-success" />;
  if (status === 'processing') return <Clock size={14} className="text-warning animate-spin" />;
  return <AlertCircle size={14} className="text-error" />;
}

export default function DemoDatasetDetail() {
  const { id } = useParams();
  const location = useLocation();
  const currentSection = location.pathname.split('/').pop() || 'files';

  return (
    <article className="size-full grid grid-cols-[260px_1fr] grid-rows-1">
      {/* Sidebar */}
      <aside className="border-r border-border-default flex flex-col bg-bg-surface">
        {/* Back + Dataset Info */}
        <div className="p-4 border-b border-border-default">
          <NavLink
            to="/demo/datasets"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            返回知识库
          </NavLink>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center">
              <FileText size={18} className="text-accent-default" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">产品文档</h2>
              <p className="text-xs text-text-muted">128 文档 · 45.2 MB</p>
            </div>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">产品使用手册、API 文档、更新日志</p>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-2 space-y-0.5">
          {sidebarNav.map((item) => {
            const active = currentSection === item.path;
            return (
              <NavLink
                key={item.path}
                to={`/demo/datasets/${id}/${item.path}`}
                className={`flex items-center gap-2.5 h-10 px-3 text-sm rounded-lg transition-colors ${
                  active
                    ? 'bg-bg-overlay text-text-primary font-medium'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                <item.icon size={16} strokeWidth={1.8} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border-default">
          <p className="text-xs text-text-muted">创建于 2024-03-15</p>
        </div>
      </aside>

      {/* Content: File List */}
      <section className="flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border-default">
          <h2 className="heading-card font-semibold">文件管理</h2>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs font-medium text-text-secondary bg-bg-surface border border-border-default rounded-lg hover:bg-bg-hover transition-colors flex items-center gap-1.5">
              <Upload size={14} />
              上传文件
            </button>
          </div>
        </div>

        {/* File Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-surface border-b border-border-default">
              <tr className="text-left text-xs text-text-muted">
                <th className="px-6 py-3 font-medium">文件名</th>
                <th className="px-4 py-3 font-medium w-24">大小</th>
                <th className="px-4 py-3 font-medium w-20">分块</th>
                <th className="px-4 py-3 font-medium w-24">状态</th>
                <th className="px-4 py-3 font-medium w-32">更新时间</th>
                <th className="px-4 py-3 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {mockDocs.map((doc, i) => (
                <tr key={i} className="border-b border-border-default/50 hover:bg-bg-hover/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <FileText size={16} className="text-text-muted shrink-0" />
                      <span className="truncate text-text-primary">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-xs">{doc.size}</td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-xs">{doc.chunks}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={doc.status} />
                      <span className="text-xs text-text-secondary">
                        {doc.status === 'done' ? '已完成' : doc.status === 'processing' ? '处理中' : '失败'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{doc.time}</td>
                  <td className="px-4 py-3">
                    <button className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-hover">
                      <MoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
