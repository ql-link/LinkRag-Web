/* Workspace Dashboard — synced to LinkRag dev branch (Dashboard.tsx).
   Three columns: nav sidebar · Knowledge Synthesis Q&A · graph + vault.
   Re-skinned to the Claude editorial system (cream / coral / serif / dark).
   Exports Dashboard to window for index.html. */

const { useState } = React;

const I = (p) => (
  <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={p.w || 1.7} strokeLinecap="round" strokeLinejoin="round" style={p.style}>{p.children}</svg>
);
const Home = (p) => <I {...p}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></I>;
const Upload = (p) => <I {...p}><path d="M12 16V4"/><path d="M8 8l4-4 4 4"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></I>;
const Msg = (p) => <I {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></I>;
const Share = (p) => <I {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></I>;
const Spark = (p) => <I {...p}><path d="M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-5L6 9.4l4.4-1.6z"/></I>;
const Send = (p) => <I {...p}><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></I>;
const Bell = (p) => <I {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></I>;
const Help = (p) => <I {...p}><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></I>;
const ChevL = (p) => <I {...p}><path d="M15 18l-6-6 6-6"/></I>;
const Arrow = (p) => <I {...p}><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></I>;

const mono = { fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)' };

/* ───────── Left nav ───────── */
function NavItem({ icon, label, active }) {
  const [h, setH] = useState(false);
  return (
    <a href="#" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
       style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, textDecoration: 'none',
         position: 'relative', transition: 'background 160ms',
         background: active ? 'var(--ink)' : h ? 'var(--surface-soft)' : 'transparent',
         color: active ? 'var(--on-dark)' : 'var(--muted)' }}>
      <span style={{ color: active ? 'var(--primary)' : 'inherit', display: 'flex' }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: active ? 'var(--on-dark)' : 'var(--body)' }}>{label}</span>
      {active && <span style={{ position: 'absolute', right: 14, width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />}
    </a>
  );
}

function Sidebar() {
  return (
    <aside style={{ width: 220, flexShrink: 0, background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 72, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', borderBottom: '1px solid var(--hairline)' }}>
        <img src="../../assets/linkrag-mark-v2.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 19, letterSpacing: '-0.02em', color: 'var(--ink)' }}>LinkRag</span>
      </div>
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <NavItem icon={<Home />} label="首页" active />
        <NavItem icon={<Upload />} label="文件上传" />
        <NavItem icon={<Msg />} label="知识问答" />
        <NavItem icon={<Share />} label="知识图谱" />
      </nav>
      <div style={{ padding: 16, borderTop: '1px solid var(--hairline)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 12, background: 'var(--surface-soft)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', opacity: 0.9, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>Alex Chen</p>
            <p style={{ margin: 0, ...mono, fontSize: 9 }}>Pro Member</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ───────── Center: Knowledge Synthesis Q&A ───────── */
function QА() {
  const detail = ['01 — 文本生成：文章写作、摘要、对话系统', '02 — 文本理解：情感分析、文本分类、实体识别', '03 — 机器翻译：更自然准确的翻译结果', '04 — 问答系统：基于知识库的智能问答'];
  return (
    <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-card-solid, #fff)', border: '1px solid var(--hairline)', borderRadius: 16, overflow: 'hidden' }}>
      <header style={{ height: 72, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--hairline)' }}>
        <div>
          <div style={{ ...mono, color: 'var(--primary)' }}>Active Intelligence</div>
          <h2 style={{ margin: '2px 0 0', fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 24, letterSpacing: '-0.015em', color: 'var(--ink)' }}>Knowledge Synthesis</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, color: 'var(--muted)' }}>
          <Help s={18} />
          <span style={{ width: 1, height: 16, background: 'var(--hairline)' }} />
          <span style={{ position: 'relative', display: 'flex' }}><Bell s={18} /><span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} /></span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px', display: 'flex', flexDirection: 'column', gap: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{ ...mono, border: '1px solid var(--hairline)', borderRadius: 9999, padding: '7px 16px' }}>System Initiated // Node Analysis</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ background: 'var(--primary-light, rgba(204,120,92,0.1))', border: '1px solid rgba(204,120,92,0.22)', color: 'var(--ink)', fontSize: 14, padding: '14px 18px', borderRadius: '14px 14px 2px 14px', maxWidth: '78%' }}>
            大模型在自然语言处理中的应用有哪些？
          </div>
          <span style={mono}>User Query // 09:24</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink)' }}><Spark s={18} /></div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 24, lineHeight: 1.35, letterSpacing: '-0.01em', color: 'var(--ink)', borderLeft: '2px solid var(--primary)', paddingLeft: 22 }}>
              大模型已广泛应用于文本生成、理解、翻译与问答系统
            </div>
            <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--hairline)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {detail.map((d) => <div key={d} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--body)', lineHeight: 1.5 }}>{d}</div>)}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['大模型训练的关键技术是什么？', '如何评估大模型的性能？'].map((s) => (
                <button key={s} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--body)', background: 'transparent', border: '1px solid var(--hairline)', borderRadius: 9999, padding: '7px 14px', cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 48px', borderTop: '1px solid var(--hairline)', background: 'var(--surface-soft)' }}>
        <div style={{ position: 'relative' }}>
          <input placeholder="输入你的问题…" style={{ width: '100%', background: '#fff', border: '1px solid var(--hairline)', borderRadius: 12, padding: '18px 64px 18px 20px', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
          <button style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Send s={18} /></button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={mono}>Engine · Claude-Opus-4</span>
          <span style={mono}>Press Enter to Transmit</span>
        </div>
      </div>
    </main>
  );
}

/* ───────── Right: graph + vault ───────── */
const GNODES = [
  { x: 50, y: 28, label: '大模型', core: true },
  { x: 22, y: 14, label: '自然语言处理' },
  { x: 80, y: 16, label: '核心技术' },
  { x: 84, y: 52, label: '应用场景' },
  { x: 18, y: 56, label: '评估方法' },
  { x: 40, y: 74, label: '文本生成' },
  { x: 70, y: 80, label: '对话系统' },
];
const GLINKS = [[0,1],[0,2],[0,3],[0,4],[1,5],[3,6]];

function Graph() {
  return (
    <div style={{ position: 'relative', height: '100%', background: 'var(--surface-soft)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden' }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {GLINKS.map(([a, b], i) => (
          <line key={i} x1={`${GNODES[a].x}%`} y1={`${GNODES[a].y}%`} x2={`${GNODES[b].x}%`} y2={`${GNODES[b].y}%`} stroke="var(--ink)" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="2,2" />
        ))}
      </svg>
      {GNODES.map((n) => (
        <div key={n.label} style={{ position: 'absolute', left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%,-50%)',
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap',
          padding: '4px 9px', borderRadius: 9999, border: '1px solid var(--ink)',
          background: n.core ? 'var(--ink)' : 'var(--canvas)', color: n.core ? 'var(--on-dark)' : 'var(--ink)' }}>
          {n.label}
        </div>
      ))}
      <div style={{ position: 'absolute', bottom: 14, left: 14, display: 'flex', gap: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono, fontSize: 9 }}><span style={{ width: 8, height: 8, background: 'var(--ink)' }} />Core Node</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono, fontSize: 9 }}><span style={{ width: 8, height: 8, border: '1px solid var(--ink)' }} />Entity</span>
      </div>
    </div>
  );
}

const FILES = [
  { t: 'PDF', n: '人工智能发展报告.pdf' },
  { t: 'DOCX', n: '大模型技术综述.docx' },
  { t: 'PPTX', n: '自然语言处理导论.pptx' },
];

function Vault() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {FILES.map((f) => {
        const [h, setH] = useState(false);
        return (
          <div key={f.n} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', borderRadius: 12, border: '1px solid var(--hairline)', background: h ? 'var(--surface-soft)' : 'var(--canvas)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <span style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--hairline)', background: 'var(--primary-light, rgba(204,120,92,0.1))', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{f.t}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.n}</span>
            </div>
            <span style={{ color: h ? 'var(--primary)' : 'var(--muted)', flexShrink: 0, transform: h ? 'translateX(2px)' : 'none', transition: 'all 160ms' }}><Arrow s={14} /></span>
          </div>
        );
      })}
    </div>
  );
}

function RightPanel() {
  return (
    <aside style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 22px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={mono}>Spatial Intelligence Map</span>
          <button style={{ ...mono, fontSize: 9, background: 'none', border: 'none', cursor: 'pointer' }}>Expand</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, padding: '8px 16px 16px' }}><Graph /></div>
      </div>
      <div style={{ height: '42%', display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--hairline)', background: 'var(--surface-soft)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={mono}>Knowledge Vault</span>
          <button style={{ ...mono, fontSize: 9, background: 'none', border: 'none', cursor: 'pointer' }}>See Archive</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}><Vault /></div>
      </div>
    </aside>
  );
}

function Dashboard() {
  return (
    <div style={{ display: 'flex', height: '100vh', gap: 16, padding: 16, background: 'var(--canvas)', boxSizing: 'border-box' }}>
      <Sidebar />
      <QА />
      <RightPanel />
    </div>
  );
}

Object.assign(window, { WK_Dashboard: Dashboard });
