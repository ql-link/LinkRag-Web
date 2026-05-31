/* HomeCards.jsx — Home dashboard */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了'; if (h < 9) return '早上好';
  if (h < 12) return '上午好'; if (h < 14) return '中午好';
  if (h < 18) return '下午好'; if (h < 22) return '晚上好';
  return '夜深了';
}

const quickActions = [
  { id: 'chats', icon: Icons.MessageSquarePlus, title: '快速会话', desc: '直接新建一个对话，马上开始问答' },
  { id: 'files', icon: Icons.FileUp, title: '上传文档', desc: '导入 PDF、Word、Markdown' },
  { id: 'chats', icon: Icons.MessagesSquare, title: '知识问答', desc: '基于引用片段生成回答' },
  { id: 'datasets', icon: Icons.DatabaseZap, title: '管理知识库', desc: '维护数据集与索引状态' },
];

const recentFiles = [
  { name: '人工智能发展报告.pdf', time: '2小时前' },
  { name: '大模型技术综述.docx', time: '昨天' },
  { name: 'RAG 实践笔记.md', time: '3天前' },
];

const recentChats = [
  { name: 'AI 技术问答助手', time: '5分钟前' },
  { name: '文档总结助手', time: '1小时前' },
  { name: '论文检索对话', time: '昨天' },
];

function HomePage() {
  const t = useT();
  const { dark } = useTheme();
  const { go } = useRoute();
  const [hoveredCard, setHoveredCard] = React.useState(null);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="概览"
        breadcrumbs={[{ label: '首页', page: 'home' }]}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 40px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: dark ? '#E0E0E0' : t.text, margin: '0 0 6px' }}>
            {getGreeting()}，<span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', letterSpacing: '-0.03em' }}>Alex Chen</span>
          </h1>
          <p style={{ fontSize: 13, color: dark ? '#858585' : 'rgba(26,26,26,0.55)', margin: 0 }}>
            选择一个入口，继续处理文档、知识库或对话任务。
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {quickActions.map((a, i) => {
            const hovered = hoveredCard === i;
            return (
              <div key={i}
                data-card="true"
                data-clickable="true"
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => go(a.id)}
                style={{
                  padding: 18, borderRadius: 16, cursor: 'pointer',
                  border: `1px solid ${hovered ? t.primary : t.border}`,
                  background: dark ? '#2D2D2D' : '#FFFFFF',
                  boxShadow: hovered ? '0 4px 16px rgba(26,26,26,0.10)' : 'none',
                  transition: 'all 0.3s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: dark ? 'rgba(59,130,246,0.10)' : t.primaryLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: t.primary, transition: 'background 0.2s',
                    ...(hovered ? { background: dark ? 'rgba(59,130,246,0.20)' : t.primaryMid } : {}),
                  }}>
                    <a.icon size={20} strokeWidth={1.8} />
                  </div>
                  <Icons.ArrowRight size={14} style={{
                    color: t.primary, opacity: hovered ? 1 : 0,
                    transform: hovered ? 'translateX(2px)' : 'translateX(0)',
                    transition: 'all 0.2s', marginTop: 4,
                  }} />
                </div>
                <h4 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 4px', color: dark ? '#E0E0E0' : t.text }}>{a.title}</h4>
                <p style={{ fontSize: 11, color: dark ? '#858585' : 'rgba(26,26,26,0.55)', margin: 0, lineHeight: 1.5 }}>{a.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Recent sections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <RecentSection title="最近文档" link="files" items={recentFiles} go={go} />
          <RecentSection title="最近对话" link="chats" items={recentChats} go={go} />
        </div>
      </div>
    </div>
  );
}

function RecentSection({ title, link, items, go }) {
  const t = useT();
  const { dark } = useTheme();
  return (
    <section style={{
      borderRadius: 16, padding: 18,
      background: dark ? '#2D2D2D' : '#FFFFFF',
      border: `1px solid ${t.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: t.text50, margin: 0,
        }}>{title}</h3>
        <a onClick={() => go(link)} style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
          color: t.text50, cursor: 'pointer', textDecoration: 'none',
        }}>查看全部</a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0',
            borderBottom: i < items.length - 1 ? `1px solid ${dark ? '#3C3C3C' : 'rgba(26,26,26,0.06)'}` : 'none',
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: dark ? '#E0E0E0' : t.text }}>{item.name}</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: t.text50,
            }}>{item.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, { HomePage });
