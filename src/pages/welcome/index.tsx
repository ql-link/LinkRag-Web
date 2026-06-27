import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, Navigate, useNavigate } from 'react-router';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  BotMessageSquare,
  BrainCircuit,
  DatabaseZap,
  FileCode2,
  FileText,
  SearchCheck,
  ScissorsLineDashed,
  ShieldCheck,
  TextQuote,
  Upload,
  FileType,
  Github,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { login, register } from '@/services/auth';
import { buildRequiredFieldErrors, validateAuthForm } from '@/lib/authValidation';
import { useTheme } from '@/contexts/ThemeContext';
import linkRagLogoCreamUrl from '@/assets/brand/linkrag-logo-cream.png';
import linkRagLogoInkUrl from '@/assets/brand/linkrag-logo-ink.png';

type AuthMode = 'login' | 'register';
type AuthFieldKey = 'username' | 'email' | 'password' | 'confirmPassword';
const githubProjectUrl =
  (import.meta.env.VITE_GITHUB_URL as string | undefined)?.trim() || 'https://github.com/ql-link/LinkRag';

const scrollSections = [{ id: 'knowledge', label: '功能' }];

const workflowSlides = [
  {
    id: 'knowledge',
    step: '01',
    title: (
      <>
        文档清洗
        <br />
        多格式资料统一整理为 Markdown
      </>
    ),
    description:
      '识别 PDF、Word、HTML 等不同来源，按格式选择解析路径，处理图片、表格与正文结构，最终产出可分块、可索引的标准 Markdown。',
    kind: 'cleaning',
  },
  {
    id: 'files',
    step: '02',
    title: (
      <>
        文档分片
        <br />
        基于结构与语义切分稳定片段
      </>
    ),
    description: '基于标准 Markdown、标题层级、表格与图片说明做语义分块，保留原文上下文，为后续检索准备稳定片段。',
    kind: 'capabilities',
  },
  {
    id: 'indexing',
    step: '03',
    title: (
      <>
        索引构建
        <br />
        三路索引并行写入 Qdrant
      </>
    ),
    description: 'dense 与 sparse 写入用户分桶，BM25 写入独立 collection，三路召回互不污染',
    kind: 'operations',
  },
  {
    id: 'conversation',
    step: '04',
    title: (
      <>
        多路召回
        <br />
        跨检索通道并行获取候选片段
      </>
    ),
    description: '减少遗漏关键依据，把相关内容先聚合到一起',
    kind: 'timeline',
  },
  {
    id: 'answer',
    step: '05',
    title: (
      <>
        智能回答
        <br />
        结合上下文与原文片段生成答案
      </>
    ),
    description: '回答保留引用依据，方便回看和核验来源',
    kind: 'answer',
  },
] as const;

const systemFeatures = [
  {
    title: '多 LLM 接入',
    eyebrow: 'MODEL ROUTING',
    description: '按能力维度管理模型，生成、视觉、Embedding、Rerank 可以分别使用不同厂商或自配服务。',
    icon: BrainCircuit,
    details: ['系统默认 / 自配模型', '按任务选择能力维度', '厂商配置独立维护'],
  },
  {
    title: '答案可追溯',
    eyebrow: 'SOURCE GROUNDING',
    description: '回答保留召回片段与原文来源，用户可以回看依据，而不是只看到一段无法判断的生成文本。',
    icon: TextQuote,
    details: ['引用片段可展开', '文件来源可定位', '回答依据可核验'],
  },
  {
    title: '解析配置可控',
    eyebrow: 'PARSE CONTROL',
    description: '把 PDF、Markdown 增强、分片和召回参数开放给用户调整，适配不同知识库的数据质量。',
    icon: ScissorsLineDashed,
    details: ['默认配置可恢复', '关键参数可微调', '适配不同文档结构'],
  },
  {
    title: '知识空间隔离',
    eyebrow: 'WORKSPACE SCOPE',
    description: '多知识库、文件和索引状态独立管理，降低不同资料之间互相污染的风险。',
    icon: ShieldCheck,
    details: ['多知识库并存', '文件状态清晰', '索引数据隔离'],
  },
] as const;

const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

function LinkRagMark({ darkMode }: { darkMode?: boolean }) {
  return (
    <img
      src={darkMode ? '/linkrag-mark-v2-dark.png' : '/linkrag-mark-v2.png'}
      alt="LinkRag"
      className="h-full w-full object-contain"
    />
  );
}

function LinkRagLogo({ darkMode }: { darkMode?: boolean }) {
  return (
    <img
      src={darkMode ? linkRagLogoCreamUrl : linkRagLogoInkUrl}
      alt="LinkRag"
      className="-ml-[9px] h-7 w-auto object-contain"
      draggable={false}
    />
  );
}

function RevealSection({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
          }
        });
      },
      { threshold: 0.18 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id={id}
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0',
        className,
      )}
    >
      {children}
    </section>
  );
}

const cleaningInputs = [
  { name: 'research.pdf', type: 'PDF', icon: FileText },
  { name: 'handbook.docx', type: 'DOCX', icon: FileType },
  { name: 'docs.html', type: 'HTML', icon: FileCode2 },
] as const;

const cleaningPipelines = [
  { label: '识别格式', detail: 'PDF / DOCX / HTML' },
  { label: '解析正文', detail: '选择对应解析路径' },
  { label: '清洗增强', detail: '表格、图片、标题整理' },
] as const;

const cleanedMarkdownLines = [
  '# 产品白皮书',
  '## 背景',
  '统一正文、表格与图片引用',
  '',
  '| 指标 | 说明 |',
  '| --- | --- |',
  '| 召回 | 保留来源 |',
  '',
  '![image](object://asset)',
] as const;

const chunkingMarkdownLines = [
  '# 模型训练',
  '## 梯度下降',
  '正文段落...',
  '| 表格 | 保留 |',
  '![image](asset)',
] as const;

const finalChunkCards = [
  { id: '00', title: '背景与定义', strategy: 'coarse' },
  { id: '01', title: '梯度下降', strategy: 'semantic' },
] as const;

function DocumentCleaningDemo({ darkMode }: { darkMode?: boolean }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(
        'relative min-h-[470px] overflow-hidden rounded-[12px] border p-6',
        darkMode
          ? 'border-[#3a3a3a] bg-[#2b2b2b]/88 shadow-black/25 backdrop-blur-sm'
          : 'border-border-subtle bg-white/62 shadow-sm backdrop-blur-sm',
      )}
    >
      <div className="absolute inset-0 welcome-demo-grid opacity-55" />

      <div className="relative z-10 h-[430px]">
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          viewBox="0 0 720 430"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          {['M82 178H206', 'M82 215H206', 'M82 252H206', 'M432 215H528'].map((path) => (
            <path
              key={path}
              d={path}
              className={cn('index-dashed-path', darkMode ? 'stroke-[#3a3a3a]' : 'stroke-border-subtle')}
            />
          ))}
          <path d="M82 178H206" className={cn('index-moving-path', darkMode ? 'stroke-[#d4a373]' : 'stroke-primary')} />
          <path
            d="M82 215H206"
            className={cn(
              'index-moving-path index-moving-path-delay',
              darkMode ? 'stroke-[#d4a373]' : 'stroke-primary',
            )}
          />
          <path
            d="M82 252H206"
            className={cn('index-moving-path index-moving-path-late', darkMode ? 'stroke-[#d4a373]' : 'stroke-primary')}
          />
          <path
            d="M432 215H528"
            className={cn('index-moving-path index-moving-path-out', darkMode ? 'stroke-[#d4a373]' : 'stroke-primary')}
          />
        </svg>

        <div className="relative z-10 grid h-full grid-cols-[0.58fr_1fr_1.02fr] items-center gap-3">
          <div className="-mr-1 space-y-2.5">
            <p className={cn('mono-label mb-3', darkMode ? 'text-[#a6a6a6]' : '')}>inputs</p>
            {cleaningInputs.map((file, index) => {
              const Icon = file.icon;
              return (
                <motion.div
                  key={file.name}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-2',
                    darkMode ? 'bg-[#1f1f1f]/72' : 'bg-white/62',
                  )}
                  animate={{ opacity: [0.62, 1, 0.62], x: [0, 2, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.28, ease: 'easeInOut' }}
                >
                  <Icon size={16} className={darkMode ? 'text-[#d6d6d6]' : 'text-primary'} />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'truncate text-xs font-semibold',
                        darkMode ? 'text-[#d6d6d6]' : 'text-text-main/70',
                      )}
                    >
                      {file.type}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="relative">
            <div
              className={cn(
                'relative rounded-[12px] border p-4',
                darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]/86' : 'border-border-subtle bg-bg-base/78',
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className={cn('mono-label', darkMode ? 'text-[#a6a6a6]' : '')}>cleaning pipeline</p>
                  <p className={cn('mt-1 text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                    分流解析与标准化
                  </p>
                </div>
                <ShieldCheck size={20} className={darkMode ? 'text-[#d6d6d6]' : 'text-primary'} />
              </div>

              <div className="space-y-3">
                {cleaningPipelines.map((pipeline, index) => (
                  <motion.div
                    key={pipeline.label}
                    className="flex items-start gap-3"
                    animate={{ opacity: [0.58, 1, 0.72], x: [0, 3, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, delay: index * 0.34, ease: 'easeInOut' }}
                  >
                    <motion.span
                      className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', darkMode ? 'bg-[#d4a373]' : 'bg-primary')}
                      animate={{ scale: [0.9, 1.35, 0.9] }}
                      transition={{ duration: 2.8, repeat: Infinity, delay: index * 0.34, ease: 'easeInOut' }}
                    />
                    <div className="min-w-0">
                      <p className={cn('text-xs font-bold', darkMode ? 'text-[#d6d6d6]' : 'text-text-main/72')}>
                        {pipeline.label}
                      </p>
                      <p className={cn('mt-0.5 text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
                        {pipeline.detail}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div
                className={cn(
                  'mt-4 rounded-lg px-3 py-2 text-[10px] leading-5',
                  darkMode ? 'bg-[#2b2b2b] text-[#9d9d9d]' : 'bg-white/58 text-text-main/48',
                )}
              >
                可选增强：表格结构、图片说明、标题层级
              </div>
            </div>
          </div>

          <div
            className={cn(
              'ml-5 overflow-hidden rounded-[12px] border p-3',
              darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]/88' : 'border-border-subtle bg-white/80',
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className={cn('mono-label', darkMode ? 'text-[#a6a6a6]' : '')}>markdown</p>
                <p className={cn('mt-1 text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>标准输入</p>
              </div>
              <FileCode2 size={20} className={darkMode ? 'text-[#d6d6d6]' : 'text-primary'} />
            </div>
            <div
              className={cn(
                'rounded-lg px-3 py-2 font-mono text-[10px] leading-5',
                darkMode ? 'bg-[#2b2b2b] text-[#d6d6d6]' : 'bg-bg-base text-text-main/62',
              )}
            >
              {cleanedMarkdownLines.map((line, index) => (
                <motion.p
                  key={`${line}-${index}`}
                  className={line === '' ? 'h-5' : ''}
                  animate={{ opacity: [0.22, 1, 1], x: [4, 0, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, delay: 0.8 + index * 0.1, ease: 'easeInOut' }}
                >
                  {line || ' '}
                </motion.p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function UploadChunkDemo({ darkMode }: { darkMode?: boolean }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(
        'relative min-h-[470px] overflow-hidden rounded-[12px] border p-6',
        darkMode
          ? 'border-[#3a3a3a] bg-[#2b2b2b]/88 shadow-black/25 backdrop-blur-sm'
          : 'border-border-subtle bg-white/62 shadow-sm backdrop-blur-sm',
      )}
    >
      <div className="absolute inset-0 welcome-demo-grid opacity-55" />
      <div className="relative z-10 grid h-[430px] grid-cols-[0.82fr_1.36fr_0.82fr] items-center gap-5">
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          viewBox="0 0 720 430"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          {['M178 215H214', 'M506 215H542'].map((path) => (
            <path
              key={path}
              d={path}
              className={cn('index-dashed-path', darkMode ? 'stroke-[#3a3a3a]' : 'stroke-border-subtle')}
            />
          ))}
          <path
            d="M178 215H214"
            className={cn('index-moving-path', darkMode ? 'stroke-[#d4a373]' : 'stroke-primary')}
          />
          <path
            d="M506 215H542"
            className={cn(
              'index-moving-path index-moving-path-delay',
              darkMode ? 'stroke-[#d4a373]' : 'stroke-primary',
            )}
          />
        </svg>

        <motion.div
          variants={fadeUpItem}
          className={cn(
            'relative z-10 min-w-0 rounded-[12px] border p-4',
            darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]/86' : 'border-border-subtle bg-white/78',
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className={cn('mono-label', darkMode ? 'text-[#a6a6a6]' : '')}>split input</p>
              <p className={cn('mt-1 text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                标准 Markdown
              </p>
            </div>
            <FileCode2 size={20} className={darkMode ? 'text-[#d6d6d6]' : 'text-primary'} />
          </div>

          <div
            className={cn(
              'rounded-lg px-3 py-3 font-mono text-[10px] leading-6',
              darkMode ? 'bg-[#2b2b2b] text-[#d6d6d6]' : 'bg-bg-base/86 text-text-main/58',
            )}
          >
            {chunkingMarkdownLines.map((line, index) => (
              <motion.p
                key={line}
                animate={{ opacity: [0.35, 1, 0.72] }}
                transition={{ duration: 2.8, repeat: Infinity, delay: index * 0.18, ease: 'easeInOut' }}
              >
                {line}
              </motion.p>
            ))}
          </div>

          <p className={cn('mt-3 text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/38')}>
            表格、代码、公式、图片整块保留
          </p>
        </motion.div>

        <motion.div variants={fadeUpItem} className="relative z-10 min-w-0">
          <div
            className={cn(
              'relative overflow-hidden rounded-[12px] border p-4',
              darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]/86' : 'border-border-subtle bg-bg-base/78',
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className={cn('mono-label', darkMode ? 'text-[#a6a6a6]' : '')}>cohesion curve</p>
                <p className={cn('mt-1 text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                  atom 时间线与语义谷值
                </p>
              </div>
              <ScissorsLineDashed size={20} className={darkMode ? 'text-[#d6d6d6]' : 'text-primary'} />
            </div>

            <svg
              className="mt-5 h-[220px] w-full overflow-visible"
              viewBox="0 0 520 188"
              fill="none"
              aria-hidden="true"
            >
              <g>
                {Array.from({ length: 14 }).map((_, index) => (
                  <motion.rect
                    key={index}
                    x={index * 37}
                    y="14"
                    width="26"
                    height="18"
                    rx="4"
                    className={cn(index > 4 && index < 9 ? 'fill-primary/24' : 'fill-primary/12')}
                    animate={{ opacity: [0.45, index === 6 || index === 7 ? 0.95 : 0.68, 0.45] }}
                    transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.08, ease: 'easeInOut' }}
                  />
                ))}
              </g>

              <motion.g
                animate={{ x: [0, 0, -26, -26], y: [0, 0, -16, -16] }}
                transition={{
                  duration: 4.2,
                  repeat: Infinity,
                  times: [0, 0.35, 0.44, 1],
                  ease: ['linear', [0.22, 1, 0.36, 1], 'linear'],
                }}
              >
                <path
                  d="M8 116 C34 64 70 64 96 88 C130 118 154 146 178 148"
                  className={cn(
                    'fill-none stroke-[2.4] [stroke-linecap:round] [stroke-linejoin:round]',
                    darkMode ? 'stroke-[#d4a373]' : 'stroke-primary',
                  )}
                />
              </motion.g>
              <path
                d="M178 148 C212 148 238 68 274 70 C314 72 330 152 354 154"
                className={cn(
                  'fill-none stroke-[2.4] [stroke-linecap:round] [stroke-linejoin:round]',
                  darkMode ? 'stroke-[#d4a373]' : 'stroke-primary',
                )}
              />
              <motion.g
                animate={{ x: [0, 0, 26, 26], y: [0, 0, -16, -16] }}
                transition={{
                  duration: 4.2,
                  repeat: Infinity,
                  times: [0, 0.69, 0.78, 1],
                  ease: ['linear', [0.22, 1, 0.36, 1], 'linear'],
                }}
              >
                <path
                  d="M354 154 C384 156 410 78 444 78 C474 78 496 104 512 118"
                  className={cn(
                    'fill-none stroke-[2.4] [stroke-linecap:round] [stroke-linejoin:round]',
                    darkMode ? 'stroke-[#d4a373]' : 'stroke-primary',
                  )}
                />
              </motion.g>
              {[178, 354].map((x, index) => (
                <g key={x}>
                  <motion.line
                    x1={x}
                    y1="42"
                    x2={x}
                    y2="166"
                    className={cn('stroke-[1.6]', darkMode ? 'stroke-[#d4a373]' : 'stroke-primary')}
                    strokeDasharray="5 6"
                    animate={{ strokeDashoffset: [0, -22] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.circle
                    cx={x}
                    cy={index === 0 ? 148 : 154}
                    r="5"
                    className={cn(darkMode ? 'fill-[#d4a373]' : 'fill-primary')}
                    animate={{ scale: [0.9, 1.25, 0.9], opacity: [0.72, 1, 0.72] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.4, ease: 'easeInOut' }}
                  />
                </g>
              ))}
              <motion.rect
                x="0"
                y="42"
                width="2"
                height="124"
                className={cn(darkMode ? 'fill-[#d4a373]/60' : 'fill-primary/55')}
                animate={{ x: [0, 512], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: 'linear' }}
              />
              {['chunk 0', 'chunk 1', 'chunk 2'].map((label, index) => (
                <text
                  key={label}
                  x={[88, 266, 438][index]}
                  y="182"
                  textAnchor="middle"
                  className={cn(
                    'fill-current font-mono text-[10px]',
                    darkMode ? 'text-[#a6a6a6]' : 'text-text-main/42',
                  )}
                >
                  {label}
                </text>
              ))}
            </svg>

            <p className={cn('mt-2 text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/38')}>
              先按标题粗分，再在语义谷值处细分
            </p>
          </div>
        </motion.div>

        <motion.div variants={fadeUpItem} className="relative z-10 min-w-0">
          <div className="space-y-2">
            {finalChunkCards.map((chunk, index) => (
              <motion.div
                key={chunk.id}
                className={cn(
                  'rounded-lg border px-3 py-2',
                  darkMode ? 'border-[#3a3a3a] bg-[#2b2b2b]/82' : 'border-border-subtle bg-bg-base/70',
                )}
                animate={{ x: [0, 4, 0], opacity: [0.72, 1, 0.72] }}
                transition={{ duration: 3, repeat: Infinity, delay: index * 0.34, ease: 'easeInOut' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-xs font-bold', darkMode ? 'text-[#d6d6d6]' : 'text-text-main/70')}>
                    {chunk.title}
                  </p>
                  <span className={cn('font-mono text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/42')}>
                    #{chunk.id}
                  </span>
                </div>
                <p className={cn('mt-1 font-mono text-[9px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/38')}>
                  split_strategy: {chunk.strategy}
                </p>
              </motion.div>
            ))}
          </div>

          <div
            className={cn(
              'mt-3 rounded-md px-2 py-1.5 text-[10px]',
              darkMode ? 'bg-[#2b2b2b] text-[#a6a6a6]' : 'bg-bg-base/70 text-text-main/42',
            )}
          >
            普通块相邻追加 64 token 重叠
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function IndexingDemo({ darkMode }: { darkMode?: boolean }) {
  const indexLanes = [
    {
      label: 'DENSE',
      title: '编码 1024d',
      detail: 'CRC32(user_id) % 128',
      dotClass: darkMode ? 'bg-[#d4a373]' : 'bg-primary',
      borderClass: darkMode ? 'border-[#d4a373]/35' : 'border-primary/24',
    },
    {
      label: 'SPARSE',
      title: 'adapter 分发',
      detail: 'sparse_text · top_k 256',
      dotClass: 'bg-[#a8895f]',
      borderClass: darkMode ? 'border-[#a8895f]/35' : 'border-[#a8895f]/28',
    },
    {
      label: 'BM25',
      title: 'RAGFlow 预分词',
      detail: 'bm25_text · IDF',
      dotClass: 'bg-[#5f8f83]',
      borderClass: darkMode ? 'border-[#5f8f83]/38' : 'border-[#5f8f83]/28',
    },
  ] as const;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(
        'relative min-h-[430px] overflow-hidden rounded-[12px] border p-6',
        darkMode
          ? 'border-[#3a3a3a] bg-[#2b2b2b]/88 shadow-black/25 backdrop-blur-sm'
          : 'border-border-subtle bg-white/62 shadow-sm backdrop-blur-sm',
      )}
    >
      <div className="absolute inset-0 welcome-demo-grid opacity-55" />

      <div className="relative z-10 grid min-h-[382px] grid-cols-[0.8fr_1.05fr_1fr] items-center gap-5">
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          viewBox="0 0 720 382"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          {[
            ['M168 191C202 191 196 84 232 84', darkMode ? 'stroke-[#d4a373]/32' : 'stroke-primary/28'],
            ['M168 191H232', darkMode ? 'stroke-[#a8895f]/34' : 'stroke-[#a8895f]/30'],
            ['M168 191C202 191 196 298 232 298', darkMode ? 'stroke-[#5f8f83]/38' : 'stroke-[#5f8f83]/32'],
            ['M412 84C464 84 455 191 514 191', darkMode ? 'stroke-[#d4a373]/32' : 'stroke-primary/28'],
            ['M412 191H514', darkMode ? 'stroke-[#a8895f]/34' : 'stroke-[#a8895f]/30'],
            ['M412 298C464 298 455 191 514 191', darkMode ? 'stroke-[#5f8f83]/38' : 'stroke-[#5f8f83]/32'],
          ].map(([path, strokeClass]) => (
            <path key={path} d={path} className={cn('index-dashed-path', strokeClass)} />
          ))}
          <path
            d="M168 191C202 191 196 84 232 84"
            className={cn('index-moving-path', darkMode ? 'stroke-[#d4a373]' : 'stroke-primary')}
          />
          <path d="M168 191H232" className="index-moving-path index-moving-path-delay stroke-[#a8895f]" />
          <path
            d="M168 191C202 191 196 298 232 298"
            className="index-moving-path index-moving-path-late stroke-[#5f8f83]"
          />
          <path
            d="M412 84C464 84 455 191 514 191"
            className={cn('index-moving-path index-moving-path-out', darkMode ? 'stroke-[#d4a373]' : 'stroke-primary')}
          />
          <path d="M412 191H514" className="index-moving-path index-moving-path-out stroke-[#a8895f]" />
          <path
            d="M412 298C464 298 455 191 514 191"
            className="index-moving-path index-moving-path-out index-moving-path-delay stroke-[#5f8f83]"
          />
        </svg>

        <motion.div variants={fadeUpItem} className="relative z-10 p-1">
          <div className="space-y-2">
            {[
              ['042-01', '背景 / 定义', 'coarse'],
              ['042-02', '训练 / 梯度', 'semantic'],
              ['042-03', '表格 / 指标', 'protected'],
            ].map(([id, title, strategy], index) => (
              <motion.div
                key={id}
                className={cn(
                  'rounded-lg px-3 py-2',
                  darkMode ? 'bg-[#2b2b2b] text-[#d6d6d6]' : 'bg-bg-base/86 text-text-main/58',
                )}
                animate={{ opacity: [0.58, 1, 0.72], x: [0, 4, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, delay: index * 0.18, ease: 'easeInOut' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn('font-mono text-[10px] font-bold', darkMode ? 'text-[#d6d6d6]' : 'text-text-main/62')}
                  >
                    #{id}
                  </span>
                  <span className={cn('font-mono text-[9px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/38')}>
                    {strategy}
                  </span>
                </div>
                <p
                  className={cn(
                    'mt-1 truncate text-[11px] font-semibold',
                    darkMode ? 'text-[#d6d6d6]' : 'text-text-main/62',
                  )}
                >
                  {title}
                </p>
              </motion.div>
            ))}
          </div>
          <p className={cn('mt-3 text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/38')}>
            共同输入，一分为三
          </p>
        </motion.div>

        <motion.div variants={fadeUpItem} className="relative z-10 grid gap-3">
          {indexLanes.map((lane, index) => (
            <motion.div
              key={lane.label}
              className={cn(
                'rounded-[12px] border p-3',
                lane.borderClass,
                darkMode ? 'bg-[#1f1f1f]/86' : 'bg-white/78',
              )}
              animate={{ opacity: [0.72, 1, 0.72], x: [0, 4, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: index * 0.24, ease: 'easeInOut' }}
            >
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', lane.dotClass)} />
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold',
                    darkMode ? 'bg-[#2b2b2b] text-[#d6d6d6]' : 'bg-bg-base text-text-main/54',
                  )}
                >
                  {lane.label}
                </span>
                <p className={cn('text-xs font-bold', darkMode ? 'text-[#d6d6d6]' : 'text-text-main/72')}>
                  {lane.title}
                </p>
              </div>
              <p className={cn('mt-1.5 text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/42')}>
                {lane.detail}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <div className="relative z-10">
          <motion.div
            variants={fadeUpItem}
            className={cn(
              'rounded-[12px] border p-4',
              darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]/88' : 'border-border-subtle bg-white/80',
            )}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <DatabaseZap size={20} className={darkMode ? 'text-[#d6d6d6]' : 'text-primary'} />
              <div>
                <p className={cn('text-[13px] font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                  Qdrant 数据库
                </p>
                <p className={cn('font-mono text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/42')}>
                  2 collections · 3 vectors
                </p>
              </div>
            </div>

            <div
              className={cn(
                'rounded-lg px-3 py-2',
                darkMode ? 'bg-[#2b2b2b] text-[#d6d6d6]' : 'bg-bg-base/80 text-text-main/58',
              )}
            >
              <div className="mb-2">
                <p className="font-mono text-[10px] font-bold">kb_bucket_*</p>
                {[
                  ['dense_vector', '1024d'],
                  ['sparse_text', 'top_k 256'],
                ].map(([name, value], index) => (
                  <div key={name} className="flex items-center gap-2 py-1">
                    <span
                      className={cn(
                        'h-2 rounded-full',
                        index === 0 ? 'w-16' : 'w-12',
                        index === 0 ? (darkMode ? 'bg-[#d4a373]' : 'bg-primary') : 'bg-[#a8895f]',
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[10px]">{name}</span>
                    <span className={cn('font-mono text-[9px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/38')}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className={cn('border-t pt-2', darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle')}>
                <p className="font-mono text-[10px] font-bold">tolink_rag_bm25</p>
                <div className="flex items-center gap-2 py-1">
                  <span className="h-2 w-14 rounded-full bg-[#5f8f83]" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px]">bm25_text</span>
                  <span className={cn('font-mono text-[9px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/38')}>
                    IDF
                  </span>
                </div>
              </div>
            </div>
            <p className={cn('mt-2 text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/38')}>
              同一 Qdrant 实例，collection 物理隔离
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function RetrievalDemo({ darkMode }: { darkMode?: boolean }) {
  const recallChannels = [
    { label: '稠密召回', meta: 'dense · Qdrant', icon: DatabaseZap, y: 44, color: darkMode ? '#d4a373' : '#d4a373' },
    { label: '稀疏召回', meta: 'sparse · Qdrant', icon: ShieldCheck, y: 166, color: '#a8895f' },
    { label: 'BM25 召回', meta: 'bm25 · Qdrant', icon: SearchCheck, y: 288, color: '#5f8f83' },
  ];
  const candidateChunks = [
    { id: 'ml-note-042-03', width: '88%' },
    { id: 'ml-note-017-01', width: '71%' },
    { id: 'dl-book-220-09', width: '55%' },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(
        'relative min-h-[430px] overflow-hidden rounded-[12px] border p-6',
        darkMode
          ? 'border-[#3a3a3a] bg-[#2b2b2b]/88 shadow-black/25 backdrop-blur-sm'
          : 'border-border-subtle bg-white/62 shadow-sm backdrop-blur-sm',
      )}
    >
      <div className="absolute inset-0 welcome-demo-grid opacity-55" />

      <div className="relative z-10 h-[382px]">
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          viewBox="0 0 620 382"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          {[
            [
              'M142 191H166Q178 191 178 179V84Q178 72 190 72H202',
              darkMode ? 'stroke-[#d4a373]/32' : 'stroke-primary/30',
            ],
            ['M142 191H202', darkMode ? 'stroke-[#a8895f]/34' : 'stroke-[#a8895f]/30'],
            [
              'M142 191H166Q178 191 178 203V298Q178 310 190 310H202',
              darkMode ? 'stroke-[#5f8f83]/38' : 'stroke-[#5f8f83]/32',
            ],
            ['M344 72H362Q374 72 374 84V179Q374 191 382 191', darkMode ? 'stroke-[#d4a373]/32' : 'stroke-primary/30'],
            ['M344 191H382', darkMode ? 'stroke-[#a8895f]/34' : 'stroke-[#a8895f]/30'],
            [
              'M344 310H362Q374 310 374 298V203Q374 191 382 191',
              darkMode ? 'stroke-[#5f8f83]/38' : 'stroke-[#5f8f83]/32',
            ],
            ['M434 191H456', darkMode ? 'stroke-[#d4a373]/32' : 'stroke-primary/30'],
          ].map(([path, strokeClass]) => (
            <path key={path} d={path} className={cn('recall-dashed-path', strokeClass)} />
          ))}
          <path
            d="M142 191H166Q178 191 178 179V84Q178 72 190 72H202"
            className={cn('recall-moving-path', darkMode ? 'stroke-[#d4a373]' : 'stroke-primary')}
          />
          <path d="M142 191H202" className="recall-moving-path index-moving-path-delay stroke-[#a8895f]" />
          <path
            d="M142 191H166Q178 191 178 203V298Q178 310 190 310H202"
            className="recall-moving-path index-moving-path-late stroke-[#5f8f83]"
          />
          <path
            d="M344 72H362Q374 72 374 84V179Q374 191 382 191"
            className={cn('recall-moving-path index-moving-path-out', darkMode ? 'stroke-[#d4a373]' : 'stroke-primary')}
          />
          <path
            d="M344 191H382"
            className="recall-moving-path index-moving-path-out index-moving-path-delay stroke-[#a8895f]"
          />
          <path
            d="M344 310H362Q374 310 374 298V203Q374 191 382 191"
            className="recall-moving-path index-moving-path-out index-moving-path-late stroke-[#5f8f83]"
          />
          <path
            d="M434 191H456"
            className={cn(
              'recall-moving-path index-moving-path-out index-moving-path-delay',
              darkMode ? 'stroke-[#d4a373]' : 'stroke-primary',
            )}
          />
        </svg>

        <motion.div
          variants={fadeUpItem}
          className={cn(
            'absolute left-[18px] top-[148px] z-10 w-[124px] rounded-[12px] border p-3',
            darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]/88' : 'border-border-subtle bg-white/78',
          )}
        >
          <p className={cn('mono-label mb-2', darkMode ? 'text-[#a6a6a6]' : '')}>QUERY · top_k</p>
          <div className="flex items-center gap-2">
            <SearchCheck size={18} className={darkMode ? 'text-[#d6d6d6]' : 'text-primary'} />
            <p className={cn('text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>用户提问</p>
          </div>
        </motion.div>

        {recallChannels.map((channel, index) => {
          const Icon = channel.icon;

          return (
            <motion.div
              key={channel.label}
              variants={fadeUpItem}
              className={cn(
                'absolute left-[202px] z-10 flex w-[142px] items-center gap-2.5 rounded-[12px] border p-3',
                darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]/88' : 'border-border-subtle bg-white/72',
              )}
              style={{ top: channel.y }}
              animate={{ opacity: [0.72, 1, 0.72], x: [0, 4, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: index * 0.26, ease: 'easeInOut' }}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]',
                  darkMode ? 'bg-[#2b2b2b]' : 'bg-bg-base/80',
                )}
                style={{ color: channel.color }}
              >
                <Icon size={18} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main/74')}>
                  {channel.label}
                </p>
                <p className={cn('truncate font-mono text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/42')}>
                  {channel.meta}
                </p>
              </div>
            </motion.div>
          );
        })}

        <motion.div
          variants={fadeUpItem}
          className={cn(
            'absolute left-[382px] top-[150px] z-10 w-[52px] rounded-[12px] border-2 p-2 text-center shadow-sm',
            darkMode ? 'border-[#d4a373] bg-[#1f1f1f]/92' : 'border-primary bg-white/88',
          )}
        >
          <BrainCircuit size={20} className={cn('mx-auto mb-1', darkMode ? 'text-[#d4a373]' : 'text-primary')} />
          <p className={cn('text-sm font-black', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>RRF</p>
          <p className={cn('mt-1 font-mono text-[8px]', darkMode ? 'text-[#d4a373]' : 'text-primary')}>k=60</p>
        </motion.div>

        <motion.div
          variants={fadeUpItem}
          className={cn(
            'absolute right-[16px] top-[106px] z-10 w-[148px] rounded-[12px] border p-3',
            darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]/88' : 'border-border-subtle bg-white/78',
          )}
        >
          <div className="mb-3 flex items-center gap-2">
            <TextQuote size={18} className={darkMode ? 'text-[#d6d6d6]' : 'text-primary'} />
            <div>
              <p className={cn('text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>候选清单</p>
              <p className={cn('font-mono text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/42')}>
                top_k · no body
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {candidateChunks.map((chunk, index) => (
              <motion.div
                key={chunk.id}
                className={cn(
                  'rounded-lg px-2.5 py-2',
                  darkMode ? 'bg-[#2b2b2b] text-[#d6d6d6]' : 'bg-bg-base/80 text-text-main/58',
                )}
                animate={{ opacity: [0.64, 1, 0.74] }}
                transition={{ duration: 2.8, repeat: Infinity, delay: index * 0.2, ease: 'easeInOut' }}
              >
                <p className="truncate font-mono text-[10px]">{chunk.id}</p>
                <div className={cn('mt-1.5 h-1.5 rounded-full', darkMode ? 'bg-[#3a3a3a]' : 'bg-primary/12')}>
                  <motion.div
                    className={cn('h-1.5 rounded-full', darkMode ? 'bg-[#d4a373]' : 'bg-primary')}
                    style={{ width: chunk.width }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
          <p className={cn('mt-3 text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/38')}>
            交下游回填正文 + rerank
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

const answerChunks = [
  {
    title: 'chunk_01.md',
    score: 0.96,
    text: '注意力会为关键 token 分配更高权重。',
  },
  {
    title: 'chunk_08.pdf',
    score: 0.89,
    text: '自注意力能建模长距离依赖关系。',
  },
  {
    title: 'chunk_12.docx',
    score: 0.82,
    text: '多头结构从多个子空间捕获语义。',
  },
];

function StreamingAnswer({ darkMode }: { darkMode?: boolean }) {
  return (
    <div
      className={cn(
        'h-[86px] overflow-hidden rounded-lg border px-3 py-2.5 text-[11px] leading-5',
        darkMode
          ? 'border-[#3a3a3a] bg-[#2b2b2b] text-[#d6d6d6]'
          : 'border-border-subtle bg-white/72 text-text-main/68 backdrop-blur-sm',
      )}
    >
      <p>
        注意力机制会提取关键片段并整合上下文
        <span aria-hidden="true">.....</span>
        <motion.span
          aria-hidden="true"
          className="inline-block"
          animate={{ opacity: [0.18, 1, 0.18] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          .
        </motion.span>
      </p>
    </div>
  );
}

function AnswerGenerationDemo({ darkMode }: { darkMode?: boolean }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(
        'relative min-h-[430px] overflow-hidden rounded-[12px] border p-6',
        darkMode
          ? 'border-[#3a3a3a] bg-[#2b2b2b]/88 shadow-black/25 backdrop-blur-sm'
          : 'border-border-subtle bg-white/62 shadow-sm backdrop-blur-sm',
      )}
    >
      <div className="absolute inset-0 welcome-demo-grid opacity-55" />

      <div className="relative z-10 mx-auto mt-6 h-[350px] w-[520px] overflow-visible">
        <div className="absolute left-0 top-0 h-[382px] w-[620px] origin-top-left scale-[0.835]">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 620 382"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M188 191H238"
              className={cn('recall-dashed-path', darkMode ? 'stroke-primary/30' : 'stroke-primary/38')}
            />
            <path
              d="M358 191H392"
              className={cn('recall-dashed-path', darkMode ? 'stroke-primary/30' : 'stroke-primary/38')}
            />
            <path
              d="M188 191H238"
              className={cn('recall-moving-path', darkMode ? 'stroke-primary' : 'stroke-primary')}
            />
            <path
              d="M358 191H392"
              className={cn(
                'recall-moving-path index-moving-path-delay',
                darkMode ? 'stroke-primary' : 'stroke-primary',
              )}
            />
          </svg>

          <motion.div
            variants={fadeUpItem}
            className={cn(
              'absolute left-0 top-[22px] h-[328px] w-[188px] overflow-hidden rounded-[24px] border p-3.5',
              darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]/88' : 'border-border-subtle bg-bg-base/82',
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={cn('text-[15px] font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                  Top-K 片段
                </p>
                <p className={cn('mt-0.5 text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
                  召回上下文
                </p>
              </div>
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl',
                  darkMode ? 'bg-[#303030] text-primary' : 'bg-primary/12 text-primary',
                )}
              >
                <FileText size={20} />
              </div>
            </div>

            <div className="space-y-2">
              {answerChunks.map((chunk, index) => (
                <motion.div
                  key={chunk.title}
                  className={cn(
                    'rounded-lg border px-3 py-2.5',
                    darkMode ? 'border-[#3a3a3a] bg-[#2b2b2b]/82' : 'border-border-subtle bg-white/70 backdrop-blur-sm',
                  )}
                  animate={{ opacity: [0.76, 1, 0.76] }}
                  transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.22, ease: 'easeInOut' }}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px]',
                          darkMode ? 'bg-primary/12 text-primary' : 'bg-primary/14 text-primary',
                        )}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          'truncate text-[11px] font-bold',
                          darkMode ? 'text-[#d6d6d6]' : 'text-text-main/70',
                        )}
                      >
                        {chunk.title}
                      </span>
                    </div>
                    <span className={cn('font-mono text-[10px]', darkMode ? 'text-primary' : 'text-primary')}>
                      {chunk.score.toFixed(2)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      'line-clamp-1 text-[10px] leading-4',
                      darkMode ? 'text-[#9d9d9d]' : 'text-text-main/55',
                    )}
                  >
                    {chunk.text}
                  </p>
                  <div className={cn('mt-1.5 h-1 rounded-full', darkMode ? 'bg-[#3a3a3a]' : 'bg-text-main/10')}>
                    <motion.div
                      className={cn('h-1 rounded-full', darkMode ? 'bg-primary' : 'bg-primary')}
                      animate={{ width: ['24%', `${Math.round(chunk.score * 100)}%`, '24%'] }}
                      transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.18, ease: 'easeInOut' }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUpItem}
            className={cn(
              'multi-core absolute left-[238px] top-[119px] flex h-[120px] w-[120px] items-center justify-center rounded-full border-[3px]',
              darkMode ? 'border-primary/38 bg-[#1f1f1f]/92' : 'border-primary/38 bg-white/74 backdrop-blur-sm',
            )}
          >
            <div
              className={cn(
                'demo-pulse-ring absolute h-[94px] w-[94px] rounded-full border',
                darkMode ? 'border-primary/28' : 'border-primary/28',
              )}
            />
            <div
              className={cn(
                'absolute inset-0 overflow-hidden rounded-full opacity-35',
                darkMode ? 'bg-[#2b2b2b]' : 'bg-bg-base',
              )}
            >
              <div className="h-full w-full bg-[linear-gradient(rgba(26,26,26,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(26,26,26,.12)_1px,transparent_1px)] bg-[size:18px_18px]" />
            </div>
            <div
              className={cn('relative flex flex-col items-center gap-1', darkMode ? 'text-primary' : 'text-primary')}
            >
              <BrainCircuit size={42} strokeWidth={1.8} />
              <span className={cn('text-[11px] font-bold', darkMode ? 'text-[#d6d6d6]' : 'text-text-main/70')}>
                LLM 智能回答
              </span>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUpItem}
            className={cn(
              'absolute left-[392px] top-[22px] h-[328px] w-[212px] overflow-hidden rounded-[24px] border p-3.5',
              darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]/88' : 'border-border-subtle bg-bg-base/82',
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={cn('text-[15px] font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>AI 回答</p>
                <p className={cn('mt-0.5 text-[10px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
                  生成并保留引用
                </p>
              </div>
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl',
                  darkMode ? 'bg-[#303030] text-primary' : 'bg-primary/12 text-primary',
                )}
              >
                <BotMessageSquare size={20} />
              </div>
            </div>

            <div className="mb-2.5 grid grid-cols-3 gap-1.5">
              {['系统', '上下文', '问题'].map((item, index) => (
                <motion.div
                  key={item}
                  className={cn(
                    'rounded-xl border px-2 py-1.5 text-center text-[10px]',
                    darkMode
                      ? 'border-[#3a3a3a] bg-[#2b2b2b] text-[#a6a6a6]'
                      : 'border-border-subtle bg-white/60 text-text-main/45 backdrop-blur-sm',
                  )}
                  animate={{ opacity: [0.54, 1, 0.54], y: [0, -2, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.18, ease: 'easeInOut' }}
                >
                  {item}
                </motion.div>
              ))}
            </div>

            <StreamingAnswer darkMode={darkMode} />

            <div className="mt-2 flex flex-wrap gap-1.5">
              {['chunk_01', 'chunk_08', 'chunk_12'].map((item, index) => (
                <motion.span
                  key={item}
                  className={cn(
                    'flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px]',
                    darkMode
                      ? 'border-primary/22 bg-primary/8 text-[#d6d6d6]'
                      : 'border-primary/20 bg-primary/10 text-text-main/62',
                  )}
                  animate={{ opacity: [0.64, 1, 0.64] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: 0.9 + index * 0.2, ease: 'easeInOut' }}
                >
                  <TextQuote size={12} />
                  {item}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function HeroKnowledgePreview({ darkMode }: { darkMode?: boolean }) {
  return (
    <motion.div
      variants={fadeUpItem}
      className={cn(
        'relative overflow-hidden rounded-[18px] border p-3 shadow-sm sm:p-4 xl:-mr-6',
        darkMode ? 'border-[#3a3a3a] bg-[#2b2b2b]/88' : 'border-border-subtle bg-bg-card-solid/92',
      )}
    >
      <div className="absolute inset-0 welcome-demo-grid opacity-40" />
      <div
        className={cn(
          'relative flex min-h-[430px] overflow-hidden rounded-[14px] border sm:min-h-[480px] lg:min-h-[520px]',
          darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]' : 'border-hairline bg-canvas',
        )}
      >
        <div
          className={cn(
            'absolute inset-x-0 top-0 z-10 flex h-10 items-center justify-between border-b px-3',
            darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]/92' : 'border-border-subtle bg-canvas/92',
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef6f5e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#d6a84f]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#6f8f7a]" />
          </div>
          <span className={cn('text-[11px] font-medium', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
            demo preview
          </span>
        </div>

        <div className="relative flex flex-1 items-center justify-center p-5 pt-14">
          <div
            className={cn(
              'flex h-full min-h-[360px] w-full items-center justify-center rounded-[12px] border border-dashed',
              darkMode ? 'border-[#4a4a4a] bg-[#2b2b2b]/60' : 'border-border-subtle bg-bg-card-solid/72',
            )}
          >
            <div className="flex max-w-[320px] flex-col items-center text-center">
              <div
                className={cn(
                  'mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] border',
                  darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f] text-[#d6d6d6]' : 'border-hairline bg-canvas text-ink',
                )}
              >
                <Upload size={24} strokeWidth={1.8} />
              </div>
              <p className={cn('text-base font-semibold', darkMode ? 'text-[#f2f2f2]' : 'text-ink')}>产品演示占位</p>
              <p className={cn('mt-2 text-sm leading-6', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
                后续替换为截图、WebM 或 MP4 演示素材
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SystemFeaturesSection({ darkMode }: { darkMode?: boolean }) {
  return (
    <RevealSection id="system-features" className="border-b border-border-subtle/60 py-16 scroll-mt-28 lg:py-20">
      <div className="grid items-start gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
        <div className="lg:sticky lg:top-32">
          <p className={cn('mono-label mb-4', darkMode ? 'text-[#a6a6a6]' : '')}>system features</p>
          <h3
            className={cn(
              'font-semibold tracking-tight text-4xl leading-tight lg:text-6xl',
              darkMode ? 'text-[#f2f2f2]' : 'text-text-main',
            )}
          >
            系统特色
            <br />
            不只是一条处理流程
          </h3>
          <p
            className={cn('mt-6 max-w-[480px] text-base leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}
          >
            流程负责把知识变成可检索、可回答的上下文；系统特色负责让它更容易配置、切换、核验和长期维护。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {systemFeatures.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.24 }}
                transition={{ duration: 0.38, delay: index * 0.06, ease: 'easeOut' }}
                whileHover={{ y: -4 }}
                className={cn(
                  'group rounded-[12px] border p-5 shadow-sm transition-colors lg:p-6',
                  darkMode
                    ? 'border-[#3a3a3a] bg-[#2b2b2b]/82 hover:border-[#d4a373]/42'
                    : 'border-border-subtle bg-white/66 hover:border-primary/28',
                )}
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className={cn('mono-label mb-3', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/36')}>
                      {feature.eyebrow}
                    </p>
                    <h4
                      className={cn('text-xl font-bold tracking-tight', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}
                    >
                      {feature.title}
                    </h4>
                  </div>
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border transition-colors',
                      darkMode
                        ? 'border-[#3a3a3a] text-[#d6d6d6] group-hover:border-[#d4a373]/48 group-hover:text-[#d4a373]'
                        : 'border-border-subtle text-text-main/62 group-hover:border-primary/28 group-hover:text-primary',
                    )}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                  </div>
                </div>

                <p
                  className={cn(
                    'mt-5 min-h-[72px] text-sm leading-6',
                    darkMode ? 'text-[#a6a6a6]' : 'text-text-main/58',
                  )}
                >
                  {feature.description}
                </p>

                <div className={cn('mt-5 border-t pt-4', darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle/80')}>
                  <div className="space-y-2.5">
                    {feature.details.map((detail) => (
                      <div key={detail} className="flex items-center gap-2.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', darkMode ? 'bg-[#d4a373]' : 'bg-primary')} />
                        <span className={cn('text-sm', darkMode ? 'text-[#d6d6d6]' : 'text-text-main/68')}>
                          {detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}

function WarmRibbonBackground({ darkMode }: { darkMode?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={cn('absolute inset-0', darkMode ? 'bg-[#1f1f1f]' : 'bg-canvas')} />
      <div className="welcome-grid absolute inset-0 opacity-35" />
    </div>
  );
}

export default function WelcomePage() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const knowledgeRef = useRef<HTMLDivElement | null>(null);
  const loginRef = useRef<HTMLDivElement | null>(null);
  const { user, setUser, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const [mode, setMode] = useState<AuthMode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthFieldKey, string>>>({});
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [headerPortalTarget, setHeaderPortalTarget] = useState<HTMLElement | null>(null);
  const [headerCompact, setHeaderCompact] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
  });

  const heading = useMemo(() => (mode === 'login' ? '登录' : '注册'), [mode]);
  const activeWorkflowSlide = workflowSlides[activeFlowIndex];

  useEffect(() => {
    setHeaderPortalTarget(document.body);

    return () => setHeaderPortalTarget(null);
  }, []);

  useEffect(() => {
    const updateHeaderCompact = () => {
      setHeaderCompact(window.scrollY > 36);
    };

    updateHeaderCompact();
    window.addEventListener('scroll', updateHeaderCompact, { passive: true });
    return () => window.removeEventListener('scroll', updateHeaderCompact);
  }, []);

  if (user) {
    return <Navigate to={Routes.Home} replace />;
  }

  function scrollElementIntoCenteredView(target: HTMLElement | null, behavior: ScrollBehavior = 'smooth') {
    if (!target) return;

    const header = document.querySelector<HTMLElement>('.welcome-floating-header');
    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const extraGap = 18;
    const targetRect = target.getBoundingClientRect();
    const targetTop = targetRect.top + window.scrollY;
    const centeredOffset = Math.max(headerHeight + extraGap, (window.innerHeight - targetRect.height) / 2);
    const scrollTop = Math.max(0, targetTop - centeredOffset);

    window.scrollTo({
      top: scrollTop,
      behavior,
    });
  }

  function scrollToKnowledge() {
    scrollElementIntoCenteredView(knowledgeRef.current);
  }

  function scrollToLogin(nextMode: AuthMode) {
    setMode(nextMode);
    setFieldErrors({});
    scrollElementIntoCenteredView(loginRef.current);
  }

  function clearFieldError(field: AuthFieldKey) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function focusFirstInvalidField(nextFieldErrors: Partial<Record<AuthFieldKey, string>>) {
    if (nextFieldErrors.username) {
      usernameInputRef.current?.focus();
      return;
    }
    if (nextFieldErrors.email) {
      emailInputRef.current?.focus();
      return;
    }
    if (nextFieldErrors.password) {
      passwordInputRef.current?.focus();
      return;
    }
    if (nextFieldErrors.confirmPassword) {
      confirmPasswordInputRef.current?.focus();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requiredFieldErrors = buildRequiredFieldErrors(form, mode);
    if (Object.keys(requiredFieldErrors).length > 0) {
      setFieldErrors(requiredFieldErrors);
      focusFirstInvalidField(requiredFieldErrors);
      return;
    }
    setFieldErrors({});

    const validationMessage = validateAuthForm(form, mode);
    if (validationMessage) {
      addToast('error', validationMessage, 5000);
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login({
          account: form.username.trim(),
          password: form.password,
        });
      } else {
        await register({
          username: form.username.trim(),
          password: form.password,
          email: form.email.trim(),
        });
      }

      await refreshProfile();
      addToast('success', mode === 'login' ? '登录成功' : '注册成功');
      navigate(Routes.Home, { replace: true });
    } catch (submitError) {
      if (!(submitError instanceof Error)) {
        addToast('error', '认证失败，请稍后再试', 5000);
      }
      setUser(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        'relative min-h-screen overflow-x-hidden',
        darkMode ? 'bg-[#1f1f1f] text-[#d6d6d6]' : 'bg-bg-base text-text-main',
      )}
    >
      <WarmRibbonBackground darkMode={darkMode} />

      {headerPortalTarget
        ? createPortal(
            <header className="welcome-floating-header pointer-events-none fixed inset-x-0 top-0 z-[100] px-4 lg:px-8">
              <div
                className={cn(
                  'pointer-events-auto relative mx-auto max-w-[1240px] transition-transform will-change-transform',
                  headerCompact
                    ? 'translate-y-2 duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]'
                    : 'translate-y-0 duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                )}
              >
                <div
                  className={cn(
                    'absolute inset-0 rounded-[999px] border shadow-[0_14px_34px_rgba(18,18,18,0.08)] backdrop-blur-xl transition-[opacity,transform,background-color,border-color,box-shadow] will-change-[opacity,transform]',
                    headerCompact
                      ? 'translate-y-0 scale-100 opacity-100 duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]'
                      : '-translate-y-0.5 scale-[0.985] opacity-0 duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                    darkMode ? 'border-[#4a4a4a] bg-[#2b2b2b]/98' : 'border-border-subtle bg-bg-frosted',
                  )}
                />
                <div className="relative flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                  <div
                    className={cn(
                      'flex items-center gap-3 transition-transform will-change-transform',
                      headerCompact
                        ? 'translate-x-3 delay-[40ms] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]'
                        : 'translate-x-0 delay-0 duration-[260ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                    )}
                  >
                    <div className="flex h-11 w-11 items-center justify-center">
                      <LinkRagMark darkMode={darkMode} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('mb-1 text-[10px] font-medium', darkMode ? 'text-[#a6a6a6]' : '')}>
                        knowledge workspace
                      </p>
                      <LinkRagLogo darkMode={darkMode} />
                    </div>
                  </div>

                  <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex">
                    {scrollSections.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={(event) => {
                          event.preventDefault();
                          scrollToKnowledge();
                        }}
                        className={cn(
                          'text-sm font-bold uppercase tracking-[0.18em] transition-colors',
                          darkMode ? 'text-[#a6a6a6] hover:text-[#f2f2f2]' : 'text-text-main/45 hover:text-text-main',
                        )}
                      >
                        {item.label}
                      </a>
                    ))}
                    <Link
                      to={Routes.Blogs}
                      className={cn(
                        'text-sm font-bold uppercase tracking-[0.18em] transition-colors',
                        darkMode ? 'text-[#a6a6a6] hover:text-[#f2f2f2]' : 'text-text-main/45 hover:text-text-main',
                      )}
                    >
                      博客
                    </Link>
                    <Link
                      to={Routes.Feedback}
                      className={cn(
                        'text-sm font-bold uppercase tracking-[0.18em] transition-colors',
                        darkMode ? 'text-[#a6a6a6] hover:text-[#f2f2f2]' : 'text-text-main/45 hover:text-text-main',
                      )}
                    >
                      反馈
                    </Link>
                    <a
                      href={githubProjectUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label="打开项目仓库"
                      className={cn(
                        'group inline-flex h-9 w-9 items-center justify-center transition-colors',
                        darkMode ? 'text-[#a6a6a6] hover:text-[#f2f2f2]' : 'text-text-main/45 hover:text-text-main',
                      )}
                    >
                      <Github size={18} strokeWidth={1.85} />
                    </a>
                  </nav>

                  <div
                    className={cn(
                      'flex items-center gap-2 transition-transform will-change-transform',
                      headerCompact
                        ? '-translate-x-3 delay-[40ms] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]'
                        : 'translate-x-0 delay-0 duration-[260ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                    )}
                  >
                    <button
                      onClick={() => scrollToLogin('login')}
                      className={cn(
                        'rounded-md px-4 py-2 text-xs font-bold transition-colors',
                        darkMode ? 'text-[#f2f2f2] hover:bg-white/[0.05]' : 'text-text-main hover:bg-ink/[0.035]',
                      )}
                    >
                      登录
                    </button>
                    <button
                      onClick={() => scrollToLogin('register')}
                      className={cn(
                        'rounded-md px-4 py-2 text-xs font-bold transition-colors',
                        darkMode
                          ? 'bg-primary text-white hover:bg-primary-active'
                          : 'bg-primary text-white hover:bg-primary-active',
                      )}
                    >
                      注册
                    </button>
                  </div>
                </div>
              </div>
            </header>,
            headerPortalTarget,
          )
        : null}

      <main className="relative z-10 mx-auto max-w-[1360px] px-5 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32 lg:px-8">
        <RevealSection
          id="intro"
          className="min-h-[82vh] grid items-center gap-10 border-b border-border-subtle/60 py-12 sm:min-h-[88vh] sm:py-20 lg:grid-cols-[0.78fr_1.22fr] lg:gap-12 xl:grid-cols-[0.76fr_1.24fr] xl:gap-14"
        >
          <div className="lg:pl-2">
            <motion.div className="max-w-[580px]" variants={staggerContainer} initial="hidden" animate="show">
              <motion.p
                variants={fadeUpItem}
                className={cn('mono-label mb-4 sm:mb-6', darkMode ? 'text-[#a6a6a6]' : '')}
              >
                knowledge workspace
              </motion.p>
              <motion.h2
                variants={fadeUpItem}
                className={cn(
                  'font-semibold tracking-tight text-4xl leading-[1.04] sm:text-5xl lg:text-6xl',
                  darkMode ? 'text-[#f2f2f2]' : 'text-text-main',
                )}
              >
                LinkRag
                <br />
                <span className="whitespace-nowrap">让知识可问可答</span>
              </motion.h2>
              <motion.p
                variants={fadeUpItem}
                className={cn(
                  'mt-5 max-w-[500px] text-sm leading-7 sm:mt-7 sm:text-base sm:leading-8',
                  darkMode ? 'text-[#a6a6a6]' : 'text-text-main/60',
                )}
              >
                上传文档，自动构建知识库。围绕内容直接提问，答案溯源至原文。
                <br />
                LinkRag 使每一份资料都被检索、被理解、被使用。
              </motion.p>
            </motion.div>

            <motion.div
              className="mt-8 flex flex-wrap gap-3 sm:mt-10"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              <motion.button
                variants={fadeUpItem}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => scrollToLogin('login')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold shadow-sm transition-opacity',
                  darkMode
                    ? 'bg-primary text-white hover:bg-primary-active'
                    : 'bg-primary text-white hover:bg-primary-active',
                )}
              >
                开始使用
                <ArrowRight size={16} />
              </motion.button>
              <motion.a
                variants={fadeUpItem}
                whileHover={{ y: -3 }}
                href="#knowledge"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToKnowledge();
                }}
                className={cn(
                  'flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold',
                  darkMode
                    ? 'bg-[#303030] text-[#f2f2f2] border border-[#3a3a3a]'
                    : 'bg-white/70 text-text-main border border-border-subtle backdrop-blur-sm',
                )}
              >
                查看功能
                <ArrowDown size={16} />
              </motion.a>
            </motion.div>
          </div>

          <HeroKnowledgePreview darkMode={darkMode} />
        </RevealSection>

        <RevealSection
          id="knowledge"
          className="min-h-[88vh] flex items-center border-b border-border-subtle/60 py-16 scroll-mt-28"
        >
          <div ref={knowledgeRef} className="w-full">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className={cn('mono-label mb-2', darkMode ? 'text-[#a6a6a6]' : '')}>workflow</p>
                <h3 className={cn('text-xl font-bold tracking-tight', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                  核心流程
                </h3>
              </div>
            </div>

            <div className="relative min-h-[560px] overflow-hidden sm:min-h-[600px]">
              <AnimatePresence mode="sync" initial={false}>
                <motion.section
                  key={activeWorkflowSlide.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  className="absolute inset-0 grid w-full items-center gap-8 py-6 lg:grid-cols-[0.92fr_1.08fr]"
                >
                  <div>
                    <p className={cn('mono-label mb-5', darkMode ? 'text-[#a6a6a6]' : '')}>
                      {activeWorkflowSlide.step}
                    </p>
                    <h3
                      className={cn(
                        'font-semibold tracking-tight text-4xl leading-tight lg:text-6xl',
                        darkMode ? 'text-[#f2f2f2]' : 'text-text-main',
                      )}
                    >
                      {activeWorkflowSlide.title}
                    </h3>
                    <p
                      className={cn(
                        'mt-6 max-w-[580px] text-base leading-8',
                        darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58',
                      )}
                    >
                      {activeWorkflowSlide.description}
                    </p>
                  </div>

                  {activeWorkflowSlide.kind === 'cleaning' && <DocumentCleaningDemo darkMode={darkMode} />}

                  {activeWorkflowSlide.kind === 'capabilities' && <UploadChunkDemo darkMode={darkMode} />}

                  {activeWorkflowSlide.kind === 'operations' && <IndexingDemo darkMode={darkMode} />}

                  {activeWorkflowSlide.kind === 'timeline' && <RetrievalDemo darkMode={darkMode} />}

                  {activeWorkflowSlide.kind === 'answer' && <AnswerGenerationDemo darkMode={darkMode} />}
                </motion.section>
              </AnimatePresence>
            </div>

            <div className="mt-5 flex items-center justify-center gap-3">
              {workflowSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => {
                    setActiveFlowIndex(index);
                  }}
                  className={cn(
                    'h-2.5 rounded-md transition-all',
                    activeFlowIndex === index ? 'w-8' : 'w-2.5',
                    darkMode
                      ? activeFlowIndex === index
                        ? 'bg-primary'
                        : 'bg-[#3a3a3a]'
                      : activeFlowIndex === index
                        ? 'bg-primary'
                        : 'bg-text-main/12',
                  )}
                  aria-label={`查看第 ${index + 1} 页`}
                />
              ))}
            </div>
          </div>
        </RevealSection>

        <SystemFeaturesSection darkMode={darkMode} />

        <RevealSection id="login" className="min-h-[92vh] flex items-center py-16 lg:py-20 scroll-mt-28">
          <div ref={loginRef} className="grid w-full items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h3
                className={cn(
                  'font-semibold tracking-tight text-4xl leading-tight lg:text-6xl',
                  darkMode ? 'text-[#f2f2f2]' : 'text-text-main',
                )}
              >
                进入工作台
                <br />
                登录或注册后开始使用
              </h3>
              <p
                className={cn(
                  'mt-6 max-w-[480px] text-base leading-8',
                  darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58',
                )}
              >
                登录已有账号或注册新账号 进入工作台后，即可构建知识库并进行问答。
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              className={cn(
                'rounded-[12px] p-7 shadow-sm lg:p-8',
                darkMode ? 'bg-[#2b2b2b] border border-[#3a3a3a]' : 'bg-bg-card-solid border border-hairline',
              )}
            >
              <div className="mb-6">
                <h3 className={cn('text-3xl font-bold tracking-tight', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                  {heading}
                </h3>
                <div className="mt-3 text-sm leading-6">
                  {mode === 'login' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setFieldErrors({});
                      }}
                      className={cn(
                        'font-medium transition-colors',
                        darkMode ? 'text-[#d6d6d6] hover:text-[#f2f2f2]' : 'text-text-main/70 hover:text-text-main',
                      )}
                    >
                      没有账号？注册
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setFieldErrors({});
                      }}
                      className={cn(
                        'font-medium transition-colors',
                        darkMode ? 'text-[#d6d6d6] hover:text-[#f2f2f2]' : 'text-text-main/70 hover:text-text-main',
                      )}
                    >
                      已有账号？登录
                    </button>
                  )}
                </div>
              </div>

              <div
                className={cn('mb-6 grid grid-cols-2 gap-2 rounded-lg p-1', darkMode ? 'bg-[#1f1f1f]' : 'bg-canvas/70')}
              >
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setMode('login');
                    setFieldErrors({});
                  }}
                  className={cn(
                    'rounded-lg py-3 text-xs font-bold  transition-colors',
                    mode === 'login'
                      ? darkMode
                        ? 'bg-[#303030] text-[#f2f2f2]'
                        : 'bg-bg-card-solid text-text-main shadow-sm'
                      : darkMode
                        ? 'text-[#a6a6a6] hover:text-[#d6d6d6]'
                        : 'text-text-main/50 hover:text-text-main',
                  )}
                >
                  登录
                </motion.button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setMode('register');
                    setFieldErrors({});
                  }}
                  className={cn(
                    'rounded-lg py-3 text-xs font-bold  transition-colors',
                    mode === 'register'
                      ? darkMode
                        ? 'bg-[#303030] text-[#f2f2f2]'
                        : 'bg-bg-card-solid text-text-main shadow-sm'
                      : darkMode
                        ? 'text-[#a6a6a6] hover:text-[#d6d6d6]'
                        : 'text-text-main/50 hover:text-text-main',
                  )}
                >
                  注册
                </motion.button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <label className="block">
                  <span
                    className={cn('mb-2 block text-xs font-bold ', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}
                  >
                    用户名
                  </span>
                  <input
                    ref={usernameInputRef}
                    value={form.username}
                    onChange={(event) => {
                      clearFieldError('username');
                      setForm((prev) => ({ ...prev, username: event.target.value }));
                    }}
                    className={cn(
                      'w-full rounded-lg px-4 py-3 text-sm focus:outline-none',
                      darkMode
                        ? 'bg-[#303030] border border-[#3a3a3a] text-[#f2f2f2] placeholder:text-muted-soft'
                        : 'bg-bg-card-solid border border-border-subtle placeholder:text-text-main/30',
                      fieldErrors.username &&
                        (darkMode ? 'border-error placeholder:!text-error/70' : 'border-error placeholder:!text-error'),
                    )}
                    placeholder={fieldErrors.username ?? '输入用户名'}
                  />
                </label>

                <AnimatePresence initial={false}>
                  {mode === 'register' && (
                    <motion.div
                      key="register-email"
                      initial={{ height: 0, opacity: 0, y: -8 }}
                      animate={{ height: 'auto', opacity: 1, y: 0 }}
                      exit={{ height: 0, opacity: 0, y: -8 }}
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <label className="block">
                        <span
                          className={cn(
                            'mb-2 block text-xs font-bold ',
                            darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60',
                          )}
                        >
                          邮箱
                        </span>
                        <input
                          ref={emailInputRef}
                          type="email"
                          value={form.email}
                          onChange={(event) => {
                            clearFieldError('email');
                            setForm((prev) => ({ ...prev, email: event.target.value }));
                          }}
                          className={cn(
                            'w-full rounded-lg px-4 py-3 text-sm focus:outline-none',
                            darkMode
                              ? 'bg-[#303030] border border-[#3a3a3a] text-[#f2f2f2] placeholder:text-muted-soft'
                              : 'bg-bg-card-solid border border-border-subtle placeholder:text-text-main/30',
                            fieldErrors.email &&
                              (darkMode
                                ? 'border-error placeholder:!text-error/70'
                                : 'border-error placeholder:!text-error'),
                          )}
                          placeholder={fieldErrors.email ?? 'name@example.com'}
                        />
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>

                <label className="block">
                  <span
                    className={cn('mb-2 block text-xs font-bold ', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}
                  >
                    密码
                  </span>
                  <input
                    ref={passwordInputRef}
                    type="password"
                    value={form.password}
                    onChange={(event) => {
                      clearFieldError('password');
                      setForm((prev) => ({ ...prev, password: event.target.value }));
                    }}
                    className={cn(
                      'w-full rounded-lg px-4 py-3 text-sm focus:outline-none',
                      darkMode
                        ? 'bg-[#303030] border border-[#3a3a3a] text-[#f2f2f2] placeholder:text-muted-soft'
                        : 'bg-bg-card-solid border border-border-subtle placeholder:text-text-main/30',
                      fieldErrors.password &&
                        (darkMode ? 'border-error placeholder:!text-error/70' : 'border-error placeholder:!text-error'),
                    )}
                    placeholder={fieldErrors.password ?? '输入密码'}
                  />
                </label>

                <AnimatePresence initial={false}>
                  {mode === 'register' && (
                    <motion.label
                      key="register-confirm-password"
                      initial={{ height: 0, opacity: 0, y: -8 }}
                      animate={{ height: 'auto', opacity: 1, y: 0 }}
                      exit={{ height: 0, opacity: 0, y: -8 }}
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                      className="block overflow-hidden"
                    >
                      <span
                        className={cn(
                          'mb-2 block text-xs font-bold ',
                          darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60',
                        )}
                      >
                        确认密码
                      </span>
                      <input
                        ref={confirmPasswordInputRef}
                        type="password"
                        value={form.confirmPassword}
                        onChange={(event) => {
                          clearFieldError('confirmPassword');
                          setForm((prev) => ({ ...prev, confirmPassword: event.target.value }));
                        }}
                        className={cn(
                          'w-full rounded-lg px-4 py-3 text-sm focus:outline-none',
                          darkMode
                            ? 'bg-[#303030] border border-[#3a3a3a] text-[#f2f2f2] placeholder:text-muted-soft'
                            : 'bg-bg-card-solid border border-border-subtle placeholder:text-text-main/30',
                          fieldErrors.confirmPassword &&
                            (darkMode
                              ? 'border-error placeholder:!text-error/70'
                              : 'border-error placeholder:!text-error'),
                        )}
                        placeholder={fieldErrors.confirmPassword ?? '再次输入密码'}
                      />
                    </motion.label>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    'mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-bold  transition-opacity',
                    darkMode
                      ? 'bg-primary text-white hover:bg-primary-active'
                      : 'bg-primary text-white hover:bg-primary-active',
                    submitting && 'opacity-70',
                  )}
                >
                  {submitting ? '处理中...' : mode === 'login' ? '登录' : '注册'}
                  {!submitting && <ArrowRight size={16} />}
                </motion.button>
              </form>
            </motion.div>
          </div>
        </RevealSection>
      </main>

      <footer className="relative z-10 py-6 text-center">
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            'text-xs transition-colors',
            darkMode ? 'text-[#5a5a5a] hover:text-[#a6a6a6]' : 'text-text-main/30 hover:text-text-main/55',
          )}
        >
          © 2026 LinkRag · 皖ICP备2026017322号
        </a>
      </footer>
    </div>
  );
}
