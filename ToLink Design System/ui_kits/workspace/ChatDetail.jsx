/* ChatDetail.jsx — Full conversation view with AI thinking animation */

const mockMessages = [
  { id: 1, role: 'user', content: '大模型在自然语言处理中的应用有哪些？', time: '09:24' },
  { id: 2, role: 'assistant', content: '大模型在自然语言处理中的应用非常广泛，主要包括：\n\n1. **文本生成** — 如文章写作、摘要生成、对话系统等\n2. **文本理解** — 如情感分析、文本分类、命名实体识别等\n3. **机器翻译** — 提供更自然、准确的翻译结果\n4. **问答系统** — 基于知识库的智能问答\n5. **代码生成** — 根据自然语言描述生成代码\n\n这些应用正在不断发展，推动着 NLP 技术的边界。', time: '09:24', sources: ['ml_notes.pdf — 第3章', 'training.docx — 概述'] },
];

const suggestions = ['大模型训练的关键技术是什么？', '如何评估大模型的性能？'];

/* ── Thinking Animation (Claude Code style) ── */

function ThinkingDots() {
  const { dark } = useTheme();
  const t = useT();
  const dotCount = 5;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }}>
      {Array.from({ length: dotCount }).map((_, i) => (
        <div key={i} className="thinking-dot" style={{
          width: 6, height: 6, borderRadius: '50%',
          background: dark ? '#3B82F6' : t.primary,
          animationDelay: `${i * 0.15}s`,
        }} />
      ))}
    </div>
  );
}

function ThinkingBlock() {
  const { dark } = useTheme();
  const t = useT();
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <ThinkingDots />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: t.text40,
          }}>思考中 · {elapsed}s</span>
        </div>
        <div className="thinking-bar-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="thinking-bar" style={{
            height: 8, borderRadius: 4, width: '75%',
            background: dark ? '#2D2D2D' : 'rgba(26,26,26,0.04)',
            overflow: 'hidden', position: 'relative',
          }}>
            <div className="thinking-bar-shimmer" style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(90deg, transparent, ${dark ? 'rgba(59,130,246,0.12)' : 'rgba(212,163,115,0.12)'}, transparent)`,
            }} />
          </div>
          <div className="thinking-bar" style={{
            height: 8, borderRadius: 4, width: '55%',
            background: dark ? '#2D2D2D' : 'rgba(26,26,26,0.04)',
            overflow: 'hidden', position: 'relative',
          }}>
            <div className="thinking-bar-shimmer" style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(90deg, transparent, ${dark ? 'rgba(59,130,246,0.12)' : 'rgba(212,163,115,0.12)'}, transparent)`,
              animationDelay: '0.3s',
            }} />
          </div>
          <div className="thinking-bar" style={{
            height: 8, borderRadius: 4, width: '40%',
            background: dark ? '#2D2D2D' : 'rgba(26,26,26,0.04)',
            overflow: 'hidden', position: 'relative',
          }}>
            <div className="thinking-bar-shimmer" style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(90deg, transparent, ${dark ? 'rgba(59,130,246,0.12)' : 'rgba(212,163,115,0.12)'}, transparent)`,
              animationDelay: '0.6s',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Streaming text effect ── */

function StreamingText({ text, onDone }) {
  const [displayed, setDisplayed] = React.useState('');
  const [done, setDone] = React.useState(false);
  const idx = React.useRef(0);

  React.useEffect(() => {
    idx.current = 0;
    setDisplayed('');
    setDone(false);
    const interval = setInterval(() => {
      idx.current += Math.floor(Math.random() * 3) + 1;
      if (idx.current >= text.length) {
        idx.current = text.length;
        setDisplayed(text);
        setDone(true);
        clearInterval(interval);
        onDone && onDone();
      } else {
        setDisplayed(text.slice(0, idx.current));
      }
    }, 25);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      {!done && <span className="stream-cursor" style={{
        display: 'inline-block', width: 2, height: '1.1em',
        background: 'currentColor', marginLeft: 1,
        verticalAlign: 'text-bottom', opacity: 0.6,
      }} />}
    </span>
  );
}

/* ── Message Bubble ── */

function MessageBubble({ msg, isStreaming }) {
  const { dark } = useTheme();
  const t = useT();
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div style={{
          maxWidth: '70%', padding: '14px 20px', borderRadius: '18px 18px 4px 18px',
          background: dark ? 'rgba(59,130,246,0.12)' : t.primaryLight,
          border: `1px solid ${dark ? 'rgba(59,130,246,0.20)' : t.primaryMid}`,
          color: dark ? '#E0E0E0' : t.text,
          fontSize: 13, lineHeight: 1.6, fontWeight: 500,
        }}>
          {msg.content}
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: t.text40,
        }}>User · {msg.time}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, lineHeight: 1.75, color: dark ? '#CCCCCC' : 'rgba(26,26,26,0.80)',
          maxWidth: 560,
        }}>
          {isStreaming
            ? <StreamingText text={msg.content} />
            : msg.content.split('\n').map((line, i) => {
                const bold = line.match(/\*\*(.+?)\*\*/g);
                if (bold) {
                  const parts = line.split(/\*\*(.+?)\*\*/);
                  return <div key={i} style={{ marginBottom: 4 }}>{parts.map((p, j) =>
                    j % 2 === 1 ? <strong key={j} style={{ fontWeight: 700, color: dark ? '#E0E0E0' : t.text }}>{p}</strong> : p
                  )}</div>;
                }
                return line ? <div key={i} style={{ marginBottom: 4 }}>{line}</div> : <div key={i} style={{ height: 8 }} />;
              })
          }
        </div>
        {/* Sources */}
        {msg.sources && !isStreaming && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 12,
            background: dark ? '#252526' : 'rgba(244,241,237,0.50)',
            border: `1px solid ${t.border}`,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: t.text40, marginBottom: 2,
            }}>引用来源</span>
            {msg.sources.map((s, i) => (
              <span key={i} style={{
                fontSize: 11, color: dark ? '#858585' : 'rgba(26,26,26,0.55)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Icons.FileText size={11} style={{ flexShrink: 0 }} /> {s}
              </span>
            ))}
          </div>
        )}
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: t.text40, display: 'block', marginTop: 8,
        }}>AI · {msg.time}</span>
      </div>
    </div>
  );
}

/* ── Chat Detail Page ── */

function ChatDetailPage() {
  const { dark } = useTheme();
  const t = useT();
  const { go } = useRoute();
  const [messages, setMessages] = React.useState(mockMessages);
  const [input, setInput] = React.useState('');
  const [thinking, setThinking] = React.useState(false);
  const [streaming, setStreaming] = React.useState(null);
  const scrollRef = React.useRef(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  React.useEffect(() => { scrollToBottom(); }, [messages, thinking]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || thinking) return;
    const userMsg = { id: Date.now(), role: 'user', content: text, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    // Simulate thinking then streaming
    setTimeout(() => {
      setThinking(false);
      const aiMsg = {
        id: Date.now() + 1, role: 'assistant',
        content: '感谢你的提问！基于当前知识库中的文档，我为你整理了相关内容。\n\n根据已有资料，这个问题涉及多个层面的技术细节。文档中提到了几个关键的实现方案和最佳实践。\n\n建议你进一步查看引用来源中的原文，以获取更完整的上下文信息。',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        sources: ['RAG 实践笔记.md — 第2节', '大模型技术综述.docx — 第5章'],
      };
      setStreaming(aiMsg.id);
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => setStreaming(null), 3500);
    }, 2500 + Math.random() * 1500);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        height: 60, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: `1px solid ${dark ? '#3C3C3C' : 'rgba(26,26,26,0.06)'}`,
        background: t.frosted, backdropFilter: 'blur(12px)', flexShrink: 0,
      }}>
        <button data-icon-btn="true" onClick={() => go('chats')} style={{
          width: 32, height: 32, borderRadius: 10, border: 'none',
          background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.60)',
          cursor: 'pointer', color: t.text50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icons.ChevronLeft size={16} /></button>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15,
            letterSpacing: '-0.03em', color: dark ? '#E0E0E0' : t.text, margin: 0,
          }}>AI 技术问答助手</h2>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: t.text40,
          }}>通用知识库 · 2 条消息</span>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '28px 40px',
        display: 'flex', flexDirection: 'column', gap: 28,
      }}>
        {/* System tag */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: t.text40,
            padding: '6px 16px', border: `1px solid ${t.border}`, borderRadius: 9999,
          }}>System Initiated · 知识库已绑定</span>
        </div>

        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isStreaming={streaming === msg.id} />
        ))}

        {thinking && <ThinkingBlock />}

        {/* Suggestions */}
        {!thinking && !streaming && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {suggestions.map((s, i) => (
              <button key={i} data-clickable="true" onClick={() => { setInput(s); }} style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', padding: '8px 16px',
                border: `1px solid ${t.border}`, borderRadius: 9999,
                background: 'transparent', color: dark ? '#B0B0B0' : 'rgba(26,26,26,0.55)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s',
              }}>{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div style={{
        padding: '16px 40px 24px', flexShrink: 0,
        borderTop: `1px solid ${dark ? '#3C3C3C' : 'rgba(26,26,26,0.06)'}`,
        background: dark ? '#252526' : 'rgba(244,241,237,0.50)',
      }}>
        <div style={{ position: 'relative' }}>
          <input value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            placeholder="输入你的问题..."
            style={{
              width: '100%', padding: '16px 60px 16px 20px', borderRadius: 16,
              border: `1px solid ${t.border}`, fontSize: 13,
              background: dark ? '#2D2D2D' : '#FFFFFF',
              color: dark ? '#E0E0E0' : t.text, outline: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <button onClick={handleSend} disabled={thinking} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: 12, border: 'none',
            background: thinking ? t.text40 : '#7B6B5D', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: thinking ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
          }}>
            {thinking
              ? <Icons.Loader2 size={16} className="spin" />
              : <Icons.Send size={16} />
            }
          </button>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 8,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: t.text40,
          }}>Engine: Gemini-3-Ultra</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: t.text40,
          }}>按 Enter 发送</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ChatDetailPage, ThinkingBlock, ThinkingDots, StreamingText });
