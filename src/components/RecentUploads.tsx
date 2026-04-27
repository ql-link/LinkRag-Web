import React from 'react';
import { 
  FileText, 
  FileCode, 
  Presentation, 
  FileSpreadsheet, 
  ArrowRight,
  Download
} from 'lucide-react';
import { FileItem } from '../types';

const RECENT_FILES: FileItem[] = [
  { id: '1', name: '人工智能发展报告.pdf', type: 'PDF', size: '2.4 MB', date: '2024-05-20 14:30' },
  { id: '2', name: '大模型技术综述.docx', type: 'DOCX', size: '1.8 MB', date: '2024-05-18 09:15' },
  { id: '3', name: '自然语言处理导论.pptx', type: 'PPTX', size: '3.2 MB', date: '2024-05-15 16:45' },
  { id: '4', name: '行业研究数据.xlsx', type: 'XLSX', size: '1.2 MB', date: '2024-05-12 11:20' },
];

const FILE_TYPES = {
  PDF: { icon: FileText, label: 'Standard PDF' },
  DOCX: { icon: FileCode, label: 'Word Document' },
  PPTX: { icon: Presentation, label: 'Presentation' },
  XLSX: { icon: FileSpreadsheet, label: 'Data Sheet' },
};

export const RecentUploads: React.FC = () => {
  return (
    <div className="space-y-2 py-2">
      {RECENT_FILES.slice(0, 3).map((file) => {
        return (
          <div 
            key={file.id} 
            className="group flex items-center justify-between art-border px-4 py-3 bg-white/80 hover:bg-bg-base transition-all cursor-pointer rounded-xl"
          >
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="w-6 h-6 border border-text-main/10 flex items-center justify-center text-[8px] font-bold text-primary bg-primary/5 shrink-0 rounded-md">
                 {file.type}
               </div>
               <h4 className="text-[10px] font-bold uppercase tracking-wider truncate">
                 {file.name}
               </h4>
            </div>
            
            <ArrowRight size={10} className="text-text-main/20 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
          </div>
        );
      })}
    </div>
  );
};
