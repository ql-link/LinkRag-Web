import { useState } from 'react';
import {
  Search,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Paperclip,
  Settings2,
  Sparkles,
  ChevronDown,
  BookOpen,
} from 'lucide-react';

const mockSessions = [
  { id: '1', title: 'RAG 检索优化方案', time: '刚刚', active: true },
  { id: '2', title: '向量数据库选型对比', time: '1 小时前', active: false },
  { id: '3', title: '文档分块策略讨论', time: '昨天', active: false },
  { id: '4', title: 'Embedding 模型微调', time: '2 天前', active: false },
  { id: '5', title: '知识图谱构建流程', time: '3 天前', active: false },
  { id: '6', title: '多模态检索方案', time: '1 周前', active: false },
];

const mockMessages = [
  {
    role: 'user',
    content: '帮我分析一下当前 RAG 系统中检索精度不高的可能原因，以及优化方案。',
  },
  {
    role: 'assistant',
    content: `根据对系统日志和检索结果的分析，检索精度不高主要有以下几个原因：

**1. 文档分块策略不合理**

当前使用的固定长度分块（512 tokens）会切断语义完整性。建议：
- 改用语义分块，按段落或章节切分
- 设置 10-15% 的重叠区域保持上下文连续性
- 对结构化文档（表格、列表）使用特殊处理逻辑

**2. Embedding 模型适配性不足**

当前使用的通用 embedding 模型对专业术语的表征能力有限：
- 考虑在领域数据上微调 embedding 模型
- 或切换到更适合中文的专业模型，如 \`bge-large-zh\`

**3. 检索策略单一**

目前仅使用向量相似度检索，缺少关键词匹配：
- 引入混合检索（Hybrid Search）：向量 + BM25
- 使用 RRF（Reciprocal Rank Fusion）融合两种检索结果
- 对查询进行意图分类，不同类型走不同检索路径

**4. 缺少查询改写**

用户的原始查询往往不够精确：
- 使用 LLM 对查询进行扩展和改写
- 实现 HyDE（Hypothetical Document Embeddings）策略
- 添加同义词和缩写的映射表`,
    citations: [
      { id: 1, title: 'RAG 最佳实践指南', source: '内部文档' },
      { id: 2, title: '向量检索优化白皮书', source: '技术论文' },
      { id: 3, title: 'HyDE 论文', source: 'arXiv' },
    ],
  },
  {
    role: 'user',
    content: '混合检索具体怎么实现？有没有现成的方案？',
  },
  {
    role: 'assistant',
    content: `混合检索的实现方案已经比较成熟，以下是推荐的技术栈和实现路径：

**推荐方案：RAGFlow 内置混合检索**

RAGFlow 已经原生支持混合检索，配置步骤：

1. 在知识库设置中开启「混合检索」模式
2. 设置向量检索和关键词检索的权重比例（建议 0.7:0.3）
3. 选择融合算法：RRF 或加权倒数排名

**自建方案：Elasticsearch + Milvus**

如果需要更精细的控制：
- **Milvus**：存储文档向量，支持 ANN 检索
- **Elasticsearch**：BM25 关键词检索 + 同义词扩展
- **融合层**：自定义 RRF 算法合并两路结果

两种方案各有优劣，建议先用 RAGFlow 内置方案验证效果，再根据需求决定是否自建。`,
    citations: [
      { id: 4, title: 'Milvus 混合检索文档', source: 'Milvus Docs' },
      { id: 5, title: 'Elasticsearch BM25 配置', source: 'ES Guide' },
    ],
  },
];

export default function DemoChat() {
  const [sessionsOpen, setSessionsOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState('');

  return (
    <div className="size-full flex">
      {/* Sessions Sidebar */}
      {sessionsOpen && (
        <aside className="w-[280px] shrink-0 border-r border-border-default flex flex-col bg-bg-surface">
          <div className="p-3 border-b border-border-default flex items-center justify-between">
            <h2 className="text-sm font-semibold">对话历史</h2>
            <button className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover">
              <Plus size={16} />
            </button>
          </div>
          <div className="p-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="搜索对话..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-bg-overlay rounded-md border border-border-default focus:outline-none focus:border-accent-default"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto px-1.5 pb-2 space-y-0.5">
            {mockSessions.map((s) => (
              <button
                key={s.id}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  s.active
                    ? 'bg-bg-overlay text-text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                <p className="truncate font-medium text-xs">{s.title}</p>
                <p className="text-xs text-text-muted mt-0.5">{s.time}</p>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Chat Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSessionsOpen(!sessionsOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              {sessionsOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-accent-subtle flex items-center justify-center">
                <Sparkles size={12} className="text-accent-default" />
              </div>
              <span className="text-sm font-medium">RAG 检索优化方案</span>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              settingsOpen
                ? 'bg-accent-subtle text-accent-default'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <Settings2 size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {mockMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-accent-default flex items-center justify-center mt-0.5">
                    <Sparkles size={14} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] ${
                    msg.role === 'user' ? 'bg-bg-overlay rounded-2xl rounded-br-md px-4 py-3' : ''
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose-content text-sm">
                      {msg.content.split('\n').map((line, j) => {
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return (
                            <p key={j} className="font-semibold text-text-primary mt-4 mb-1.5 first:mt-0">
                              {line.replace(/\*\*/g, '')}
                            </p>
                          );
                        }
                        if (line.startsWith('- ')) {
                          return (
                            <p
                              key={j}
                              className="pl-4 text-text-secondary before:content-['·'] before:mr-2 before:text-accent-default"
                            >
                              {line.slice(2)}
                            </p>
                          );
                        }
                        if (line.trim() === '') return <br key={j} />;
                        return (
                          <p key={j} className="text-text-secondary leading-relaxed">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-text-primary">{msg.content}</p>
                  )}

                  {/* Citations */}
                  {msg.citations && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {msg.citations.map((c) => (
                        <button
                          key={c.id}
                          className="inline-flex items-center gap-1 h-6 px-2 text-xs bg-accent-subtle text-accent-default rounded-full hover:bg-accent-tint transition-colors"
                        >
                          <BookOpen size={10} />[{c.id}] {c.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border-default bg-bg-surface">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-end gap-2">
              <button className="w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0">
                <Paperclip size={18} />
              </button>
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入消息..."
                  rows={1}
                  className="w-full resize-none bg-bg-overlay border border-border-default rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-default transition-colors"
                />
              </div>
              <button
                disabled={!input.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-default text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2 text-center">基于知识库「产品文档」回答 · 引用来源已标注</p>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {settingsOpen && (
        <aside className="w-[320px] shrink-0 border-l border-border-default bg-bg-surface flex flex-col">
          <div className="p-4 border-b border-border-default flex items-center justify-between">
            <h2 className="text-sm font-semibold">对话设置</h2>
            <button onClick={() => setSettingsOpen(false)} className="text-xs text-text-muted hover:text-text-primary">
              关闭
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-5">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">关联知识库</label>
              <div className="flex items-center gap-2 h-9 px-3 bg-bg-overlay border border-border-default rounded-lg text-sm">
                <BookOpen size={14} className="text-text-muted" />
                <span>产品文档</span>
                <ChevronDown size={14} className="ml-auto text-text-muted" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">模型</label>
              <div className="flex items-center gap-2 h-9 px-3 bg-bg-overlay border border-border-default rounded-lg text-sm">
                <Sparkles size={14} className="text-accent-default" />
                <span>GPT-4o</span>
                <ChevronDown size={14} className="ml-auto text-text-muted" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">Temperature</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue="0.3"
                  className="flex-1 accent-accent-default"
                />
                <span className="text-xs font-mono text-text-secondary w-8">0.3</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">Top-K</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  defaultValue="5"
                  className="flex-1 accent-accent-default"
                />
                <span className="text-xs font-mono text-text-secondary w-8">5</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-2 block">系统提示词</label>
              <textarea
                defaultValue="你是一个专业的技术文档助手。请基于提供的知识库内容回答问题，并标注引用来源。"
                rows={4}
                className="w-full text-xs bg-bg-overlay border border-border-default rounded-lg p-3 resize-none focus:outline-none focus:border-accent-default"
              />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
