/* Marketing sections — LinkRag, in the Claude (Anthropic) editorial style.
   Cream canvas, coral CTAs, serif display, dark-navy product mockups.
   Composes the design-system Button/Badge off the global bundle.
   Exports section components to window for index.html. */

const { Button, Badge } = window.ToLinkLinkRagDesignSystem_fa9960;

/* ── Minimal Lucide-style stroke icons (UI glyphs only) ── */
const Ico = (p) => (
  <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={p.w || 1.7} strokeLinecap="round" strokeLinejoin="round" style={p.style}>{p.children}</svg>
);
const IconUpload = (p) => <Ico {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/></Ico>;
const IconGraph = (p) => <Ico {...p}><circle cx="5" cy="6" r="2.4"/><circle cx="19" cy="7" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M7 7l4 9M17 8.5l-4 7.5"/></Ico>;
const IconSpark = (p) => <Ico {...p}><path d="M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-5L6 9.4l4.4-1.6z"/></Ico>;
const IconCpu = (p) => <Ico {...p}><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></Ico>;
const IconArrow = (p) => <Ico {...p}><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></Ico>;
const IconCheck = (p) => <Ico {...p}><path d="M20 6L9 17l-5-5"/></Ico>;
const Spike = ({ size = 18, color = '#141413' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12 1.5l1.7 7 5-5-3.3 6.4 7 .9-7 .9 3.3 6.4-5-5-1.7 7-1.7-7-5 5 3.3-6.4-7-.9 7-.9L6 3.5l5 5z"/>
  </svg>
);

const wrap = { maxWidth: 1200, margin: '0 auto', padding: '0 32px' };
const serif = (size, lh = 1.08, ls = '-0.022em') => ({
  fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: size, lineHeight: lh, letterSpacing: ls, color: 'var(--ink)', margin: 0,
});

/* ───────────────────────── Top nav ───────────────────────── */
function TopNav() {
  const links = ['产品', '功能', '解决方案', '价格', '研究'];
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(250,249,245,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ ...wrap, height: 64, display: 'flex', alignItems: 'center', gap: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Spike size={20} />
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 21, letterSpacing: '-0.02em', color: 'var(--ink)' }}>LinkRag</span>
        </div>
        <nav style={{ display: 'flex', gap: 26, flex: 1 }}>
          {links.map((l) => (
            <a key={l} href="#" style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--body)', textDecoration: 'none' }}>{l}</a>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button variant="link">登录</Button>
          <Button>免费试用</Button>
        </div>
      </div>
    </header>
  );
}

/* ───────────────────────── Hero ───────────────────────── */
function Hero() {
  return (
    <section style={{ ...wrap, paddingTop: 88, paddingBottom: 96, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
      <div>
        <div style={{ marginBottom: 24 }}><Badge tone="primary" uppercase>知识合成引擎</Badge></div>
        <h1 style={serif(64, 1.04)}>读懂你的<br/>每一份文档</h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 19, lineHeight: 1.55, color: 'var(--body)', margin: '24px 0 0', maxWidth: 480 }}>
          LinkRag 把 PDF、Word、演示稿切分、向量化，并连成知识图谱——
          让每个答案都带着可追溯的引用。你的思考伙伴，从此真正理解上下文。
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <Button size="lg" icon={<IconArrow s={17} />}>开始构建</Button>
          <Button size="lg" variant="secondary">预约演示</Button>
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 28, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
          <span>免费额度</span><span>·</span><span>无需信用卡</span><span>·</span><span>5 分钟接入</span>
        </div>
      </div>
      <HeroMockup />
    </section>
  );
}

/* Dark product-chrome mockup — the real Knowledge Synthesis Q&A */
function HeroMockup() {
  return (
    <div style={{ background: 'var(--surface-dark)', borderRadius: 16, padding: 28, boxShadow: '0 24px 60px rgba(20,20,19,0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 22 }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#e0685023' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffffff14' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffffff14' }} />
        <span style={{ marginLeft: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-dark-soft)', letterSpacing: '0.08em' }}>KNOWLEDGE SYNTHESIS</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
        <div style={{ background: 'rgba(204,120,92,0.16)', border: '1px solid rgba(204,120,92,0.3)', color: 'var(--on-dark)', fontSize: 13, padding: '10px 16px', borderRadius: '12px 12px 2px 12px', maxWidth: '78%' }}>
          大模型在自然语言处理中的应用有哪些？
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
          <IconSpark s={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 21, lineHeight: 1.3, color: 'var(--on-dark)', borderLeft: '2px solid var(--primary)', paddingLeft: 16 }}>
            大模型已广泛用于文本生成、理解、翻译与问答系统
          </div>
          <div style={{ marginTop: 14, background: 'var(--surface-dark-soft)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.7, color: 'var(--on-dark-soft)' }}>
            01 — 文本生成：文章写作、摘要、对话<br/>
            02 — 文本理解：情感分析、实体识别<br/>
            03 — 问答系统：基于引用片段的合成
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {['训练的关键技术？', '如何评估性能？'].map((s) => (
              <span key={s} style={{ fontSize: 12, color: 'var(--on-dark-soft)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9999, padding: '5px 12px' }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--on-dark-soft)', letterSpacing: '0.06em' }}>
        <span>ENGINE · CLAUDE-OPUS-4</span><span>AI RESPONSE // SYNTHESIZED</span>
      </div>
    </div>
  );
}

/* ───────────────────────── Logo strip ───────────────────────── */
function LogoStrip() {
  const provs = ['claude-color', 'openai', 'gemini-color', 'deepseek-color', 'qwen-color', 'mistral-color'];
  return (
    <section style={{ borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)', background: 'var(--surface-soft)' }}>
      <div style={{ ...wrap, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)' }}>接入任意大模型</span>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
          {provs.map((p) => (
            <img key={p} src={`../../assets/providers/${p}.svg`} alt={p} style={{ height: 24, opacity: 0.75 }} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Feature grid ───────────────────────── */
function Features() {
  const feats = [
    { icon: <IconUpload s={26} />, t: '导入即解析', d: '拖入 PDF、Word、Markdown、演示稿，自动切分为稳定片段并向量化索引。' },
    { icon: <IconGraph s={26} />, t: '知识图谱', d: '实体与关系自动连成空间智能图谱，点开任意节点追溯来源文档。' },
    { icon: <IconSpark s={26} />, t: '带引用的问答', d: '每个回答都基于检索到的片段合成，并标注出处——可信、可追溯。' },
  ];
  return (
    <section style={{ ...wrap, padding: '96px 32px' }}>
      <div style={{ maxWidth: 620, marginBottom: 48 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.125em', color: 'var(--primary)' }}>为什么是 LinkRag</span>
        <h2 style={{ ...serif(44, 1.1), marginTop: 14 }}>从文档到洞见，<br/>只差一次提问</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 44 }}>
        {feats.map((f) => (
          <div key={f.t} style={{ borderTop: '1px solid var(--hairline)', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={{ color: 'var(--primary)', display: 'flex' }}>{f.icon}</span>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 500, color: 'var(--ink)', margin: '2px 0 0' }}>{f.t}</h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.55, color: 'var(--body)', margin: 0 }}>{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, { MK_TopNav: TopNav, MK_Hero: Hero, MK_LogoStrip: LogoStrip, MK_Features: Features, MK_Spike: Spike, MK_IconCheck: IconCheck, MK_IconArrow: IconArrow, MK_IconCpu: IconCpu, MK_serif: serif, MK_wrap: wrap });
