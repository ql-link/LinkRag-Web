import { useState } from 'react';
import { Upload, FileText, FileCode, Presentation, FileSpreadsheet, Search, Grid, List, ArrowRight } from 'lucide-react';

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

export default function FilesPage() {
  const [searchString, setSearchString] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredFiles = mockFiles.filter((f) =>
    f.name.toLowerCase().includes(searchString.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="h-20 px-8 flex items-center justify-between border-b border-border-subtle bg-white/80 backdrop-blur-md shrink-0">
        <div className="flex flex-col">
          <span className="mono-label text-primary">Storage</span>
          <h2 className="text-xl serif-heading">文件</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-main/30" />
            <input
              type="text"
              placeholder="搜索文件..."
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className="w-48 pl-9 pr-4 py-2 bg-bg-base/50 border border-border-subtle rounded-xl text-xs focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center border border-border-subtle rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-bg-base text-text-main' : 'text-text-main/30 hover:text-text-main'} transition-colors`}
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-bg-base text-text-main' : 'text-text-main/30 hover:text-text-main'} transition-colors`}
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
        <div className="flex items-center gap-6 mb-6 mono-label">
          <span>共 {mockFiles.length} 个文件</span>
          <span className="text-border-subtle">|</span>
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
                className={viewMode === 'grid'
                  ? `art-card rounded-2xl p-5 hover:border-primary transition-colors cursor-pointer group`
                  : `art-card rounded-xl px-4 py-3 flex items-center justify-between hover:border-primary transition-colors cursor-pointer group`
                }
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shrink-0`}>
                    <FileIcon size={18} className="text-text-main" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-bold tracking-wider mb-0.5 group-hover:text-primary transition-colors ${viewMode === 'grid' ? 'text-sm' : 'text-xs uppercase'}`}>
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-3 mono-label">
                      <span>{file.type}</span>
                      <span>{file.size}</span>
                      <span className="hidden md:inline">{file.date}</span>
                    </div>
                  </div>
                </div>
                {viewMode === 'grid' && (
                  <ArrowRight size={14} className="text-text-main/20 group-hover:text-primary group-hover:translate-x-1 transition-all mt-3" />
                )}
              </div>
            );
          })}

          {/* Upload Card */}
          <div className={`art-card rounded-2xl border-dashed flex flex-col items-center justify-center text-text-main/40 hover:text-primary hover:border-primary transition-colors cursor-pointer ${viewMode === 'grid' ? 'min-h-[140px] p-5' : 'px-4 py-3'}`}>
            <Upload size={viewMode === 'grid' ? 24 : 18} className="mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider">上传文件</span>
          </div>
        </div>
      </div>
    </div>
  );
}