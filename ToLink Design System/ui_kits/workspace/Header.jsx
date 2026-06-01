/* Header.jsx — Page header with breadcrumb */

function Breadcrumb({ items }) {
  const t = useT();
  const { dark } = useTheme();
  const { go } = useRoute();
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Icons.ChevronRight size={11} style={{ color: t.text30 }} />}
          {item.page ? (
            <a onClick={() => go(item.page)} style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: dark ? '#858585' : t.text50,
              cursor: 'pointer', textDecoration: 'none',
            }}>{item.label}</a>
          ) : (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: dark ? '#B0B0B0' : 'rgba(26,26,26,0.70)',
            }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

function PageHeader({ title, breadcrumbs, children }) {
  const t = useT();
  const { dark } = useTheme();
  return (
    <header style={{
      height: 72, padding: '0 28px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexShrink: 0,
      background: t.frosted, backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${dark ? '#3C3C3C' : 'rgba(26,26,26,0.06)'}`,
      borderRadius: '24px 24px 0 0',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Breadcrumb items={breadcrumbs} />
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 18,
          letterSpacing: '-0.03em', color: dark ? '#E0E0E0' : t.text, margin: 0,
        }}>{title}</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {children}
      </div>
    </header>
  );
}

function SearchInput({ value, onChange, placeholder = '搜索...' }) {
  const t = useT();
  const { dark } = useTheme();
  return (
    <div style={{ position: 'relative' }}>
      <Icons.Search size={13} style={{
        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
        color: dark ? '#858585' : t.text30,
      }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: 180, paddingLeft: 32, paddingRight: 14, paddingTop: 7, paddingBottom: 7,
          borderRadius: 12, border: `1px solid ${t.border}`, fontSize: 12,
          background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.50)',
          color: dark ? '#E0E0E0' : t.text, outline: 'none',
          fontFamily: 'var(--font-sans)',
        }}
      />
    </div>
  );
}

function SortButton({ label, onToggle }) {
  const t = useT();
  const { dark } = useTheme();
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '7px 12px', borderRadius: 12, border: `1px solid ${t.border}`,
      background: dark ? '#2D2D2D' : 'rgba(244,241,237,0.50)',
      fontSize: 12, color: dark ? '#E0E0E0' : t.text,
      cursor: 'pointer', fontFamily: 'var(--font-sans)',
    }}>
      <Icons.ArrowUpDown size={13} style={{ color: t.text40 }} />
      <span>{label}</span>
    </button>
  );
}

Object.assign(window, { Breadcrumb, PageHeader, SearchInput, SortButton });
