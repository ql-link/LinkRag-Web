import { useState } from 'react';
import { Routes } from '@/routes';
import { Upload, FileText, FileCode, Presentation, FileSpreadsheet, Search, Grid, List, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';

const FILE_TYPES: Record<string, { icon: any; color: string }> = {
  PDF: { icon: FileText, color: 'from-red-500/20 to-red-500/5' },
  DOCX: { icon: FileCode, color: 'from-blue-500/20 to-blue-500/5' },
  PPTX: { icon: Presentation, color: 'from-orange-500/20 to-orange-500/5' },
  XLSX: { icon: FileSpreadsheet, color: 'from-green-500/20 to-green-500/5' },
};

const mockFiles = [
  { id: '1', name: '人工智能发展报告.pdf', type: 'PDF', size: '2.4 MB', date: '2024-05-20 14:30' },
  { id: '2', name: '大模型技术综述.docx', type: 'DOCX', size: '1.8 MB', date: '2024-05-18 09:15' },
  { id: '3', name: '自然语言处理导论.pptx', type: 'PPTX', size: '3.2 MB', date: '2024-05-15 16:45' },
  { id: '4', name: '行业研究数据.xlsx', type: 'XLSX', size: '1.2 MB', date: '2024-05-12 11:20' },
  { id: '5', name: '技术架构设计.pdf', type: 'PDF', size: '4.5 MB', date: '2024-05-10 10:00' },
  { id: '6', name: '产品需求文档.docx', type: 'DOCX', size: '2.1 MB', date: '2024-05-08 15:30' },
];

interface FilesPageProps {
  darkMode?: boolean;
}

export default function FilesPage({ darkMode }: FilesPageProps) {
  const [searchString, setSearchString] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredFiles = mockFiles.filter((f) =>
    f.name.toLowerCase().includes(searchString.toLowerCase())
  );

  const getFileCardClass = (isGrid: boolean) => {
    if (isGrid) {
      return darkMode
        ? 'rounded-2xl p-5 bg-gray-800/50 border border-gray-700 hover:border-primary transition-colors cursor-pointer group'
        : 'art-card rounded-2xl p-5 hover:border-primary transition-colors cursor-pointer group';
    }
    return darkMode
      ? 'rounded-xl px-4 py-3 bg-gray-800/50 border border-gray-700 hover:border-primary transition-colors cursor-pointer group flex items-center justify-between'
      : 'art-card rounded-xl px-4 py-3 flex items-center justify-between hover:border-primary transition-colors cursor-pointer group';
  };

  const getFileIconClass = () => {
    return darkMode ? 'text-gray-100' : 'text-text-main';
  };

  const getUploadCardClass = () => {
    if (viewMode === 'grid') {
      return darkMode
        ? 'min-h-[140px] p-5 rounded-2xl border border-gray-700 border-dashed flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-primary hover:border-primary transition-colors'
        : 'min-h-[140px] p-5 rounded-2xl border-dashed art-card flex flex-col items-center justify-center cursor-pointer text-text-main/40 hover:text-primary hover:border-primary transition-colors';
    }
    return darkMode
      ? 'px-4 py-3 rounded-xl border border-gray-700 border-dashed flex items-center justify-center cursor-pointer text-gray-400 hover:text-primary hover:border-primary transition-colors'
      : 'px-4 py-3 rounded-xl border-dashed art-card flex items-center justify-center cursor-pointer text-text-main/40 hover:text-primary hover:border-primary transition-colors';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className={cn(
        "h-20 px-8 flex items-center justify-between shrink-0 backdrop-blur-md",
        darkMode ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-border-subtle border-b"
      )}>
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[
              { label: '首页', path: Routes.Home },
              { label: '文件' }
            ]}
            darkMode={darkMode}
          />
          <h2 className={cn("text-xl serif-heading", darkMode && "text-gray-100")}>文件</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={14} className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2",
              darkMode ? "text-gray-400" : "text-text-main/30"
            )} />
            <input
              type="text"
              placeholder="搜索文件..."
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className={cn(
                "w-48 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-primary",
                darkMode
                  ? "bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500"
                  : "bg-bg-base/50 border-border-subtle"
              )}
            />
          </div>
          <div className={cn(
            "flex items-center rounded-xl overflow-hidden",
            darkMode ? "border border-gray-700" : "border border-border-subtle"
          )}>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 transition-colors",
                viewMode === 'grid'
                  ? darkMode ? "bg-gray-700 text-gray-100" : "bg-bg-base text-text-main"
                  : darkMode ? "text-gray-400 hover:text-gray-100" : "text-text-main/30 hover:text-text-main"
              )}
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 transition-colors",
                viewMode === 'list'
                  ? darkMode ? "bg-gray-700 text-gray-100" : "bg-bg-base text-text-main"
                  : darkMode ? "text-gray-400 hover:text-gray-100" : "text-text-main/30 hover:text-text-main"
              )}
            >
              <List size={14} />
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-text-main text-white rounded-xl hover:opacity-90 transition-opacity">
            <Upload size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">上传</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats Bar */}
        <div className={cn("flex items-center gap-6 mb-6 mono-label", darkMode && "text-gray-400")}>
          <span>共 {mockFiles.length} 个文件</span>
          <span className={darkMode ? "text-gray-600" : "text-border-subtle"}>|</span>
          <span>15.2 MB</span>
        </div>

        {/* Files Grid */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-4 gap-4' : 'space-y-2'}>
          {filteredFiles.map((file) => {
            const FileIcon = FILE_TYPES[file.type]?.icon || FileText;
            const colorClass = FILE_TYPES[file.type]?.color || 'from-gray-500/20 to-gray-500/5';

            return (
              <div
                key={file.id}
                className={getFileCardClass(viewMode === 'grid')}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0",
                    colorClass
                  )}>
                    <FileIcon size={18} className={getFileIconClass()} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={cn(
                      "font-bold tracking-wider mb-0.5 group-hover:text-primary transition-colors",
                      viewMode === 'grid' ? "text-sm" : "text-xs uppercase",
                      darkMode && "text-gray-100"
                    )}>
                      {file.name}
                    </h3>
                    <div className={cn("flex items-center gap-3 mono-label", darkMode && "text-gray-400")}>
                      <span>{file.type}</span>
                      <span>{file.size}</span>
                      <span className="hidden md:inline">{file.date}</span>
                    </div>
                  </div>
                </div>
                {viewMode === 'grid' && (
                  <ArrowRight size={14} className={cn("mt-3", darkMode ? "text-gray-500 group-hover:text-primary" : "text-text-main/20 group-hover:text-primary")} />
                )}
              </div>
            );
          })}

          {/* Upload Card */}
          <div className={getUploadCardClass()}>
            <Upload size={viewMode === 'grid' ? 24 : 18} className="mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider">上传文件</span>
          </div>
        </div>
      </div>
    </div>
  );
}