/* Sidebar.jsx — Collapsible sidebar navigation */

const navItems = [
  { id: 'home', name: '首页', Icon: Icons.Home },
  { id: 'datasets', name: '知识库', Icon: Icons.Database },
  { id: 'chats', name: '对话', Icon: Icons.MessageSquare },
  { id: 'files', name: '文件', Icon: Icons.FolderOpen },
  { id: 'llm', name: 'LLM 配置', Icon: Icons.Cpu },
  { id: 'usage', name: '用量', Icon: Icons.BarChart3 },
];

function Sidebar() {
  const { dark, toggle } = useTheme();
  const { page, go } = useRoute();
  const t = useT();
  const [collapsed, setCollapsed] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sidebarStyles = {
    width: collapsed ? 72 : 200,
    borderRadius: 24, border: `1px solid ${t.border}`,
    background: t.frosted, backdropFilter: 'blur(12px)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    flexShrink: 0, transition: 'width 0.3s ease',
    boxShadow: '0 1px 3px rgba(26,26,26,0.06)',
  };

  return (
    <aside style={sidebarStyles}>
      {/* Logo */}
      <div style={{
        height: 72, display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
        padding: collapsed ? '0' : '0 20px', justifyContent: collapsed ? 'center' : 'flex-start',
        background: dark ? '#1E1E1E' : 'rgba(255,255,255,0.50)',
      }}>
        <div style={{
          width: collapsed ? 38 : 30, height: collapsed ? 38 : 30, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: dark ? '#1E1E1E' : 'rgba(255,255,255,0.90)', padding: 3, flexShrink: 0,
        }}>
          <img src="../../assets/linkrag-mark-v2.png" alt="LinkRag" style={{
            width: '100%', height: '100%', objectFit: 'contain',
            ...(dark ? { filter: 'saturate(0.96) brightness(0.96)' } : {}),
          }} />
        </div>
        {!collapsed && (
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16,
            letterSpacing: '-0.03em', color: dark ? '#E0E0E0' : t.text, margin: 0,
          }}>LinkRag</h1>
        )}
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1, padding: collapsed ? '20px 6px' : '20px 10px',
        display: 'flex', flexDirection: 'column', gap: 4,
        overflowY: 'auto', overflowX: 'hidden',
        background: dark ? '#1E1E1E' : 'rgba(244,241,237,0.30)',
      }}>
        {navItems.map(({ id, name, Icon }) => {
          const active = page === id;
          return (
            <a key={id} data-nav="true" onClick={() => go(id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: collapsed ? '10px 0' : '10px 14px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 14, cursor: 'pointer', position: 'relative',
              background: active
                ? (dark ? '#2F2F2F' : 'rgba(255,255,255,0.85)')
                : 'transparent',
              border: active
                ? `1px solid ${dark ? '#434343' : 'rgba(255,255,255,0.80)'}`
                : '1px solid transparent',
              boxShadow: active ? '0 1px 3px rgba(26,26,26,0.06)' : 'none',
              color: active ? (dark ? '#F0F0F0' : t.text) : t.text50,
              textDecoration: 'none',
            }}>
              <Icon size={18} style={{ flexShrink: 0, color: active ? (dark ? '#E0E0E0' : t.text) : (dark ? '#858585' : 'rgba(26,26,26,0.45)') }} />
              {!collapsed && (
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{name}</span>
              )}
              {active && !collapsed && (
                <div className="active-dot" style={{
                  position: 'absolute', right: 14, width: 5, height: 5,
                  borderRadius: '50%', background: dark ? '#D7D7D7' : t.primary,
                }} />
              )}
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        flexShrink: 0, display: 'flex', flexDirection: 'column',
        padding: collapsed ? '12px 6px' : '12px 14px', alignItems: collapsed ? 'center' : 'stretch',
        background: t.frosted,
      }}>
        {/* Theme toggle */}
        <button onClick={toggle} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: collapsed ? '8px 0' : '8px 8px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer',
          color: t.text50, marginBottom: 8,
          width: collapsed ? 40 : '100%',
        }}>
          {dark ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
          {!collapsed && (
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {dark ? '日间模式' : '夜间模式'}
            </span>
          )}
        </button>

        {/* User area */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowMenu(!showMenu)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '8px 0' : '10px 8px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 14, border: 'none', cursor: 'pointer',
            background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.30)',
            width: collapsed ? 44 : '100%',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: dark ? '#3C3C3C' : 'rgba(212,163,115,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icons.User size={13} style={{ color: dark ? '#E0E0E0' : 'rgba(26,26,26,0.55)' }} />
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: dark ? '#E0E0E0' : t.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Alex Chen</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.12em', color: t.text50, margin: 0 }}>Pro Member</p>
              </div>
            )}
          </button>
        </div>

        {/* Collapse */}
        <button onClick={() => setCollapsed(!collapsed)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '8px 0', marginTop: 8, borderRadius: 12, border: 'none',
          background: 'transparent', cursor: 'pointer', color: t.text40, width: '100%',
        }}>
          {collapsed
            ? <Icons.ChevronRight size={18} />
            : <><Icons.ChevronLeft size={18} /><span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>收起</span></>
          }
        </button>
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar });
