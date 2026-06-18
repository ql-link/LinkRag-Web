/* @ds-bundle: {"format":3,"namespace":"ToLinkLinkRagDesignSystem_fa9960","components":[{"name":"Badge","sourcePath":"components/Badge/Badge.jsx"},{"name":"Button","sourcePath":"components/Button/Button.jsx"},{"name":"Card","sourcePath":"components/Card/Card.jsx"}],"sourceHashes":{"components/Badge/Badge.jsx":"cdc44987a217","components/Button/Button.jsx":"b0afae728523","components/Card/Card.jsx":"868edcf924fe","ui_kits/workspace/ChatDetail.jsx":"3419eb368318","ui_kits/workspace/ChatList.jsx":"9fb6e5cc9d8d","ui_kits/workspace/DatasetGrid.jsx":"1ea888bfdb51","ui_kits/workspace/Header.jsx":"e311e0ca4194","ui_kits/workspace/HomeCards.jsx":"2f77569ab405","ui_kits/workspace/SharedComponents.jsx":"2d1f7ea3e992","ui_kits/workspace/Sidebar.jsx":"09088f049a1f"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ToLinkLinkRagDesignSystem_fa9960 = window.ToLinkLinkRagDesignSystem_fa9960 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/Badge/Badge.jsx
try { (() => {
/* Badge — compact status / category label.
   8px radius, 10px uppercase tracked. Tone drives color from CSS vars. */

function Badge({
  children,
  tone = 'neutral',
  dot = false,
  icon = null
}) {
  const tones = {
    primary: {
      bg: 'var(--color-primary-light)',
      fg: 'var(--color-primary)',
      bd: 'var(--color-primary-mid)'
    },
    neutral: {
      bg: 'var(--color-bg-inset)',
      fg: 'var(--color-text-secondary)',
      bd: 'var(--color-border-subtle)'
    },
    success: {
      bg: 'rgba(34,197,94,0.10)',
      fg: 'var(--color-success)',
      bd: 'rgba(34,197,94,0.22)'
    },
    info: {
      bg: 'rgba(59,130,246,0.10)',
      fg: 'var(--color-info)',
      bd: 'rgba(59,130,246,0.22)'
    },
    error: {
      bg: 'rgba(217,115,115,0.10)',
      fg: 'var(--color-error)',
      bd: 'rgba(217,115,115,0.22)'
    },
    warning: {
      bg: 'rgba(245,158,11,0.10)',
      fg: 'var(--color-warning)',
      bd: 'rgba(245,158,11,0.22)'
    }
  };
  const c = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '5px 10px',
      borderRadius: 'var(--radius-sm)',
      fontFamily: 'var(--font-sans)',
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      lineHeight: 1,
      background: c.bg,
      color: c.fg,
      border: `1px solid ${c.bd}`
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'currentColor',
      flexShrink: 0
    }
  }), icon, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Badge/Badge.jsx", error: String((e && e.message) || e) }); }

// components/Button/Button.jsx
try { (() => {
/* Button — ToLink/LinkRag primary action control.
   Self-contained React component; themes via CSS custom properties
   (auto-adapts to .dark). Uppercase tracked label is the universal pattern. */

const {
  useState
} = React;
const BTN_SIZES = {
  sm: {
    padding: '7px 14px',
    fontSize: 11
  },
  md: {
    padding: '10px 18px',
    fontSize: 12
  },
  lg: {
    padding: '13px 22px',
    fontSize: 13
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button'
}) {
  const [hover, setHover] = useState(false);
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontFamily: 'var(--font-sans)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    lineHeight: 1,
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 'var(--radius-md)',
    transition: 'all var(--duration-sm) var(--ease-out)',
    width: fullWidth ? '100%' : 'auto',
    ...(BTN_SIZES[size] || BTN_SIZES.md)
  };
  const h = hover && !disabled;
  const variants = {
    primary: {
      background: 'var(--color-btn-primary)',
      color: 'var(--color-btn-text)',
      opacity: disabled ? 0.5 : h ? 0.9 : 1
    },
    ghost: {
      background: h ? 'var(--color-primary-hover)' : 'transparent',
      color: 'var(--color-text-secondary)',
      opacity: disabled ? 0.5 : 1
    },
    outline: {
      background: 'transparent',
      color: 'var(--color-text-main)',
      borderColor: h ? 'var(--color-primary)' : 'var(--color-border-subtle)',
      opacity: disabled ? 0.5 : 1
    },
    pill: {
      background: h ? 'var(--color-btn-primary)' : 'transparent',
      color: h ? 'var(--color-btn-text)' : 'var(--color-text-main)',
      borderColor: 'var(--color-border-subtle)',
      borderRadius: 'var(--radius-pill)',
      letterSpacing: '0.14em',
      opacity: disabled ? 0.5 : 1
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...base,
      ...(variants[variant] || variants.primary)
    }
  }, icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Button/Button.jsx", error: String((e && e.message) || e) }); }

// components/Card/Card.jsx
try { (() => {
/* Card — frosted action / content card.
   The signature surface: 16px radius, hairline border that warms to the
   primary accent on hover (when interactive), arrow nudge reveal. */

const {
  useState
} = React;
const ARROW = /*#__PURE__*/React.createElement("svg", {
  width: "14",
  height: "14",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M5 12h14"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 5l7 7-7 7"
}));
function Card({
  icon = null,
  title,
  description,
  meta = null,
  interactive = false,
  frosted = false,
  onClick,
  children
}) {
  const [hover, setHover] = useState(false);
  const h = interactive && hover;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      padding: 18,
      borderRadius: 'var(--radius-lg)',
      background: frosted ? 'var(--color-bg-card)' : 'var(--color-bg-card-solid)',
      backdropFilter: frosted ? 'blur(8px)' : undefined,
      WebkitBackdropFilter: frosted ? 'blur(8px)' : undefined,
      border: `1px solid ${h ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
      boxShadow: h ? 'var(--shadow-card-hover)' : 'none',
      cursor: interactive ? 'pointer' : 'default',
      transition: 'all var(--duration-lg) var(--ease-out)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      fontFamily: 'var(--font-sans)'
    }
  }, (icon || interactive) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--radius-md)',
      background: h ? 'var(--color-primary-mid)' : 'var(--color-primary-light)',
      color: 'var(--color-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background var(--duration-md) var(--ease-out)',
      flexShrink: 0
    }
  }, icon), interactive && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-primary)',
      opacity: h ? 1 : 0,
      transform: h ? 'translateX(2px)' : 'translateX(0)',
      transition: 'all var(--duration-md) var(--ease-out)',
      marginTop: 4
    }
  }, ARROW)), title && /*#__PURE__*/React.createElement("h4", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      margin: 0,
      color: 'var(--color-text-main)'
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      lineHeight: 1.5,
      margin: 0,
      color: 'var(--color-text-tertiary)'
    }
  }, description), children, meta && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--color-text-muted)'
    }
  }, meta));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Card/Card.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/ChatDetail.jsx
try { (() => {
/* ChatDetail.jsx — Full conversation view with AI thinking animation */

const mockMessages = [{
  id: 1,
  role: 'user',
  content: '大模型在自然语言处理中的应用有哪些？',
  time: '09:24'
}, {
  id: 2,
  role: 'assistant',
  content: '大模型在自然语言处理中的应用非常广泛，主要包括：\n\n1. **文本生成** — 如文章写作、摘要生成、对话系统等\n2. **文本理解** — 如情感分析、文本分类、命名实体识别等\n3. **机器翻译** — 提供更自然、准确的翻译结果\n4. **问答系统** — 基于知识库的智能问答\n5. **代码生成** — 根据自然语言描述生成代码\n\n这些应用正在不断发展，推动着 NLP 技术的边界。',
  time: '09:24',
  sources: ['ml_notes.pdf — 第3章', 'training.docx — 概述']
}];
const suggestions = ['大模型训练的关键技术是什么？', '如何评估大模型的性能？'];

/* ── Thinking Animation (Claude Code style) ── */

function ThinkingDots() {
  const {
    dark
  } = useTheme();
  const t = useT();
  const dotCount = 5;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 0'
    }
  }, Array.from({
    length: dotCount
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "thinking-dot",
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: dark ? '#3B82F6' : t.primary,
      animationDelay: `${i * 0.15}s`
    }
  })));
}
function ThinkingBlock() {
  const {
    dark
  } = useTheme();
  const t = useT();
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(ThinkingDots, null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: t.text40
    }
  }, "\u601D\u8003\u4E2D \xB7 ", elapsed, "s")), /*#__PURE__*/React.createElement("div", {
    className: "thinking-bar-group",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "thinking-bar",
    style: {
      height: 8,
      borderRadius: 4,
      width: '75%',
      background: dark ? '#2D2D2D' : 'rgba(26,26,26,0.04)',
      overflow: 'hidden',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "thinking-bar-shimmer",
    style: {
      position: 'absolute',
      inset: 0,
      background: `linear-gradient(90deg, transparent, ${dark ? 'rgba(59,130,246,0.12)' : 'rgba(212,163,115,0.12)'}, transparent)`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "thinking-bar",
    style: {
      height: 8,
      borderRadius: 4,
      width: '55%',
      background: dark ? '#2D2D2D' : 'rgba(26,26,26,0.04)',
      overflow: 'hidden',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "thinking-bar-shimmer",
    style: {
      position: 'absolute',
      inset: 0,
      background: `linear-gradient(90deg, transparent, ${dark ? 'rgba(59,130,246,0.12)' : 'rgba(212,163,115,0.12)'}, transparent)`,
      animationDelay: '0.3s'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "thinking-bar",
    style: {
      height: 8,
      borderRadius: 4,
      width: '40%',
      background: dark ? '#2D2D2D' : 'rgba(26,26,26,0.04)',
      overflow: 'hidden',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "thinking-bar-shimmer",
    style: {
      position: 'absolute',
      inset: 0,
      background: `linear-gradient(90deg, transparent, ${dark ? 'rgba(59,130,246,0.12)' : 'rgba(212,163,115,0.12)'}, transparent)`,
      animationDelay: '0.6s'
    }
  })))));
}

/* ── Streaming text effect ── */

function StreamingText({
  text,
  onDone
}) {
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
  return /*#__PURE__*/React.createElement("span", null, displayed, !done && /*#__PURE__*/React.createElement("span", {
    className: "stream-cursor",
    style: {
      display: 'inline-block',
      width: 2,
      height: '1.1em',
      background: 'currentColor',
      marginLeft: 1,
      verticalAlign: 'text-bottom',
      opacity: 0.6
    }
  }));
}

/* ── Message Bubble ── */

function MessageBubble({
  msg,
  isStreaming
}) {
  const {
    dark
  } = useTheme();
  const t = useT();
  const isUser = msg.role === 'user';
  if (isUser) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: '70%',
        padding: '14px 20px',
        borderRadius: '18px 18px 4px 18px',
        background: dark ? 'rgba(59,130,246,0.12)' : t.primaryLight,
        border: `1px solid ${dark ? 'rgba(59,130,246,0.20)' : t.primaryMid}`,
        color: dark ? '#E0E0E0' : t.text,
        fontSize: 13,
        lineHeight: 1.6,
        fontWeight: 500
      }
    }, msg.content), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: t.text40
      }
    }, "User \xB7 ", msg.time));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 1.75,
      color: dark ? '#CCCCCC' : 'rgba(26,26,26,0.80)',
      maxWidth: 560
    }
  }, isStreaming ? /*#__PURE__*/React.createElement(StreamingText, {
    text: msg.content
  }) : msg.content.split('\n').map((line, i) => {
    const bold = line.match(/\*\*(.+?)\*\*/g);
    if (bold) {
      const parts = line.split(/\*\*(.+?)\*\*/);
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          marginBottom: 4
        }
      }, parts.map((p, j) => j % 2 === 1 ? /*#__PURE__*/React.createElement("strong", {
        key: j,
        style: {
          fontWeight: 700,
          color: dark ? '#E0E0E0' : t.text
        }
      }, p) : p));
    }
    return line ? /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        marginBottom: 4
      }
    }, line) : /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        height: 8
      }
    });
  })), msg.sources && !isStreaming && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: '10px 14px',
      borderRadius: 12,
      background: dark ? '#252526' : 'rgba(244,241,237,0.50)',
      border: `1px solid ${t.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: t.text40,
      marginBottom: 2
    }
  }, "\u5F15\u7528\u6765\u6E90"), msg.sources.map((s, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      fontSize: 11,
      color: dark ? '#858585' : 'rgba(26,26,26,0.55)',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icons.FileText, {
    size: 11,
    style: {
      flexShrink: 0
    }
  }), " ", s))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: t.text40,
      display: 'block',
      marginTop: 8
    }
  }, "AI \xB7 ", msg.time)));
}

/* ── Chat Detail Page ── */

function ChatDetailPage() {
  const {
    dark
  } = useTheme();
  const t = useT();
  const {
    go
  } = useRoute();
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
  React.useEffect(() => {
    scrollToBottom();
  }, [messages, thinking]);
  const handleSend = () => {
    const text = input.trim();
    if (!text || thinking) return;
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    // Simulate thinking then streaming
    setTimeout(() => {
      setThinking(false);
      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '感谢你的提问！基于当前知识库中的文档，我为你整理了相关内容。\n\n根据已有资料，这个问题涉及多个层面的技术细节。文档中提到了几个关键的实现方案和最佳实践。\n\n建议你进一步查看引用来源中的原文，以获取更完整的上下文信息。',
        time: new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        sources: ['RAG 实践笔记.md — 第2节', '大模型技术综述.docx — 第5章']
      };
      setStreaming(aiMsg.id);
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => setStreaming(null), 3500);
    }, 2500 + Math.random() * 1500);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: 60,
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      borderBottom: `1px solid ${dark ? '#3C3C3C' : 'rgba(26,26,26,0.06)'}`,
      background: t.frosted,
      backdropFilter: 'blur(12px)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    "data-icon-btn": "true",
    onClick: () => go('chats'),
    style: {
      width: 32,
      height: 32,
      borderRadius: 10,
      border: 'none',
      background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.60)',
      cursor: 'pointer',
      color: t.text50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icons.ChevronLeft, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontStyle: 'italic',
      fontSize: 15,
      letterSpacing: '-0.03em',
      color: dark ? '#E0E0E0' : t.text,
      margin: 0
    }
  }, "AI \u6280\u672F\u95EE\u7B54\u52A9\u624B"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: t.text40
    }
  }, "\u901A\u7528\u77E5\u8BC6\u5E93 \xB7 2 \u6761\u6D88\u606F"))), /*#__PURE__*/React.createElement("div", {
    ref: scrollRef,
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '28px 40px',
      display: 'flex',
      flexDirection: 'column',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: t.text40,
      padding: '6px 16px',
      border: `1px solid ${t.border}`,
      borderRadius: 9999
    }
  }, "System Initiated \xB7 \u77E5\u8BC6\u5E93\u5DF2\u7ED1\u5B9A")), messages.map(msg => /*#__PURE__*/React.createElement(MessageBubble, {
    key: msg.id,
    msg: msg,
    isStreaming: streaming === msg.id
  })), thinking && /*#__PURE__*/React.createElement(ThinkingBlock, null), !thinking && !streaming && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, suggestions.map((s, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    "data-clickable": "true",
    onClick: () => {
      setInput(s);
    },
    style: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      padding: '8px 16px',
      border: `1px solid ${t.border}`,
      borderRadius: 9999,
      background: 'transparent',
      color: dark ? '#B0B0B0' : 'rgba(26,26,26,0.55)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      transition: 'all 0.2s'
    }
  }, s)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 40px 24px',
      flexShrink: 0,
      borderTop: `1px solid ${dark ? '#3C3C3C' : 'rgba(26,26,26,0.06)'}`,
      background: dark ? '#252526' : 'rgba(244,241,237,0.50)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: input,
    onChange: e => setInput(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') handleSend();
    },
    placeholder: "\u8F93\u5165\u4F60\u7684\u95EE\u9898...",
    style: {
      width: '100%',
      padding: '16px 60px 16px 20px',
      borderRadius: 16,
      border: `1px solid ${t.border}`,
      fontSize: 13,
      background: dark ? '#2D2D2D' : '#FFFFFF',
      color: dark ? '#E0E0E0' : t.text,
      outline: 'none',
      fontFamily: 'var(--font-sans)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleSend,
    disabled: thinking,
    style: {
      position: 'absolute',
      right: 8,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 40,
      height: 40,
      borderRadius: 12,
      border: 'none',
      background: thinking ? t.text40 : '#7B6B5D',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: thinking ? 'not-allowed' : 'pointer',
      transition: 'background 0.2s'
    }
  }, thinking ? /*#__PURE__*/React.createElement(Icons.Loader2, {
    size: 16,
    className: "spin"
  }) : /*#__PURE__*/React.createElement(Icons.Send, {
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: t.text40
    }
  }, "Engine: Gemini-3-Ultra"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: t.text40
    }
  }, "\u6309 Enter \u53D1\u9001"))));
}
Object.assign(window, {
  ChatDetailPage,
  ThinkingBlock,
  ThinkingDots,
  StreamingText
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/ChatDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/ChatList.jsx
try { (() => {
/* ChatList.jsx — Chats page with grid and create dialog */

const mockChats = [{
  id: 1,
  title: 'AI 技术问答助手',
  dataset: '通用知识库',
  time: '5分钟前',
  pinned: true
}, {
  id: 2,
  title: '文档总结助手',
  dataset: 'AI 研究库',
  time: '1小时前',
  pinned: false
}, {
  id: 3,
  title: '论文检索对话',
  dataset: '学术论文库',
  time: '昨天',
  pinned: false
}, {
  id: 4,
  title: 'RAG 技术探讨',
  dataset: '技术文档库',
  time: '3天前',
  pinned: false
}, {
  id: 5,
  title: '项目进度讨论',
  dataset: '项目管理库',
  time: '上周',
  pinned: false
}];
function ChatsPage() {
  const t = useT();
  const {
    dark
  } = useTheme();
  const {
    go
  } = useRoute();
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState('updatedAt');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [hoveredCard, setHoveredCard] = React.useState(null);
  const filtered = mockChats.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
  const sortLabel = sortBy === 'createdAt' ? '按创建时间排序' : '按更新时间排序';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u5BF9\u8BDD",
    breadcrumbs: [{
      label: '首页',
      page: 'home'
    }, {
      label: '对话'
    }]
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: search,
    onChange: setSearch,
    placeholder: "\u641C\u7D22\u5BF9\u8BDD..."
  }), /*#__PURE__*/React.createElement(SortButton, {
    label: sortLabel,
    onToggle: () => setSortBy(s => s === 'createdAt' ? 'updatedAt' : 'createdAt')
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: t.text50,
      marginBottom: 18,
      display: 'flex',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u5171 ", mockChats.length, " \u4E2A\u5BF9\u8BDD")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridAutoRows: 170,
      gap: 14
    }
  }, filtered.map(chat => {
    const hovered = hoveredCard === chat.id;
    return /*#__PURE__*/React.createElement("div", {
      key: chat.id,
      "data-card": "true",
      "data-clickable": "true",
      onMouseEnter: () => setHoveredCard(chat.id),
      onMouseLeave: () => setHoveredCard(null),
      onClick: () => go('chat-detail'),
      style: {
        borderRadius: 16,
        padding: 18,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        background: dark ? '#2D2D2D' : t.card,
        backdropFilter: dark ? 'none' : 'blur(8px)',
        border: `1px solid ${hovered ? dark ? '#4A4A4A' : t.borderMed : t.border}`,
        transition: 'all 0.2s'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 12,
        background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.60)',
        border: `1px solid ${t.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icons.MessageSquare, {
      size: 16,
      style: {
        color: dark ? '#BDBDBD' : '#7D746B'
      }
    })), /*#__PURE__*/React.createElement(Icons.ArrowRight, {
      size: 13,
      style: {
        color: hovered ? dark ? '#D0D0D0' : t.text50 : dark ? '#555' : t.text20,
        transform: hovered ? 'translateX(2px)' : 'none',
        transition: 'all 0.2s'
      }
    })), /*#__PURE__*/React.createElement("h3", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.02em',
        margin: '0 0 4px',
        color: dark ? '#E0E0E0' : t.text,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }
    }, chat.title), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 12,
        color: dark ? '#CCCCCC' : 'rgba(26,26,26,0.65)',
        margin: '0 0 8px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, chat.dataset), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 'auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: t.text50
      }
    }, "\u66F4\u65B0\u4E8E ", chat.time), chat.pinned && /*#__PURE__*/React.createElement("span", {
      style: {
        padding: '3px 8px',
        borderRadius: 8,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.70)',
        color: dark ? '#BDBDBD' : 'rgba(26,26,26,0.55)',
        border: `1px solid ${t.border}`
      }
    }, "\u7F6E\u9876")));
  }), /*#__PURE__*/React.createElement("div", {
    onClick: () => setDialogOpen(true),
    style: {
      borderRadius: 16,
      border: `1px dashed ${t.border}`,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: t.text40,
      transition: 'all 0.2s',
      background: dark ? '#2D2D2D' : t.card
    }
  }, /*#__PURE__*/React.createElement(Icons.Plus, {
    size: 22,
    style: {
      marginBottom: 6
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    }
  }, "\u65B0\u5EFA\u5BF9\u8BDD")))), dialogOpen && /*#__PURE__*/React.createElement(DialogOverlay, {
    onClose: () => setDialogOpen(false)
  }, /*#__PURE__*/React.createElement(DialogBox, {
    title: "\u65B0\u5EFA\u5BF9\u8BDD",
    onClose: () => setDialogOpen(false)
  }, /*#__PURE__*/React.createElement(DialogField, {
    label: "\u5BF9\u8BDD\u540D\u79F0"
  }, /*#__PURE__*/React.createElement(DialogInput, {
    placeholder: "\u8F93\u5165\u5BF9\u8BDD\u540D\u79F0"
  })), /*#__PURE__*/React.createElement(DialogField, {
    label: "\u5173\u8054\u6570\u636E\u96C6\uFF08\u5355\u9009\uFF09"
  }, /*#__PURE__*/React.createElement(DialogSelect, {
    options: ['通用知识库', 'AI 研究库', '学术论文库', '技术文档库'],
    placeholder: "\u8BF7\u9009\u62E9\u4E00\u4E2A\u6570\u636E\u96C6"
  })), /*#__PURE__*/React.createElement(DialogFooter, {
    onCancel: () => setDialogOpen(false),
    confirmLabel: "\u521B\u5EFA"
  }))));
}

/* ── Shared Dialog Components ── */

function DialogOverlay({
  children,
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dialog-backdrop",
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.50)',
      backdropFilter: 'blur(4px)'
    }
  }), children);
}
function DialogBox({
  title,
  onClose,
  children
}) {
  const t = useT();
  const {
    dark
  } = useTheme();
  return /*#__PURE__*/React.createElement("div", {
    className: "dialog-box",
    style: {
      position: 'relative',
      width: 440,
      borderRadius: 16,
      background: dark ? '#252526' : '#FFFFFF',
      border: `1px solid ${t.border}`,
      boxShadow: '0 16px 48px rgba(26,26,26,0.18)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 22px',
      borderBottom: `1px solid ${dark ? '#3C3C3C' : 'rgba(26,26,26,0.06)'}`
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color: dark ? '#E0E0E0' : t.text,
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      width: 30,
      height: 30,
      borderRadius: 10,
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: t.text50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icons.X, {
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, children));
}
function DialogField({
  label,
  children
}) {
  const t = useT();
  const {
    dark
  } = useTheme();
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      marginBottom: 6,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: dark ? '#CCCCCC' : t.text
    }
  }, label), children);
}
function DialogInput({
  placeholder,
  value,
  onChange
}) {
  const t = useT();
  const {
    dark
  } = useTheme();
  return /*#__PURE__*/React.createElement("input", {
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    style: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      fontSize: 13,
      background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.50)',
      color: dark ? '#E0E0E0' : t.text,
      outline: 'none',
      fontFamily: 'var(--font-sans)'
    }
  });
}
function DialogSelect({
  options,
  placeholder
}) {
  const t = useT();
  const {
    dark
  } = useTheme();
  return /*#__PURE__*/React.createElement("select", {
    style: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      fontSize: 13,
      background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.50)',
      color: dark ? '#E0E0E0' : t.text,
      outline: 'none',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), options.map((o, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: o
  }, o)));
}
function DialogFooter({
  onCancel,
  confirmLabel = '确认'
}) {
  const t = useT();
  const {
    dark
  } = useTheme();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10,
      padding: '14px 0 0',
      marginTop: 4,
      borderTop: `1px solid ${dark ? '#3C3C3C' : 'rgba(26,26,26,0.06)'}`
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    style: {
      padding: '8px 16px',
      borderRadius: 12,
      border: 'none',
      background: 'transparent',
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: dark ? '#CCCCCC' : 'rgba(26,26,26,0.65)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '8px 16px',
      borderRadius: 12,
      border: 'none',
      background: t.btnBg,
      color: t.btnText,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, confirmLabel));
}
Object.assign(window, {
  ChatsPage,
  DialogOverlay,
  DialogBox,
  DialogField,
  DialogInput,
  DialogSelect,
  DialogFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/ChatList.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/DatasetGrid.jsx
try { (() => {
/* DatasetGrid.jsx — Datasets page + Files page */

const mockDatasets = [{
  id: 1,
  name: '通用知识库',
  desc: '包含常见问题和基础知识文档',
  status: '已启用',
  time: '2025/01/15'
}, {
  id: 2,
  name: 'AI 研究库',
  desc: '深度学习、NLP、计算机视觉论文',
  status: '已启用',
  time: '2025/01/14'
}, {
  id: 3,
  name: '学术论文库',
  desc: '顶会论文与综述文档集合',
  status: '已启用',
  time: '2025/01/10'
}, {
  id: 4,
  name: '技术文档库',
  desc: 'API 文档、部署指南、运维手册',
  status: '已停用',
  time: '2025/01/08'
}, {
  id: 5,
  name: '项目管理库',
  desc: '需求文档、设计稿、会议纪要',
  status: '已启用',
  time: '2024/12/28'
}];
function DatasetsPage() {
  const t = useT();
  const {
    dark
  } = useTheme();
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState('updatedAt');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [hoveredCard, setHoveredCard] = React.useState(null);
  const filtered = mockDatasets.filter(d => `${d.name} ${d.desc}`.toLowerCase().includes(search.toLowerCase()));
  const sortLabel = sortBy === 'createdAt' ? '按创建时间排序' : '按更新时间排序';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u77E5\u8BC6\u5E93",
    breadcrumbs: [{
      label: '首页',
      page: 'home'
    }, {
      label: '知识库'
    }]
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: search,
    onChange: setSearch,
    placeholder: "\u641C\u7D22\u77E5\u8BC6\u5E93..."
  }), /*#__PURE__*/React.createElement(SortButton, {
    label: sortLabel,
    onToggle: () => setSortBy(s => s === 'createdAt' ? 'updatedAt' : 'createdAt')
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: t.text50,
      marginBottom: 18
    }
  }, "\u5171 ", mockDatasets.length, " \u4E2A\u77E5\u8BC6\u5E93"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridAutoRows: 170,
      gap: 14
    }
  }, filtered.map(ds => {
    const hovered = hoveredCard === ds.id;
    return /*#__PURE__*/React.createElement("div", {
      key: ds.id,
      "data-card": "true",
      "data-clickable": "true",
      onMouseEnter: () => setHoveredCard(ds.id),
      onMouseLeave: () => setHoveredCard(null),
      style: {
        borderRadius: 16,
        padding: 18,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: dark ? '#2D2D2D' : t.card,
        backdropFilter: dark ? 'none' : 'blur(8px)',
        border: `1px solid ${hovered ? t.primary : t.border}`,
        transition: 'all 0.2s'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 12,
        background: dark ? 'rgba(9,71,113,0.30)' : t.primaryMid,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icons.Database, {
      size: 16,
      style: {
        color: t.primary
      }
    }))), /*#__PURE__*/React.createElement("h3", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        margin: '0 0 3px',
        color: hovered ? t.primary : dark ? '#E0E0E0' : t.text,
        transition: 'color 0.2s'
      }
    }, ds.name), ds.desc && /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 11,
        lineHeight: 1.4,
        margin: '0 0 6px',
        minHeight: 0,
        color: dark ? '#858585' : 'rgba(26,26,26,0.55)',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }
    }, ds.desc), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 'auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: t.text50
      }
    }, ds.status), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: t.text50
      }
    }, ds.time)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 0.2s'
      }
    }, /*#__PURE__*/React.createElement("button", {
      "data-icon-btn": "true",
      style: {
        width: 28,
        height: 28,
        borderRadius: 8,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: dark ? '#858585' : 'rgba(26,26,26,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icons.Pencil, {
      size: 13
    })), /*#__PURE__*/React.createElement("button", {
      "data-icon-btn": "true",
      style: {
        width: 28,
        height: 28,
        borderRadius: 8,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: dark ? '#858585' : 'rgba(26,26,26,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icons.Trash2, {
      size: 13
    })))));
  }), /*#__PURE__*/React.createElement("div", {
    onClick: () => setDialogOpen(true),
    style: {
      borderRadius: 16,
      border: `1px dashed ${t.border}`,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: t.text40,
      transition: 'all 0.2s',
      background: dark ? '#2D2D2D' : t.card
    }
  }, /*#__PURE__*/React.createElement(Icons.Plus, {
    size: 22,
    style: {
      marginBottom: 6
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    }
  }, "\u6DFB\u52A0\u77E5\u8BC6\u5E93")))), dialogOpen && /*#__PURE__*/React.createElement(DialogOverlay, {
    onClose: () => setDialogOpen(false)
  }, /*#__PURE__*/React.createElement(DialogBox, {
    title: "\u65B0\u5EFA\u77E5\u8BC6\u5E93",
    onClose: () => setDialogOpen(false)
  }, /*#__PURE__*/React.createElement(DialogField, {
    label: "\u77E5\u8BC6\u5E93\u540D\u79F0"
  }, /*#__PURE__*/React.createElement(DialogInput, {
    placeholder: "\u8F93\u5165\u77E5\u8BC6\u5E93\u540D\u79F0"
  })), /*#__PURE__*/React.createElement(DialogField, {
    label: "\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09"
  }, /*#__PURE__*/React.createElement(DialogInput, {
    placeholder: "\u8F93\u5165\u77E5\u8BC6\u5E93\u63CF\u8FF0"
  })), /*#__PURE__*/React.createElement(DialogFooter, {
    onCancel: () => setDialogOpen(false),
    confirmLabel: "\u521B\u5EFA"
  }))));
}

/* ── Files Page ── */

const mockFiles = [{
  id: 1,
  name: '人工智能发展报告.pdf',
  type: 'PDF',
  size: '2.4 MB',
  dataset: '通用知识库',
  status: '解析完成',
  statusColor: '#22C55E',
  time: '2025/01/15 14:30'
}, {
  id: 2,
  name: '大模型技术综述.docx',
  type: 'DOCX',
  size: '1.8 MB',
  dataset: 'AI 研究库',
  status: '解析完成',
  statusColor: '#22C55E',
  time: '2025/01/14 09:15'
}, {
  id: 3,
  name: 'RAG 实践笔记.md',
  type: 'MD',
  size: '156 KB',
  dataset: '技术文档库',
  status: '解析中',
  statusColor: '#3B82F6',
  time: '2025/01/15 16:42'
}, {
  id: 4,
  name: '训练数据标注指南.pdf',
  type: 'PDF',
  size: '4.1 MB',
  dataset: 'AI 研究库',
  status: '待解析',
  statusColor: '',
  time: '2025/01/13 11:20'
}, {
  id: 5,
  name: '向量数据库对比.docx',
  type: 'DOCX',
  size: '890 KB',
  dataset: '技术文档库',
  status: '解析失败',
  statusColor: '#D97373',
  time: '2025/01/12 08:55'
}];
function FilesPage() {
  const t = useT();
  const {
    dark
  } = useTheme();
  const [search, setSearch] = React.useState('');
  const filtered = mockFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u6587\u4EF6",
    breadcrumbs: [{
      label: '首页',
      page: 'home'
    }, {
      label: '文件'
    }]
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: search,
    onChange: setSearch,
    placeholder: "\u641C\u7D22\u6587\u4EF6..."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: t.text50,
      marginBottom: 18,
      display: 'flex',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u5171 ", filtered.length, " \u4E2A\u6587\u4EF6"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: dark ? '#3C3C3C' : 'rgba(26,26,26,0.15)'
    }
  }, "|"), /*#__PURE__*/React.createElement("span", null, "\u652F\u6301 md / pdf / docx / txt")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 16,
      padding: 14,
      cursor: 'pointer',
      border: `1px dashed ${t.border}`,
      background: dark ? 'rgba(45,45,45,0.60)' : '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      color: t.text50,
      transition: 'all 0.2s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 12,
      background: dark ? 'rgba(9,71,113,0.30)' : t.primaryLight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icons.Plus, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: dark ? '#E0E0E0' : t.text,
      margin: 0
    }
  }, "\u4E0A\u4F20\u6587\u4EF6"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: t.text40,
      margin: '3px 0 0'
    }
  }, "\u5148\u9009\u62E9\u76EE\u6807\u77E5\u8BC6\u5E93\uFF0C\u518D\u6DFB\u52A0\u6587\u4EF6"))), filtered.map(file => /*#__PURE__*/React.createElement("div", {
    key: file.id,
    "data-card": "true",
    style: {
      borderRadius: 12,
      padding: '12px 16px',
      background: dark ? '#2D2D2D' : t.card,
      backdropFilter: dark ? 'none' : 'blur(8px)',
      border: `1px solid ${t.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      transition: 'border-color 0.2s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 10,
      flexShrink: 0,
      background: dark ? 'rgba(9,71,113,0.30)' : t.primaryLight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icons.FileText, {
    size: 15,
    style: {
      color: t.primary
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: dark ? '#E0E0E0' : t.text,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, file.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      flexShrink: 0,
      color: file.statusColor || t.text40
    }
  }, file.status)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 4,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      background: dark ? 'rgba(59,130,246,0.10)' : t.primaryLight,
      color: t.primary,
      border: `1px solid ${dark ? 'rgba(59,130,246,0.20)' : t.primaryMid}`
    }
  }, file.dataset), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: t.text50
    }
  }, file.type), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: t.text50
    }
  }, file.size), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: t.text40
    }
  }, file.time))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '5px 10px',
      borderRadius: 8,
      border: 'none',
      background: dark ? '#094771' : t.primary,
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Icons.Wand2, {
    size: 11
  }), " \u89E3\u6790"), /*#__PURE__*/React.createElement("button", {
    "data-icon-btn": "true",
    style: {
      width: 28,
      height: 28,
      borderRadius: 8,
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: t.text40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icons.Trash2, {
    size: 13
  }))))))));
}
Object.assign(window, {
  DatasetsPage,
  FilesPage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/DatasetGrid.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/Header.jsx
try { (() => {
/* Header.jsx — Page header with breadcrumb */

function Breadcrumb({
  items
}) {
  const t = useT();
  const {
    dark
  } = useTheme();
  const {
    go
  } = useRoute();
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, items.map((item, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement(Icons.ChevronRight, {
    size: 11,
    style: {
      color: t.text30
    }
  }), item.page ? /*#__PURE__*/React.createElement("a", {
    onClick: () => go(item.page),
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: dark ? '#858585' : t.text50,
      cursor: 'pointer',
      textDecoration: 'none'
    }
  }, item.label) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: dark ? '#B0B0B0' : 'rgba(26,26,26,0.70)'
    }
  }, item.label))));
}
function PageHeader({
  title,
  breadcrumbs,
  children
}) {
  const t = useT();
  const {
    dark
  } = useTheme();
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 72,
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
      background: t.frosted,
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${dark ? '#3C3C3C' : 'rgba(26,26,26,0.06)'}`,
      borderRadius: '24px 24px 0 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement(Breadcrumb, {
    items: breadcrumbs
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontStyle: 'italic',
      fontSize: 18,
      letterSpacing: '-0.03em',
      color: dark ? '#E0E0E0' : t.text,
      margin: 0
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, children));
}
function SearchInput({
  value,
  onChange,
  placeholder = '搜索...'
}) {
  const t = useT();
  const {
    dark
  } = useTheme();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Icons.Search, {
    size: 13,
    style: {
      position: 'absolute',
      left: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      color: dark ? '#858585' : t.text30
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: e => onChange(e.target.value),
    placeholder: placeholder,
    style: {
      width: 180,
      paddingLeft: 32,
      paddingRight: 14,
      paddingTop: 7,
      paddingBottom: 7,
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      fontSize: 12,
      background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.50)',
      color: dark ? '#E0E0E0' : t.text,
      outline: 'none',
      fontFamily: 'var(--font-sans)'
    }
  }));
}
function SortButton({
  label,
  onToggle
}) {
  const t = useT();
  const {
    dark
  } = useTheme();
  return /*#__PURE__*/React.createElement("button", {
    onClick: onToggle,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 12px',
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.50)',
      fontSize: 12,
      color: dark ? '#E0E0E0' : t.text,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement(Icons.ArrowUpDown, {
    size: 13,
    style: {
      color: t.text40
    }
  }), /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(window, {
  Breadcrumb,
  PageHeader,
  SearchInput,
  SortButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/HomeCards.jsx
try { (() => {
/* HomeCards.jsx — Home dashboard */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  if (h < 22) return '晚上好';
  return '夜深了';
}
const quickActions = [{
  id: 'chats',
  icon: Icons.MessageSquarePlus,
  title: '快速会话',
  desc: '直接新建一个对话，马上开始问答'
}, {
  id: 'files',
  icon: Icons.FileUp,
  title: '上传文档',
  desc: '导入 PDF、Word、Markdown'
}, {
  id: 'chats',
  icon: Icons.MessagesSquare,
  title: '知识问答',
  desc: '基于引用片段生成回答'
}, {
  id: 'datasets',
  icon: Icons.DatabaseZap,
  title: '管理知识库',
  desc: '维护数据集与索引状态'
}];
const recentFiles = [{
  name: '人工智能发展报告.pdf',
  time: '2小时前'
}, {
  name: '大模型技术综述.docx',
  time: '昨天'
}, {
  name: 'RAG 实践笔记.md',
  time: '3天前'
}];
const recentChats = [{
  name: 'AI 技术问答助手',
  time: '5分钟前'
}, {
  name: '文档总结助手',
  time: '1小时前'
}, {
  name: '论文检索对话',
  time: '昨天'
}];
function HomePage() {
  const t = useT();
  const {
    dark
  } = useTheme();
  const {
    go
  } = useRoute();
  const [hoveredCard, setHoveredCard] = React.useState(null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u6982\u89C8",
    breadcrumbs: [{
      label: '首页',
      page: 'home'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '28px 28px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      letterSpacing: '-0.02em',
      color: dark ? '#E0E0E0' : t.text,
      margin: '0 0 6px'
    }
  }, getGreeting(), "\uFF0C", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontStyle: 'italic',
      letterSpacing: '-0.03em'
    }
  }, "Alex Chen")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: dark ? '#858585' : 'rgba(26,26,26,0.55)',
      margin: 0
    }
  }, "\u9009\u62E9\u4E00\u4E2A\u5165\u53E3\uFF0C\u7EE7\u7EED\u5904\u7406\u6587\u6863\u3001\u77E5\u8BC6\u5E93\u6216\u5BF9\u8BDD\u4EFB\u52A1\u3002")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14,
      marginBottom: 28
    }
  }, quickActions.map((a, i) => {
    const hovered = hoveredCard === i;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      "data-card": "true",
      "data-clickable": "true",
      onMouseEnter: () => setHoveredCard(i),
      onMouseLeave: () => setHoveredCard(null),
      onClick: () => go(a.id),
      style: {
        padding: 18,
        borderRadius: 16,
        cursor: 'pointer',
        border: `1px solid ${hovered ? t.primary : t.border}`,
        background: dark ? '#2D2D2D' : '#FFFFFF',
        boxShadow: hovered ? '0 4px 16px rgba(26,26,26,0.10)' : 'none',
        transition: 'all 0.3s'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: 12,
        background: dark ? 'rgba(59,130,246,0.10)' : t.primaryLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: t.primary,
        transition: 'background 0.2s',
        ...(hovered ? {
          background: dark ? 'rgba(59,130,246,0.20)' : t.primaryMid
        } : {})
      }
    }, /*#__PURE__*/React.createElement(a.icon, {
      size: 20,
      strokeWidth: 1.8
    })), /*#__PURE__*/React.createElement(Icons.ArrowRight, {
      size: 14,
      style: {
        color: t.primary,
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateX(2px)' : 'translateX(0)',
        transition: 'all 0.2s',
        marginTop: 4
      }
    })), /*#__PURE__*/React.createElement("h4", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        margin: '0 0 4px',
        color: dark ? '#E0E0E0' : t.text
      }
    }, a.title), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 11,
        color: dark ? '#858585' : 'rgba(26,26,26,0.55)',
        margin: 0,
        lineHeight: 1.5
      }
    }, a.desc));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(RecentSection, {
    title: "\u6700\u8FD1\u6587\u6863",
    link: "files",
    items: recentFiles,
    go: go
  }), /*#__PURE__*/React.createElement(RecentSection, {
    title: "\u6700\u8FD1\u5BF9\u8BDD",
    link: "chats",
    items: recentChats,
    go: go
  }))));
}
function RecentSection({
  title,
  link,
  items,
  go
}) {
  const t = useT();
  const {
    dark
  } = useTheme();
  return /*#__PURE__*/React.createElement("section", {
    style: {
      borderRadius: 16,
      padding: 18,
      background: dark ? '#2D2D2D' : '#FFFFFF',
      border: `1px solid ${t.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: t.text50,
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement("a", {
    onClick: () => go(link),
    style: {
      fontSize: 9,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: t.text50,
      cursor: 'pointer',
      textDecoration: 'none'
    }
  }, "\u67E5\u770B\u5168\u90E8")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, items.map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: i < items.length - 1 ? `1px solid ${dark ? '#3C3C3C' : 'rgba(26,26,26,0.06)'}` : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: dark ? '#E0E0E0' : t.text
    }
  }, item.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: t.text50
    }
  }, item.time)))));
}
Object.assign(window, {
  HomePage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/HomeCards.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/SharedComponents.jsx
try { (() => {
/* SharedComponents.jsx — ToLink Design System base components */

/* ── Lucide Icon subset (inline SVG) ── */
function LIcon({
  d,
  size = 18,
  strokeWidth = 2,
  className = '',
  style = {}
}) {
  return React.createElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    style
  }, Array.isArray(d) ? d.map((p, i) => React.createElement('path', {
    key: i,
    d: p
  })) : React.createElement('path', {
    d
  }));
}
const Icons = {
  Home: p => LIcon({
    ...p,
    d: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10']
  }),
  Database: p => LIcon({
    ...p,
    d: ['M4 6c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2z', 'M4 6v6c0 1.1 3.6 2 8 2s8-.9 8-2V6', 'M4 12v6c0 1.1 3.6 2 8 2s8-.9 8-2v-6']
  }),
  MessageSquare: p => LIcon({
    ...p,
    d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
  }),
  FolderOpen: p => LIcon({
    ...p,
    d: ['M6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2']
  }),
  Cpu: p => LIcon({
    ...p,
    d: ['M5 5h14v14H5z', 'M9 1v3', 'M15 1v3', 'M9 20v3', 'M15 20v3', 'M1 9h3', 'M1 15h3', 'M20 9h3', 'M20 15h3']
  }),
  BarChart3: p => LIcon({
    ...p,
    d: ['M18 20V10', 'M12 20V4', 'M6 20v-6']
  }),
  ChevronLeft: p => LIcon({
    ...p,
    d: 'M15 18l-6-6 6-6'
  }),
  ChevronRight: p => LIcon({
    ...p,
    d: 'M9 18l6-6-6-6'
  }),
  Sun: p => LIcon({
    ...p,
    d: ['M12 1v2', 'M12 21v2', 'M4.22 4.22l1.42 1.42', 'M18.36 18.36l1.42 1.42', 'M1 12h2', 'M21 12h2', 'M4.22 19.78l1.42-1.42', 'M18.36 5.64l1.42-1.42', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z']
  }),
  Moon: p => LIcon({
    ...p,
    d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'
  }),
  User: p => LIcon({
    ...p,
    d: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z']
  }),
  LogOut: p => LIcon({
    ...p,
    d: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9']
  }),
  Settings: p => LIcon({
    ...p,
    d: ['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z']
  }),
  Search: p => LIcon({
    ...p,
    d: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M21 21l-4.35-4.35']
  }),
  Plus: p => LIcon({
    ...p,
    d: ['M12 5v14', 'M5 12h14']
  }),
  X: p => LIcon({
    ...p,
    d: ['M18 6L6 18', 'M6 6l12 12']
  }),
  ArrowRight: p => LIcon({
    ...p,
    d: ['M5 12h14', 'M12 5l7 7-7 7']
  }),
  Send: p => LIcon({
    ...p,
    d: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z']
  }),
  Upload: p => LIcon({
    ...p,
    d: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12']
  }),
  FileText: p => LIcon({
    ...p,
    d: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8']
  }),
  Sparkles: p => LIcon({
    ...p,
    d: ['M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z', 'M20 3v4', 'M22 5h-4']
  }),
  DatabaseZap: p => LIcon({
    ...p,
    d: ['M4 6c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2z', 'M4 6v6c0 1.1 3.6 2 8 2s8-.9 8-2V6', 'M4 12v6c0 1.1 3.6 2 8 2', 'M13 18l3-5h-4l3-5']
  }),
  MessageSquarePlus: p => LIcon({
    ...p,
    d: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', 'M12 7v6', 'M9 10h6']
  }),
  Trash2: p => LIcon({
    ...p,
    d: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6']
  }),
  Pencil: p => LIcon({
    ...p,
    d: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z']
  }),
  Wand2: p => LIcon({
    ...p,
    d: ['M15 4V2', 'M15 16v-2', 'M8 9h2', 'M20 9h2', 'M17.8 11.8L19 13', 'M15 9h0', 'M17.8 6.2L19 5', 'M11 6.2L9.8 5', 'M11 11.8L9.8 13', 'M2 22l10-10']
  }),
  RefreshCw: p => LIcon({
    ...p,
    d: ['M21 2v6h-6', 'M3 12a9 9 0 0 1 15-6.7L21 8', 'M3 22v-6h6', 'M21 12a9 9 0 0 1-15 6.7L3 16']
  }),
  ArrowUpDown: p => LIcon({
    ...p,
    d: ['M7 15l5 5 5-5', 'M7 9l5-5 5 5']
  }),
  Loader2: p => LIcon({
    ...p,
    d: 'M21 12a9 9 0 1 1-6.219-8.56'
  }),
  AlertCircle: p => LIcon({
    ...p,
    d: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 8v4', 'M12 16h.01']
  }),
  MessagesSquare: p => LIcon({
    ...p,
    d: ['M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z', 'M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1']
  }),
  FileUp: p => LIcon({
    ...p,
    d: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M12 18v-6', 'M9 15l3-3 3 3']
  })
};
Object.assign(window, {
  Icons,
  LIcon
});

/* ── Theme Context ── */
const ThemeContext = React.createContext({
  dark: false,
  toggle: () => {}
});
function ThemeProvider({
  children
}) {
  const [dark, setDark] = React.useState(false);
  const toggle = React.useCallback(() => setDark(d => !d), []);
  return React.createElement(ThemeContext.Provider, {
    value: {
      dark,
      toggle
    }
  }, children);
}
function useTheme() {
  return React.useContext(ThemeContext);
}
Object.assign(window, {
  ThemeContext,
  ThemeProvider,
  useTheme
});

/* ── Route Context ── */
const RouteContext = React.createContext({
  page: 'home',
  go: () => {}
});
function RouteProvider({
  children
}) {
  const [page, setPage] = React.useState('home');
  const go = React.useCallback(p => setPage(p), []);
  return React.createElement(RouteContext.Provider, {
    value: {
      page,
      go
    }
  }, children);
}
function useRoute() {
  return React.useContext(RouteContext);
}
Object.assign(window, {
  RouteContext,
  RouteProvider,
  useRoute
});

/* ── Utility: cn ── */
function cn(...args) {
  return args.filter(Boolean).join(' ');
}
window.cn = cn;

/* ── Shared style tokens (used in inline styles) ── */
const T = {
  light: {
    bg: '#F4F1ED',
    card: 'rgba(255,255,255,0.50)',
    cardSolid: '#FFFFFF',
    frosted: 'rgba(255,255,255,0.80)',
    inset: 'rgba(244,241,237,0.30)',
    text: '#1A1A1A',
    text70: 'rgba(26,26,26,0.70)',
    text50: 'rgba(26,26,26,0.50)',
    text40: 'rgba(26,26,26,0.40)',
    text30: 'rgba(26,26,26,0.30)',
    text20: 'rgba(26,26,26,0.20)',
    border: 'rgba(26,26,26,0.10)',
    borderMed: 'rgba(26,26,26,0.18)',
    primary: '#D4A373',
    primaryLight: 'rgba(212,163,115,0.10)',
    primaryMid: 'rgba(212,163,115,0.20)',
    primaryHover: 'rgba(212,163,115,0.05)',
    btnBg: '#7B6B5D',
    btnText: '#FFFFFF'
  },
  dark: {
    bg: '#1E1E1E',
    card: '#2D2D2D',
    cardSolid: '#2D2D2D',
    frosted: '#252526',
    inset: '#252526',
    text: '#CCCCCC',
    text70: '#E0E0E0',
    text50: '#858585',
    text40: '#6B6B6B',
    text30: '#5B5B5B',
    text20: '#4A4A4A',
    border: '#3C3C3C',
    borderMed: '#4A4A4A',
    primary: '#3B82F6',
    primaryLight: 'rgba(59,130,246,0.10)',
    primaryMid: 'rgba(59,130,246,0.20)',
    primaryHover: 'rgba(59,130,246,0.05)',
    btnBg: '#094771',
    btnText: '#FFFFFF'
  }
};
function useT() {
  const {
    dark
  } = useTheme();
  return dark ? T.dark : T.light;
}
Object.assign(window, {
  T,
  useT
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/SharedComponents.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/Sidebar.jsx
try { (() => {
/* Sidebar.jsx — Collapsible sidebar navigation */

const navItems = [{
  id: 'home',
  name: '首页',
  Icon: Icons.Home
}, {
  id: 'datasets',
  name: '知识库',
  Icon: Icons.Database
}, {
  id: 'chats',
  name: '对话',
  Icon: Icons.MessageSquare
}, {
  id: 'files',
  name: '文件',
  Icon: Icons.FolderOpen
}, {
  id: 'llm',
  name: 'LLM 配置',
  Icon: Icons.Cpu
}, {
  id: 'usage',
  name: '用量',
  Icon: Icons.BarChart3
}];
function Sidebar() {
  const {
    dark,
    toggle
  } = useTheme();
  const {
    page,
    go
  } = useRoute();
  const t = useT();
  const [collapsed, setCollapsed] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const sidebarStyles = {
    width: collapsed ? 72 : 200,
    borderRadius: 24,
    border: `1px solid ${t.border}`,
    background: t.frosted,
    backdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
    transition: 'width 0.3s ease',
    boxShadow: '0 1px 3px rgba(26,26,26,0.06)'
  };
  return /*#__PURE__*/React.createElement("aside", {
    style: sidebarStyles
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 72,
      display: 'flex',
      alignItems: 'center',
      gap: collapsed ? 0 : 10,
      padding: collapsed ? '0' : '0 20px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      background: dark ? '#1E1E1E' : 'rgba(255,255,255,0.50)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: collapsed ? 38 : 30,
      height: collapsed ? 38 : 30,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: dark ? '#1E1E1E' : 'rgba(255,255,255,0.90)',
      padding: 3,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/linkrag-mark-v2.png",
    alt: "LinkRag",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      ...(dark ? {
        filter: 'saturate(0.96) brightness(0.96)'
      } : {})
    }
  })), !collapsed && /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontStyle: 'italic',
      fontSize: 16,
      letterSpacing: '-0.03em',
      color: dark ? '#E0E0E0' : t.text,
      margin: 0
    }
  }, "LinkRag")), /*#__PURE__*/React.createElement("nav", {
    style: {
      flex: 1,
      padding: collapsed ? '20px 6px' : '20px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      overflowY: 'auto',
      overflowX: 'hidden',
      background: dark ? '#1E1E1E' : 'rgba(244,241,237,0.30)'
    }
  }, navItems.map(({
    id,
    name,
    Icon
  }) => {
    const active = page === id;
    return /*#__PURE__*/React.createElement("a", {
      key: id,
      "data-nav": "true",
      onClick: () => go(id),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? '10px 0' : '10px 14px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 14,
        cursor: 'pointer',
        position: 'relative',
        background: active ? dark ? '#2F2F2F' : 'rgba(255,255,255,0.85)' : 'transparent',
        border: active ? `1px solid ${dark ? '#434343' : 'rgba(255,255,255,0.80)'}` : '1px solid transparent',
        boxShadow: active ? '0 1px 3px rgba(26,26,26,0.06)' : 'none',
        color: active ? dark ? '#F0F0F0' : t.text : t.text50,
        textDecoration: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      size: 18,
      style: {
        flexShrink: 0,
        color: active ? dark ? '#E0E0E0' : t.text : dark ? '#858585' : 'rgba(26,26,26,0.45)'
      }
    }), !collapsed && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      }
    }, name), active && !collapsed && /*#__PURE__*/React.createElement("div", {
      className: "active-dot",
      style: {
        position: 'absolute',
        right: 14,
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: dark ? '#D7D7D7' : t.primary
      }
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: collapsed ? '12px 6px' : '12px 14px',
      alignItems: collapsed ? 'center' : 'stretch',
      background: t.frosted
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: toggle,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: collapsed ? '8px 0' : '8px 8px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      borderRadius: 12,
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: t.text50,
      marginBottom: 8,
      width: collapsed ? 40 : '100%'
    }
  }, dark ? /*#__PURE__*/React.createElement(Icons.Sun, {
    size: 16
  }) : /*#__PURE__*/React.createElement(Icons.Moon, {
    size: 16
  }), !collapsed && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em'
    }
  }, dark ? '日间模式' : '夜间模式')), /*#__PURE__*/React.createElement("div", {
    ref: menuRef,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMenu(!showMenu),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: collapsed ? '8px 0' : '10px 8px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      borderRadius: 14,
      border: 'none',
      cursor: 'pointer',
      background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.30)',
      width: collapsed ? 44 : '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: '50%',
      flexShrink: 0,
      background: dark ? '#3C3C3C' : 'rgba(212,163,115,0.20)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icons.User, {
    size: 13,
    style: {
      color: dark ? '#E0E0E0' : 'rgba(26,26,26,0.55)'
    }
  })), !collapsed && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      color: dark ? '#E0E0E0' : t.text,
      margin: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, "Alex Chen"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 8,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: t.text50,
      margin: 0
    }
  }, "Pro Member")))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCollapsed(!collapsed),
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '8px 0',
      marginTop: 8,
      borderRadius: 12,
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: t.text40,
      width: '100%'
    }
  }, collapsed ? /*#__PURE__*/React.createElement(Icons.ChevronRight, {
    size: 18
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icons.ChevronLeft, {
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em'
    }
  }, "\u6536\u8D77")))));
}
Object.assign(window, {
  Sidebar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/Sidebar.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

})();
