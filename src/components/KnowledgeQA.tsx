import React from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Message } from '../types';

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      '大模型在自然语言处理中的应用非常广泛，主要包括：\n\n1. 文本生成：如文章写作、摘要生成、对话系统等\n2. 文本理解：如情感分析、文本分类、命名实体识别等\n3. 机器翻译：提供更自然、准确的翻译结果\n4. 问答系统：基于知识库的智能问答\n5. 代码生成：根据自然语言描述生成代码\n\n这些应用正在不断发展，推动着NLP技术的边界。',
    suggestions: ['大模型训练的关键技术是什么？', '如何评估大模型的性能？'],
  },
];

export const KnowledgeQA: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-sm">
      <div className="flex-1 overflow-y-auto px-12 py-10 space-y-12">
        <div className="flex justify-center">
          <div className="mono-label px-4 py-2 border border-border-subtle inline-block rounded-full">
            System Initiated // Node Analysis
          </div>
        </div>

        <div className="flex flex-col items-end space-y-2">
          <div className="bg-primary/10 text-text-main text-xs font-bold uppercase tracking-widest px-6 py-4 border border-primary/20 max-w-[80%] rounded-2xl rounded-tr-none">
            大模型在自然语言处理中的应用有哪些？
          </div>
          <span className="mono-label">User Query // 09:24</span>
        </div>

        {INITIAL_MESSAGES.map((msg) => (
          <div key={msg.id} className="space-y-6">
            <div className="flex gap-8">
              <div className="w-10 h-10 border border-text-main flex items-center justify-center shrink-0 rounded-xl">
                <Sparkles size={18} />
              </div>
              <div className="space-y-8 flex-1">
                <div className="serif-heading text-2xl leading-snug border-l-2 border-primary pl-8 py-2">
                  {msg.content.split('\n\n')[0]}
                </div>

                <div className="space-y-4 text-sm leading-relaxed text-text-main/70 max-w-2xl bg-bg-base/30 p-6 rounded-2xl border border-border-subtle">
                  {msg.content
                    .split('\n\n')
                    .slice(1)
                    .map((para, i) => (
                      <div key={i} className="font-mono text-[11px] uppercase tracking-wide">
                        {para.split('\n').map((line, j) => (
                          <div key={j} className="mb-1">
                            {line}
                          </div>
                        ))}
                      </div>
                    ))}
                </div>

                {msg.suggestions && (
                  <div className="flex flex-wrap gap-3 pt-4">
                    {msg.suggestions.map((s, i) => (
                      <button
                        key={i}
                        className="text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 border border-border-subtle hover:bg-text-main hover:text-white transition-all rounded-full"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <span className="mono-label">AI Response // Synthesized</span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-12 py-8 border-t border-border-subtle bg-bg-base/50">
        <div className="relative group">
          <input
            type="text"
            placeholder="TYPE YOUR INQUIRY..."
            className="w-full bg-white art-border py-6 pl-8 pr-20 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-0 focus:border-text-main transition-all placeholder:text-text-main/20 rounded-2xl"
          />
          <button className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#7B6B5D] text-white flex items-center justify-center hover:bg-[#8A7662] transition-colors rounded-xl">
            <Send size={18} />
          </button>
        </div>
        <div className="flex justify-between items-center mt-4">
          <span className="mono-label">Engine: Gemini-3-Ultra</span>
          <span className="mono-label">Press Enter to Transmit</span>
        </div>
      </div>
    </div>
  );
};
