/* DatasetGrid.jsx — Datasets page + Files page */

const mockDatasets = [
  { id: 1, name: '通用知识库', desc: '包含常见问题和基础知识文档', status: '已启用', time: '2025/01/15' },
  { id: 2, name: 'AI 研究库', desc: '深度学习、NLP、计算机视觉论文', status: '已启用', time: '2025/01/14' },
  { id: 3, name: '学术论文库', desc: '顶会论文与综述文档集合', status: '已启用', time: '2025/01/10' },
  { id: 4, name: '技术文档库', desc: 'API 文档、部署指南、运维手册', status: '已停用', time: '2025/01/08' },
  { id: 5, name: '项目管理库', desc: '需求文档、设计稿、会议纪要', status: '已启用', time: '2024/12/28' },
];

function DatasetsPage() {
  const t = useT();
  const { dark } = useTheme();
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState('updatedAt');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [hoveredCard, setHoveredCard] = React.useState(null);

  const filtered = mockDatasets.filter(d =>
    `${d.name} ${d.desc}`.toLowerCase().includes(search.toLowerCase())
  );
  const sortLabel = sortBy === 'createdAt' ? '按创建时间排序' : '按更新时间排序';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="知识库"
        breadcrumbs={[{ label: '首页', page: 'home' }, { label: '知识库' }]}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="搜索知识库..." />
        <SortButton label={sortLabel} onToggle={() => setSortBy(s => s === 'createdAt' ? 'updatedAt' : 'createdAt')} />
      </PageHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: t.text50, marginBottom: 18,
        }}>
          共 {mockDatasets.length} 个知识库
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: 170, gap: 14 }}>
          {filtered.map(ds => {
            const hovered = hoveredCard === ds.id;
            return (
              <div key={ds.id}
                data-card="true"
                data-clickable="true"
                onMouseEnter={() => setHoveredCard(ds.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  borderRadius: 16, padding: 18, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  background: dark ? '#2D2D2D' : t.card,
                  backdropFilter: dark ? 'none' : 'blur(8px)',
                  border: `1px solid ${hovered ? t.primary : t.border}`,
                  transition: 'all 0.2s',
                }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: dark ? 'rgba(9,71,113,0.30)' : t.primaryMid,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icons.Database size={16} style={{ color: t.primary }} />
                  </div>
                </div>
                <h3 style={{
                  fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em', margin: '0 0 3px',
                  color: hovered ? t.primary : (dark ? '#E0E0E0' : t.text),
                  transition: 'color 0.2s',
                }}>{ds.name}</h3>
                {ds.desc && (
                  <p style={{
                    fontSize: 11, lineHeight: 1.4, margin: '0 0 6px', minHeight: 0,
                    color: dark ? '#858585' : 'rgba(26,26,26,0.55)',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>{ds.desc}</p>
                )}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
                      letterSpacing: '0.1em', color: t.text50,
                    }}>{ds.status}</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
                      letterSpacing: '0.1em', color: t.text50,
                    }}>{ds.time}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, opacity: hovered ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                    <button data-icon-btn="true" style={{
                      width: 28, height: 28, borderRadius: 8, border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      color: dark ? '#858585' : 'rgba(26,26,26,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Icons.Pencil size={13} /></button>
                    <button data-icon-btn="true" style={{
                      width: 28, height: 28, borderRadius: 8, border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      color: dark ? '#858585' : 'rgba(26,26,26,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Icons.Trash2 size={13} /></button>
                  </div>
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
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>添加知识库</span>
          </div>
        </div>
      </div>

      {dialogOpen && (
        <DialogOverlay onClose={() => setDialogOpen(false)}>
          <DialogBox title="新建知识库" onClose={() => setDialogOpen(false)}>
            <DialogField label="知识库名称">
              <DialogInput placeholder="输入知识库名称" />
            </DialogField>
            <DialogField label="描述（可选）">
              <DialogInput placeholder="输入知识库描述" />
            </DialogField>
            <DialogFooter onCancel={() => setDialogOpen(false)} confirmLabel="创建" />
          </DialogBox>
        </DialogOverlay>
      )}
    </div>
  );
}

/* ── Files Page ── */

const mockFiles = [
  { id: 1, name: '人工智能发展报告.pdf', type: 'PDF', size: '2.4 MB', dataset: '通用知识库', status: '解析完成', statusColor: '#22C55E', time: '2025/01/15 14:30' },
  { id: 2, name: '大模型技术综述.docx', type: 'DOCX', size: '1.8 MB', dataset: 'AI 研究库', status: '解析完成', statusColor: '#22C55E', time: '2025/01/14 09:15' },
  { id: 3, name: 'RAG 实践笔记.md', type: 'MD', size: '156 KB', dataset: '技术文档库', status: '解析中', statusColor: '#3B82F6', time: '2025/01/15 16:42' },
  { id: 4, name: '训练数据标注指南.pdf', type: 'PDF', size: '4.1 MB', dataset: 'AI 研究库', status: '待解析', statusColor: '', time: '2025/01/13 11:20' },
  { id: 5, name: '向量数据库对比.docx', type: 'DOCX', size: '890 KB', dataset: '技术文档库', status: '解析失败', statusColor: '#D97373', time: '2025/01/12 08:55' },
];

function FilesPage() {
  const t = useT();
  const { dark } = useTheme();
  const [search, setSearch] = React.useState('');

  const filtered = mockFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="文件"
        breadcrumbs={[{ label: '首页', page: 'home' }, { label: '文件' }]}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="搜索文件..." />
      </PageHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: t.text50, marginBottom: 18,
          display: 'flex', gap: 18,
        }}>
          <span>共 {filtered.length} 个文件</span>
          <span style={{ color: dark ? '#3C3C3C' : 'rgba(26,26,26,0.15)' }}>|</span>
          <span>支持 md / pdf / docx / txt</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Upload row */}
          <div style={{
            borderRadius: 16, padding: 14, cursor: 'pointer',
            border: `1px dashed ${t.border}`,
            background: dark ? 'rgba(45,45,45,0.60)' : '#FFFFFF',
            display: 'flex', alignItems: 'center', gap: 12,
            color: t.text50, transition: 'all 0.2s',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 12,
              background: dark ? 'rgba(9,71,113,0.30)' : t.primaryLight,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icons.Plus size={16} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: dark ? '#E0E0E0' : t.text, margin: 0 }}>上传文件</p>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: t.text40, margin: '3px 0 0',
              }}>先选择目标知识库，再添加文件</p>
            </div>
          </div>

          {filtered.map(file => (
            <div key={file.id} data-card="true" style={{
              borderRadius: 12, padding: '12px 16px',
              background: dark ? '#2D2D2D' : t.card,
              backdropFilter: dark ? 'none' : 'blur(8px)',
              border: `1px solid ${t.border}`,
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'border-color 0.2s',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: dark ? 'rgba(9,71,113,0.30)' : t.primaryLight,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icons.FileText size={15} style={{ color: t.primary }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#E0E0E0' : t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
                    letterSpacing: '0.08em', flexShrink: 0,
                    color: file.statusColor || t.text40,
                  }}>{file.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    background: dark ? 'rgba(59,130,246,0.10)' : t.primaryLight,
                    color: t.primary, border: `1px solid ${dark ? 'rgba(59,130,246,0.20)' : t.primaryMid}`,
                  }}>{file.dataset}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.text50 }}>{file.type}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.text50 }}>{file.size}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.text40 }}>{file.time}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button style={{
                  padding: '5px 10px', borderRadius: 8, border: 'none',
                  background: dark ? '#094771' : t.primary,
                  color: '#FFFFFF', fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Icons.Wand2 size={11} /> 解析
                </button>
                <button data-icon-btn="true" style={{
                  width: 28, height: 28, borderRadius: 8, border: 'none',
                  background: 'transparent', cursor: 'pointer', color: t.text40,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><Icons.Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DatasetsPage, FilesPage });
