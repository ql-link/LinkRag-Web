/* ChatList.jsx — Chats page with grid and create dialog */

const mockChats = [
  { id: 1, title: 'AI 技术问答助手', dataset: '通用知识库', time: '5分钟前', pinned: true },
  { id: 2, title: '文档总结助手', dataset: 'AI 研究库', time: '1小时前', pinned: false },
  { id: 3, title: '论文检索对话', dataset: '学术论文库', time: '昨天', pinned: false },
  { id: 4, title: 'RAG 技术探讨', dataset: '技术文档库', time: '3天前', pinned: false },
  { id: 5, title: '项目进度讨论', dataset: '项目管理库', time: '上周', pinned: false },
];

function ChatsPage() {
  const t = useT();
  const { dark } = useTheme();
  const { go } = useRoute();
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState('updatedAt');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [hoveredCard, setHoveredCard] = React.useState(null);

  const filtered = mockChats.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
  const sortLabel = sortBy === 'createdAt' ? '按创建时间排序' : '按更新时间排序';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="对话"
        breadcrumbs={[{ label: '首页', page: 'home' }, { label: '对话' }]}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="搜索对话..." />
        <SortButton label={sortLabel} onToggle={() => setSortBy(s => s === 'createdAt' ? 'updatedAt' : 'createdAt')} />
      </PageHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: t.text50, marginBottom: 18,
          display: 'flex', gap: 18,
        }}>
          <span>共 {mockChats.length} 个对话</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: 170, gap: 14 }}>
          {filtered.map(chat => {
            const hovered = hoveredCard === chat.id;
            return (
              <div key={chat.id}
                data-card="true"
                data-clickable="true"
                onMouseEnter={() => setHoveredCard(chat.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => go('chat-detail')}
                style={{
                  borderRadius: 16, padding: 18, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  background: dark ? '#2D2D2D' : t.card,
                  backdropFilter: dark ? 'none' : 'blur(8px)',
                  border: `1px solid ${hovered ? (dark ? '#4A4A4A' : t.borderMed) : t.border}`,
                  transition: 'all 0.2s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.60)',
                    border: `1px solid ${t.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icons.MessageSquare size={16} style={{ color: dark ? '#BDBDBD' : '#7D746B' }} />
                  </div>
                  <Icons.ArrowRight size={13} style={{
                    color: hovered ? (dark ? '#D0D0D0' : t.text50) : (dark ? '#555' : t.text20),
                    transform: hovered ? 'translateX(2px)' : 'none', transition: 'all 0.2s',
                  }} />
                </div>
                <h3 style={{
                  fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', margin: '0 0 4px',
                  color: dark ? '#E0E0E0' : t.text,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{chat.title}</h3>
                <p style={{ fontSize: 12, color: dark ? '#CCCCCC' : 'rgba(26,26,26,0.65)', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chat.dataset}
                </p>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: t.text50,
                  }}>更新于 {chat.time}</span>
                  {chat.pinned && (
                    <span style={{
                      padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase',
                      background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.70)',
                      color: dark ? '#BDBDBD' : 'rgba(26,26,26,0.55)',
                      border: `1px solid ${t.border}`,
                    }}>置顶</span>
                  )}
                </div>
              </div>
            );
          })}
          {/* Add new */}
          <div onClick={() => setDialogOpen(true)} style={{
            borderRadius: 16, border: `1px dashed ${t.border}`, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: t.text40, transition: 'all 0.2s',
            background: dark ? '#2D2D2D' : t.card,
          }}>
            <Icons.Plus size={22} style={{ marginBottom: 6 }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>新建对话</span>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      {dialogOpen && (
        <DialogOverlay onClose={() => setDialogOpen(false)}>
          <DialogBox title="新建对话" onClose={() => setDialogOpen(false)}>
            <DialogField label="对话名称">
              <DialogInput placeholder="输入对话名称" />
            </DialogField>
            <DialogField label="关联数据集（单选）">
              <DialogSelect options={['通用知识库', 'AI 研究库', '学术论文库', '技术文档库']} placeholder="请选择一个数据集" />
            </DialogField>
            <DialogFooter onCancel={() => setDialogOpen(false)} confirmLabel="创建" />
          </DialogBox>
        </DialogOverlay>
      )}
    </div>
  );
}

/* ── Shared Dialog Components ── */

function DialogOverlay({ children, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="dialog-backdrop" onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)',
      }} />
      {children}
    </div>
  );
}

function DialogBox({ title, onClose, children }) {
  const t = useT();
  const { dark } = useTheme();
  return (
    <div className="dialog-box" style={{
      position: 'relative', width: 440, borderRadius: 16,
      background: dark ? '#252526' : '#FFFFFF',
      border: `1px solid ${t.border}`,
      boxShadow: '0 16px 48px rgba(26,26,26,0.18)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 22px', borderBottom: `1px solid ${dark ? '#3C3C3C' : 'rgba(26,26,26,0.06)'}`,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: dark ? '#E0E0E0' : t.text, margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{
          width: 30, height: 30, borderRadius: 10, border: 'none',
          background: 'transparent', cursor: 'pointer', color: t.text50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icons.X size={16} /></button>
      </div>
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function DialogField({ label, children }) {
  const t = useT();
  const { dark } = useTheme();
  return (
    <div>
      <label style={{
        display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: dark ? '#CCCCCC' : t.text,
      }}>{label}</label>
      {children}
    </div>
  );
}

function DialogInput({ placeholder, value, onChange }) {
  const t = useT();
  const { dark } = useTheme();
  return (
    <input placeholder={placeholder} value={value} onChange={onChange} style={{
      width: '100%', padding: '10px 14px', borderRadius: 12,
      border: `1px solid ${t.border}`, fontSize: 13,
      background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.50)',
      color: dark ? '#E0E0E0' : t.text, outline: 'none',
      fontFamily: 'var(--font-sans)',
    }} />
  );
}

function DialogSelect({ options, placeholder }) {
  const t = useT();
  const { dark } = useTheme();
  return (
    <select style={{
      width: '100%', padding: '10px 14px', borderRadius: 12,
      border: `1px solid ${t.border}`, fontSize: 13,
      background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.50)',
      color: dark ? '#E0E0E0' : t.text, outline: 'none',
      fontFamily: 'var(--font-sans)',
    }}>
      <option value="">{placeholder}</option>
      {options.map((o, i) => <option key={i} value={o}>{o}</option>)}
    </select>
  );
}

function DialogFooter({ onCancel, confirmLabel = '确认' }) {
  const t = useT();
  const { dark } = useTheme();
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end', gap: 10,
      padding: '14px 0 0', marginTop: 4,
      borderTop: `1px solid ${dark ? '#3C3C3C' : 'rgba(26,26,26,0.06)'}`,
    }}>
      <button onClick={onCancel} style={{
        padding: '8px 16px', borderRadius: 12, border: 'none',
        background: 'transparent', fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: dark ? '#CCCCCC' : 'rgba(26,26,26,0.65)', cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
      }}>取消</button>
      <button style={{
        padding: '8px 16px', borderRadius: 12, border: 'none',
        background: t.btnBg, color: t.btnText, fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
      }}>{confirmLabel}</button>
    </div>
  );
}

Object.assign(window, { ChatsPage, DialogOverlay, DialogBox, DialogField, DialogInput, DialogSelect, DialogFooter });
