/* Marketing sections (lower) — dark product band, pricing, coral CTA, footer. */

const { Button: MKButton, Badge: MKBadge } = window.ToLinkLinkRagDesignSystem_fa9960;
const _serif = window.MK_serif;
const _wrap = window.MK_wrap;
const _Spike = window.MK_Spike;
const _Check = window.MK_IconCheck;
const _Arrow = window.MK_IconArrow;
const _Cpu = window.MK_IconCpu;

/* ─────────────── Dark product band — model config + code window ─────────────── */
function DarkBand() {
  return (
    <section style={{ background: 'var(--surface-dark)', padding: '88px 0' }}>
      <div style={{ ..._wrap, display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 56, alignItems: 'center' }}>
        <div>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.125em', color: 'var(--primary)' }}>开发者平台</span>
          <h2 style={{ ..._serif(40, 1.12), color: 'var(--on-dark)', marginTop: 14 }}>用一行代码，<br/>接入你的知识库</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.6, color: 'var(--on-dark-soft)', marginTop: 18, maxWidth: 420 }}>
            RESTful API 与流式响应开箱即用。在任意模型间切换，检索、合成、引用全部托管。
          </p>
          <div style={{ marginTop: 26, display: 'flex', gap: 12 }}>
            <MKButton size="lg">阅读文档</MKButton>
          </div>
        </div>
        <div style={{ background: 'var(--surface-dark-soft)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e0685033' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffffff12' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffffff12' }} />
            <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-dark-soft)' }}>query.ts</span>
          </div>
          <pre style={{ margin: 0, padding: '20px 22px', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.75, color: 'var(--on-dark)', overflowX: 'auto' }}>
<span style={{ color: '#cc785c' }}>const</span> answer = <span style={{ color: '#5db8a6' }}>await</span> linkrag.<span style={{ color: '#e8a55a' }}>query</span>({'{'}
{'\n'}  dataset: <span style={{ color: '#9db88f' }}>"ai-research"</span>,
{'\n'}  question: <span style={{ color: '#9db88f' }}>"大模型的关键技术？"</span>,
{'\n'}  model: <span style={{ color: '#9db88f' }}>"claude-opus-4"</span>,
{'\n'}  cite: <span style={{ color: '#cc785c' }}>true</span>,
{'\n'}{'}'});
{'\n'}
{'\n'}<span style={{ color: '#8e8b82' }}>{'// → { answer, citations[], graph }'}</span>
          </pre>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Pricing ─────────────── */
function Pricing() {
  const tiers = [
    { name: 'Free', price: '¥0', unit: '/月', blurb: '个人探索与试用', feats: ['3 个知识库', '500 次问答 / 月', '社区支持'], cta: '免费开始', featured: false },
    { name: 'Pro', price: '¥199', unit: '/月', blurb: '专业知识工作者', feats: ['无限知识库', '无限问答', '知识图谱导出', '优先模型接入'], cta: '升级 Pro', featured: true },
    { name: 'Team', price: '联系我们', unit: '', blurb: '团队与企业部署', feats: ['SSO 与权限管理', '私有化部署', '专属支持', 'SLA 保障'], cta: '联系销售', featured: false },
  ];
  return (
    <section style={{ ..._wrap, padding: '96px 32px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={_serif(44, 1.1)}>简单透明的价格</h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--body)', marginTop: 12 }}>随团队成长，随用量付费。</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}>
        {tiers.map((t, i) => {
          const feat = t.featured;
          return (
            <div key={t.name} style={{ position: 'relative', padding: '40px 32px', borderLeft: i > 0 ? '1px solid var(--hairline)' : 'none', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {feat && <div style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 2, background: 'var(--primary)' }} />}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 26 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>{t.name}</span>
                {feat && <MKBadge tone="primary" uppercase>推荐</MKBadge>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 36, letterSpacing: '-0.015em', color: 'var(--ink)' }}>{t.price}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--muted)' }}>{t.unit}</span>
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--muted)', margin: 0 }}>{t.blurb}</p>
              <div style={{ height: 1, background: 'var(--hairline)' }} />
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                {t.feats.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--body)' }}>
                    <span style={{ color: 'var(--primary)', display: 'flex' }}><_Check s={16} /></span>{f}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                <MKButton fullWidth variant={feat ? 'primary' : 'secondary'}>{t.cta}</MKButton>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────── Closing CTA — open cream, coral confined to accent + button ─────────────── */
function CTABand() {
  return (
    <section style={{ ..._wrap, padding: '24px 32px 112px', textAlign: 'center' }}>
      <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 80 }}>
        <span style={{ display: 'inline-flex', marginBottom: 22 }}><_Spike size={24} color="var(--primary)" /></span>
        <h2 style={{ ..._serif(48, 1.08), maxWidth: 640, margin: '0 auto' }}>让你的文档开口说话</h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 18, lineHeight: 1.55, color: 'var(--body)', margin: '18px auto 0', maxWidth: 500 }}>
          几分钟接入，立刻获得带引用的智能问答与知识图谱。
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 34 }}>
          <MKButton size="lg">免费试用</MKButton>
          <MKButton size="lg" variant="secondary">预约演示</MKButton>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Footer ─────────────── */
function Footer() {
  const cols = [
    { h: '产品', items: ['知识库', '知识图谱', '智能问答', '模型配置', 'API'] },
    { h: '解决方案', items: ['研究团队', '法务合规', '企业知识库', '客户支持'] },
    { h: '资源', items: ['文档', '更新日志', '状态', '定价'] },
    { h: '公司', items: ['关于', '博客', '招聘', '联系'] },
  ];
  return (
    <footer style={{ background: 'var(--surface-dark)', padding: '64px 0 40px' }}>
      <div style={{ ..._wrap, display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', gap: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
            <_Spike size={20} color="#faf9f5" />
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 21, letterSpacing: '-0.02em', color: 'var(--on-dark)' }}>LinkRag</span>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6, color: 'var(--on-dark-soft)', margin: 0, maxWidth: 240 }}>
            知识合成工作台。读懂你的每一份文档。
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-dark-soft)', marginBottom: 14 }}>{c.h}</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {c.items.map((i) => (
                <li key={i}><a href="#" style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--on-dark)', textDecoration: 'none', opacity: 0.85 }}>{i}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ ..._wrap, marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--on-dark-soft)' }}>© 2026 LinkRag · ToLink Knowledge Workspace</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--on-dark-soft)' }}>隐私 · 条款 · 安全</span>
      </div>
    </footer>
  );
}

Object.assign(window, { MK_DarkBand: DarkBand, MK_Pricing: Pricing, MK_CTABand: CTABand, MK_Footer: Footer });
