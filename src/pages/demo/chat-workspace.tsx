import { useState } from 'react';
import { useParams } from 'react-router';
import {
  Send,
  Paperclip,
  Sparkles,
  BookOpen,
  FileText,
  Search,
  PanelRightOpen,
  PanelRightClose,
  Check,
  Copy,
  RotateCcw,
  MoreHorizontal,
} from 'lucide-react';

/* ─── Mock Data ─── */

const kbData: Record<string, { name: string; docs: { name: string; checked: boolean }[] }> = {
  'kb-1': {
    name: '产品文档',
    docs: [
      { name: 'API 参考手册 v3.2.pdf', checked: true },
      { name: '产品使用指南.docx', checked: true },
      { name: '更新日志 2024.md', checked: true },
      { name: '架构设计文档.pdf', checked: false },
      { name: '数据库 ER 图.pdf', checked: true },
      { name: '部署运维手册.md', checked: false },
      { name: '前端组件库文档.pdf', checked: true },
    ],
  },
  'kb-2': {
    name: '技术论文',
    docs: [
      { name: 'RAG 综述 2024.pdf', checked: true },
      { name: 'Dense Passage Retrieval.pdf', checked: true },
      { name: 'HyDE 论文.pdf', checked: false },
      { name: '向量数据库对比.pdf', checked: true },
    ],
  },
};

const mockMessages = [
  {
    role: 'user' as const,
    content: '帮我分析一下当前 RAG 系统中检索精度不高的可能原因，以及优化方案。',
  },
  {
    role: 'assistant' as const,
    content: `根据对系统日志和检索结果的分析，检索精度不高主要有以下几个原因：

**1. 文档分块策略不合理**

当前使用的固定长度分块（512 tokens）会切断语义完整性。建议改用语义分块，按段落或章节切分，并设置 10-15% 的重叠区域保持上下文连续性。

**2. Embedding 模型适配性不足**

当前使用的通用 embedding 模型对专业术语的表征能力有限。考虑在领域数据上微调 embedding 模型，或切换到更适合中文的专业模型。

**3. 检索策略单一**

目前仅使用向量相似度检索。建议引入混合检索（Hybrid Search）：向量 + BM25，并使用归一化权重融合检索结果。

**4. 缺少查询改写**

用户的原始查询往往不够精确。使用 LLM 对查询进行扩展和改写，或实现 HyDE 策略。`,
    citations: [
      { id: 1, title: 'RAG 最佳实践指南', source: '产品文档', page: 42 },
      { id: 2, title: '向量检索优化白皮书', source: '技术论文', page: 8 },
      { id: 3, title: 'HyDE 论文', source: '技术论文', page: 3 },
    ],
  },
  {
    role: 'user' as const,
    content: '混合检索具体怎么实现？',
  },
  {
    role: 'assistant' as const,
    content: `混合检索的实现方案已经比较成熟，推荐以下路径：

**方案一：RAGFlow 内置混合检索**

在知识库设置中开启「混合检索」模式，并按离线评测结果设置向量检索和关键词检索的权重比例。

**方案二：自建 Elasticsearch + Milvus**

Milvus 存储文档向量支持 ANN 检索，Elasticsearch 做 BM25 关键词检索 + 同义词扩展，使用归一化 weighted score 合并两路结果。

建议先用内置方案验证效果，再根据需求决定是否自建。`,
    citations: [{ id: 4, title: 'Milvus 混合检索文档', source: '产品文档', page: 15 }],
  },
];

/* ─── Sources Panel ─── */

function SourcesPanel({ kbId, onClose }: { kbId: string; onClose: () => void }) {
  const kb = kbData[kbId] || kbData['kb-1'];
  const [docs, setDocs] = useState(kb.docs);
  const [search, setSearch] = useState('');

  const toggle = (i: number) => {
    setDocs((prev) => prev.map((d, idx) => (idx === i ? { ...d, checked: !d.checked } : d)));
  };

  const filtered = docs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
  const checkedCount = docs.filter((d) => d.checked).length;

  return (
    <aside className="w-[280px] shrink-0 border-l border-border-default bg-bg-surface flex flex-col">
      {/* Header with accent background */}
      <div className="p-3.5 border-b border-border-default bg-accent-subtle/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-accent-default" />
            <h2 className="text-sm font-semibold text-text-primary">知识源</h2>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover"
          >
            <PanelRightClose size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-bg-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-default rounded-full transition-all"
              style={{ width: `${(checkedCount / docs.length) * 100}%` }}
            />
          </div>
          <span className="text-[11px] font-mono tabular-nums text-text-muted">
            {checkedCount}/{docs.length}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="p-2.5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="搜索文档..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-bg-base rounded-md border border-border-default focus:outline-none focus:border-accent-default/40"
          />
        </div>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-auto px-2 pb-2">
        {filtered.map((doc, i) => (
          <button
            key={i}
            onClick={() => toggle(docs.indexOf(doc))}
            className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-xs transition-colors group ${
              doc.checked ? 'hover:bg-accent-subtle/40' : 'hover:bg-bg-hover'
            }`}
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                doc.checked
                  ? 'bg-accent-default border-accent-default'
                  : 'border-border-strong group-hover:border-accent-default/40'
              }`}
            >
              {doc.checked && <Check size={10} className="text-white" />}
            </div>
            <FileText size={13} className={doc.checked ? 'text-accent-default' : 'text-text-muted'} />
            <span className={`truncate ${doc.checked ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
              {doc.name}
            </span>
          </button>
        ))}
      </div>

      {/* Add doc button */}
      <div className="p-3 border-t border-border-default">
        <button className="w-full h-8 flex items-center justify-center gap-1.5 text-xs font-medium text-accent-default bg-accent-subtle rounded-lg hover:bg-accent-tint transition-colors">
          <FileText size={13} />
          添加文档
        </button>
      </div>
    </aside>
  );
}

/* ─── Main Chat ─── */

export default function DemoChatWorkspace() {
  const { kbId, convId } = useParams();
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [input, setInput] = useState('');

  const kb = kbData[kbId || ''] || kbData['kb-1'];

  return (
    <div className="size-full flex">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header — salmon accent bar */}
        <div className="shrink-0 border-b border-border-default">
          <div className="h-0.5 bg-accent-default" />
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-accent-subtle flex items-center justify-center">
                <Sparkles size={13} className="text-accent-default" />
              </div>
              <div>
                <span className="text-sm font-semibold text-text-primary">
                  {convId ? 'RAG 检索优化方案' : `在「${kb.name}」中提问`}
                </span>
                {convId && <span className="text-[11px] text-text-muted ml-2">基于「{kb.name}」</span>}
              </div>
            </div>
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                sourcesOpen
                  ? 'bg-accent-subtle text-accent-default'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {sourcesOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            </button>
          </div>
        </div>

        {/* Messages or Empty State */}
        {convId ? (
          <div className="flex-1 overflow-auto px-4 py-8">
            <div className="max-w-3xl mx-auto space-y-8">
              {mockMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-accent-default flex items-center justify-center mt-0.5">
                      <Sparkles size={14} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] ${
                      msg.role === 'user' ? 'bg-bg-overlay rounded-2xl rounded-br-md px-4 py-3' : ''
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="font-knowledge text-[0.9375rem] leading-[1.8] space-y-4">
                        {msg.content.split('\n\n').map((block, j) => {
                          if (block.startsWith('**') && block.includes('**\n')) {
                            const [title, ...rest] = block.split('\n');
                            return (
                              <div key={j}>
                                <p className="font-semibold text-text-primary mb-1.5 text-[1rem]">
                                  {title.replace(/\*\*/g, '')}
                                </p>
                                {rest.map((line, k) => (
                                  <p key={k} className="text-text-secondary">
                                    {line}
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          if (block.startsWith('**') && block.endsWith('**')) {
                            return (
                              <p key={j} className="font-semibold text-text-primary text-[1rem]">
                                {block.replace(/\*\*/g, '')}
                              </p>
                            );
                          }
                          return (
                            <p key={j} className="text-text-secondary">
                              {block}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-text-primary leading-relaxed">{msg.content}</p>
                    )}

                    {/* Citations */}
                    {msg.citations && (
                      <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-border-default/50">
                        {msg.citations.map((c) => (
                          <button
                            key={c.id}
                            className="inline-flex items-center gap-1 h-6 px-2.5 text-[11px] font-medium bg-accent-subtle text-accent-default rounded-full hover:bg-accent-tint transition-colors"
                          >
                            <BookOpen size={10} />[{c.id}] {c.title}
                            <span className="text-accent-default/60 ml-0.5">p.{c.page}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-0.5 mt-3 -ml-1.5">
                        <button className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
                          <Copy size={13} />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
                          <RotateCcw size={13} />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
                          <MoreHorizontal size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="w-16 h-16 rounded-2xl bg-accent-subtle flex items-center justify-center mx-auto mb-5">
                <Sparkles size={28} className="text-accent-default" />
              </div>
              <h2 className="heading-card font-semibold mb-2 text-text-primary">开始新对话</h2>
              <p className="text-sm text-text-secondary mb-8 leading-relaxed font-knowledge">
                基于「{kb.name}」中的 {kb.docs?.length || 0} 个文档提问，AI 会给出带引用的回答。
              </p>
              {/* Quick Prompts */}
              <div className="space-y-2">
                {['总结文档的核心要点', '有哪些关键技术指标？', '帮我对比不同方案的优劣'].map((q) => (
                  <button
                    key={q}
                    className="w-full h-11 px-4 text-sm text-left text-text-secondary bg-bg-surface border border-border-default rounded-lg hover:border-accent-default/30 hover:text-text-primary hover:bg-accent-subtle/20 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="shrink-0 border-t border-border-default bg-bg-surface">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-end gap-2">
              <button className="w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0">
                <Paperclip size={18} />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={convId ? '继续提问...' : `基于「${kb.name}」提问...`}
                rows={1}
                className="flex-1 resize-none bg-bg-overlay border border-border-default rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-default/40 transition-colors"
              />
              <button
                disabled={!input.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-default text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sources Panel */}
      {sourcesOpen && <SourcesPanel kbId={kbId || 'kb-1'} onClose={() => setSourcesOpen(false)} />}
    </div>
  );
}
