import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, Navigate, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  BotMessageSquare,
  BrainCircuit,
  Database,
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
import { useTheme } from '@/contexts/ThemeContext';

type AuthMode = 'login' | 'register';
type AuthFieldKey = 'username' | 'email' | 'password' | 'confirmPassword';
const githubProjectUrl = (import.meta.env.VITE_GITHUB_URL as string | undefined)?.trim() || 'https://github.com/ql-link/LinkRag';

const scrollSections = [
  { id: 'knowledge', label: '功能' },
];

const workflowSlides = [
  {
    id: 'knowledge',
    step: '01',
    title: (
      <>
        文档分块
        <br />
        拖拽上传 自动切分为语义块
      </>
    ),
    description: '保留原文上下文，为后续检索准备稳定片段',
    kind: 'capabilities',
  },
  {
    id: 'files',
    step: '02',
    title: (
      <>
        索引构建
        <br />
        向量索引与 ES 全文索引并行写入
      </>
    ),
    description: '让相似含义与精确关键词都能被快速命中',
    kind: 'operations',
  },
  {
    id: 'conversation',
    step: '03',
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
    step: '04',
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

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const fadeUpItem = {
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
      src="/linkrag-mark-v2.png"
      alt="LinkRag"
      className="h-full w-full object-contain"
      style={darkMode ? { filter: 'saturate(0.96) brightness(0.96)' } : undefined}
    />
  );
}

function RevealSection({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
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

const uploadFiles = [
  {
    name: 'ml_notes.pdf',
    type: 'PDF',
    icon: FileText,
    delay: 0,
  },
  {
    name: 'training.docx',
    type: 'DOCX',
    icon: FileType,
    delay: 0.55,
  },
  {
    name: 'model.md',
    type: 'MD',
    icon: FileCode2,
    delay: 1.1,
  },
] as const;

function UploadChunkDemo({ darkMode }: { darkMode?: boolean }) {
  const [stage, setStage] = useState<'idle' | 'uploading' | 'parsing' | 'done'>('idle');
  const [activeFileIndex, setActiveFileIndex] = useState(-1);
  const parseTimers = useRef<number[]>([]);
  const chunks = [
    '监督学习依赖带标签样本，通过损失函数衡量预测值与真实标签的差距。',
    '梯度下降会沿着损失函数下降最快的方向更新参数，学习率决定每一步的幅度。',
    '过拟合通常表现为训练集效果很好，但验证集误差持续升高。',
    '正则化会在目标函数中加入约束项，限制模型参数过大，从而提升泛化能力。',
    '交叉验证会把数据划分为多个子集，轮流训练和评估，以获得更稳定的性能估计。',
  ];

  function clearParseTimers() {
    parseTimers.current.forEach((timer) => window.clearTimeout(timer));
    parseTimers.current = [];
  }

  useEffect(() => {
    clearParseTimers();
    setStage('uploading');
    setActiveFileIndex(0);

    uploadFiles.forEach((_, index) => {
      parseTimers.current.push(window.setTimeout(() => {
        setActiveFileIndex(index);
      }, index * 760));
    });

    parseTimers.current.push(window.setTimeout(() => {
      setStage('parsing');
      setActiveFileIndex(-1);
    }, uploadFiles.length * 760 + 180));

    parseTimers.current.push(window.setTimeout(() => {
      setStage('done');
    }, uploadFiles.length * 760 + 780));

    return () => clearParseTimers();
  }, []);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(
        'relative min-h-[470px] overflow-hidden rounded-[34px] border p-6',
        darkMode ? 'border-[#3c3c3c] bg-[#252526]/88 shadow-black/25' : 'border-border-subtle bg-white/62 shadow-sm backdrop-blur-sm',
      )}
    >
      <div className="absolute inset-0 welcome-demo-grid opacity-55" />
      <div className="relative z-10 h-[430px]">
        <AnimatePresence mode="wait">
          {stage !== 'done' ? (
            <motion.div
              key="upload-box"
              variants={fadeUpItem}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{
                opacity: stage === 'parsing' ? 0.78 : 1,
                y: 0,
                scale: stage === 'parsing' ? 0.98 : 1,
              }}
              exit={{ opacity: 0, y: -18, scale: 0.94 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className={cn(
                'absolute left-[55%] top-[46%] flex h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[34px] border p-7',
                darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e] shadow-[0_0_30px_rgba(197,134,192,0.08)]' : 'border-border-subtle bg-white/86 shadow-[0_16px_40px_rgba(212,163,115,0.14)]',
                stage === 'parsing' ? 'ring-1 ring-primary/20' : '',
                stage === 'done' ? 'scale-95 opacity-0' : '',
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn('mono-label', darkMode ? 'text-[#858585]' : '')}>文件上传</p>
                  <p className={cn('mt-1 text-sm font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>
                    {stage === 'parsing' ? '自动解析中...' : '文件自动进入'}
                  </p>
                </div>
                <Upload size={20} className={darkMode ? 'text-[#d9d9d9]' : 'text-primary'} />
              </div>

              <div className={cn('mt-4 flex-1 rounded-[28px] border border-dashed transition-colors', darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/72', stage === 'uploading' ? 'border-primary/50' : '')}>
                <div className="flex h-full items-center justify-center">
                  <div className={cn('flex h-20 w-20 items-center justify-center rounded-[26px] border transition-transform', darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-primary/12 bg-primary/10', stage === 'parsing' ? 'scale-90' : '')}>
                    <ScissorsLineDashed size={36} className={cn(darkMode ? 'text-[#d9d9d9]' : 'text-primary', stage === 'parsing' ? 'animate-pulse' : '')} />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {uploadFiles.map((file, index) => {
          const Icon = file.icon;
          const isActive = activeFileIndex === index;
          const hasPassed = activeFileIndex > index || stage === 'parsing' || stage === 'done';

          return (
            <motion.div
              key={file.name}
              className="absolute"
              style={{
                top: `${22 + index * 18}%`,
                left: index === 1 ? '1.5%' : '4%',
              }}
              animate={{
                x: isActive ? [0, 70, 210, 330] : 0,
                y: isActive
                  ? [
                    0,
                    index === 0 ? -18 : index === 1 ? -28 : -38,
                    index === 0 ? 4 : index === 1 ? -18 : -44,
                    index === 0 ? 26 : index === 1 ? -4 : -34,
                  ]
                  : 0,
                opacity: hasPassed ? 0 : isActive ? [1, 1, 0.95, 0] : 1,
                scale: isActive ? [1, 1.06, 0.96, 0.82] : 1,
                rotate: isActive ? [index === 1 ? 4 : -3, 5, -8, -14] : index === 1 ? 4 : -3,
              }}
              transition={{
                duration: isActive ? 0.86 : 0.24,
                ease: [0.22, 1, 0.36, 1],
                times: isActive ? [0, 0.28, 0.72, 1] : undefined,
              }}
            >
              <div className="flex flex-col items-center gap-1.5">
                <Icon size={30} className={darkMode ? 'text-[#e6e6e6]' : 'text-primary'} />
                <span className={cn('max-w-[82px] truncate text-center text-[11px]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
                  {file.name}
                </span>
              </div>
            </motion.div>
          );
        })}

        <AnimatePresence mode="wait">
          {stage === 'done' ? (
            <motion.div
              key="chunks"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="absolute left-[55%] top-[48%] w-[min(100%,420px)] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="grid gap-3">
                {chunks.map((chunk, index) => (
                  <motion.div
                    key={chunk}
                    initial={{ opacity: 0, y: 18, scale: 0.94 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      x: [0, index % 2 ? 10 : -10, 0],
                    }}
                    transition={{ duration: 0.34, delay: index * 0.12 }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className={cn('h-1.5 w-1.5 rounded-full', darkMode ? 'bg-[#3b82f6]' : 'bg-primary')} />
                      <p className={cn('text-[10px] font-medium', darkMode ? 'text-[#858585]' : 'text-text-main/42')}>
                        片段 {index + 1}
                      </p>
                    </div>
                    <p className={cn('text-[13px] leading-7', darkMode ? 'text-[#d9d9d9]' : 'text-text-main/70')}>
                      {chunk}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function IndexingDemo({ darkMode }: { darkMode?: boolean }) {
  const chunks = [
    '反向传播会逐层计算损失函数对参数的梯度',
    '学习率过大时\n模型可能在最优点附近震荡。',
    '验证集用于观察泛化能力，避免只记住训练样本。',
  ];
  const vectorPoints = [
    { x: 12, y: 22, near: false },
    { x: 24, y: 58, near: false },
    { x: 36, y: 34, near: true },
    { x: 48, y: 68, near: false },
    { x: 58, y: 42, near: true },
    { x: 72, y: 24, near: false },
    { x: 82, y: 62, near: false },
    { x: 28, y: 76, near: false },
    { x: 68, y: 74, near: true },
    { x: 76, y: 44, near: true },
    { x: 44, y: 18, near: false },
    { x: 16, y: 42, near: false },
    { x: 54, y: 84, near: false },
    { x: 86, y: 30, near: false },
  ];
  const esJsonLines = [
    { indent: 0, text: '{' },
    { indent: 1, key: '"chunk_id"', value: '"ml-note-042-03",' },
    { indent: 1, key: '"content"', value: '"梯度下降通过反向传播更新参数",' },
    { indent: 1, key: '"source"', value: '"ml_notes.pdf",' },
    { indent: 1, key: '"page"', value: '18' },
    { indent: 0, text: '}' },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(
        'relative min-h-[430px] overflow-hidden rounded-[34px] border p-6',
        darkMode ? 'border-[#3c3c3c] bg-[#252526]/88 shadow-black/25' : 'border-border-subtle bg-white/62 shadow-sm backdrop-blur-sm',
      )}
    >
      <div className="absolute inset-0 welcome-demo-grid opacity-55" />

      <div className="relative z-10 grid min-h-[382px] items-center gap-4 [grid-template-columns:minmax(150px,0.78fr)_minmax(120px,1fr)_190px] max-[760px]:grid-cols-1 max-[760px]:gap-5">
        <motion.div
          variants={fadeUpItem}
          className="grid gap-3 max-[760px]:mx-auto max-[760px]:w-full max-[760px]:max-w-[420px]"
        >
          {chunks.map((label, index) => (
            <motion.div
              key={label}
              animate={{ x: [0, 8, 0], opacity: [0.78, 1, 0.78] }}
              transition={{ duration: 2.8, delay: index * 0.28, repeat: Infinity, ease: 'easeInOut' }}
              className="px-1 py-2"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className={cn('h-1.5 w-1.5 rounded-full', index === 1 ? 'bg-primary/55' : darkMode ? 'bg-[#858585]' : 'bg-text-main/24')} />
                <p className={cn('font-mono text-[9px] uppercase tracking-[0.18em]', darkMode ? 'text-[#858585]' : 'text-text-main/42')}>
                  chunk {index + 1}
                </p>
              </div>
                <p className={cn('text-[12px] leading-5', darkMode ? 'text-[#d9d9d9]' : 'text-text-main/64')}>
                  {label}
                </p>
            </motion.div>
          ))}
        </motion.div>

        <svg
          className="pointer-events-none h-[198px] w-full min-w-0 overflow-visible max-[760px]:hidden"
          viewBox="0 0 100 198"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          {[
            'M0 20H27Q34 20 34 32V99',
            'M0 99H50',
            'M0 178H27Q34 178 34 166V99',
            'M50 99H58',
            'M58 99V28Q58 16 65 16H100',
            'M58 99V170Q58 182 65 182H100',
          ].map((path) => (
            <path
              key={path}
              d={path}
              className={cn('index-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/34')}
            />
          ))}
          <path
            d="M0 20H27Q34 20 34 32V99H58"
            className={cn('index-moving-path', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')}
          />
          <path
            d="M0 99H58"
            className={cn('index-moving-path index-moving-path-delay', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')}
          />
          <path
            d="M0 178H27Q34 178 34 166V99H58"
            className={cn('index-moving-path index-moving-path-late', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')}
          />
          <path
            d="M58 99V28Q58 16 65 16H100"
            className={cn('index-moving-path index-moving-path-out', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')}
          />
          <path
            d="M58 99V170Q58 182 65 182H100"
            className={cn('index-moving-path index-moving-path-out index-moving-path-delay', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')}
          />
        </svg>

        <div className="flex w-[190px] flex-col gap-3 justify-self-end max-[760px]:mx-auto max-[760px]:w-full max-[760px]:max-w-[420px]">
          <motion.div
            variants={fadeUpItem}
            className={cn(
              'rounded-2xl border p-3',
              darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/94' : 'border-border-subtle bg-bg-base/90',
            )}
          >
            <div className="mb-2.5 flex items-center gap-2.5">
              <DatabaseZap size={20} className={darkMode ? 'text-[#3b82f6]' : 'text-primary'} />
              <div>
                <p className={cn('text-[13px] font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>向量索引</p>
                <p className={cn('text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/48')}>embedding vectors</p>
              </div>
            </div>
            <div className={cn('relative h-[74px] overflow-hidden rounded-2xl border', darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/72')}>
              <div className={cn('absolute left-[46%] top-[38%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border', darkMode ? 'border-[#3b82f6]/28 bg-[#3b82f6]/6' : 'border-primary/28 bg-primary/10')} />
              <div className={cn('demo-pulse-ring absolute left-[46%] top-[38%] h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border', darkMode ? 'border-[#3b82f6]/25' : 'border-primary/24')} />
              {vectorPoints.map((point, index) => (
                <motion.span
                  key={`${point.x}-${point.y}`}
                  className={cn(
                    'absolute rounded-full',
                    point.near
                      ? darkMode ? 'bg-[#3b82f6] shadow-[0_0_16px_rgba(197,134,192,0.45)]' : 'bg-primary shadow-[0_0_16px_rgba(212,163,115,0.5)]'
                      : darkMode ? 'bg-[#5a5a5a]' : 'bg-text-main/18',
                  )}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    width: point.near ? 6 : 4,
                    height: point.near ? 6 : 4,
                  }}
                  animate={{
                    scale: point.near ? [1, 1.45, 1] : [1, 1.15, 1],
                    opacity: point.near ? [0.75, 1, 0.75] : [0.35, 0.72, 0.35],
                  }}
                  transition={{ duration: 2.1, delay: index * 0.08, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
              <motion.span
                className={cn('absolute left-[58%] top-[42%] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white', darkMode ? 'border-[#3b82f6]' : 'border-primary')}
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>

          <motion.div
            variants={fadeUpItem}
            className={cn(
              'rounded-2xl border p-3',
              darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/94' : 'border-border-subtle bg-bg-base/90',
            )}
          >
            <div className="mb-2.5 flex items-center gap-2.5">
              <Database size={20} className={darkMode ? 'text-[#3b82f6]' : 'text-primary'} />
              <div>
                <p className={cn('text-[13px] font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>ES 入库</p>
                <p className={cn('text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/48')}>text + metadata</p>
              </div>
            </div>
            <div className={cn('rounded-2xl border px-2.5 py-2 font-mono text-[8px] leading-[1.8]', darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/72')}>
              {esJsonLines.map((line, index) => (
                <p
                  key={index}
                  className={cn(
                    'index-es-row flex min-w-0 whitespace-nowrap',
                    darkMode ? 'text-[#d9d9d9]' : 'text-text-main/62',
                  )}
                  style={{
                    paddingLeft: `${line.indent * 10}px`,
                    animationDelay: `${index * 0.16 + 0.1}s`,
                  }}
                >
                  {'key' in line ? (
                    <>
                      <span className={cn('shrink-0', darkMode ? 'text-[#3b82f6]' : 'text-primary')}>{line.key}</span>
                      <span className={cn('shrink-0', darkMode ? 'text-[#858585]' : 'text-text-main/42')}>: </span>
                      <span className="min-w-0 flex-1 truncate">{line.value}</span>
                    </>
                  ) : (
                    line.text
                  )}
                </p>
              ))}
            </div>
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}

function RetrievalDemo({ darkMode }: { darkMode?: boolean }) {
  const channels = [
    { label: '向量召回', icon: DatabaseZap, y: 22 },
    { label: '全文检索', icon: SearchCheck, y: 198 },
    { label: '图谱召回', icon: ShieldCheck, y: 374 },
  ];
  const topKChunks = [
    {
      score: '0.92',
      text: '注意力机制会为不同 token 分配权重，突出与当前语义最相关的信息。',
    },
    {
      score: '0.87',
      text: '自注意力可以直接建模长距离依赖，减少序列位置带来的信息衰减。',
    },
    {
      score: '0.81',
      text: '多头注意力从多个子空间并行捕获关系，让模型理解更丰富的上下文。',
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(
        'relative min-h-[430px] overflow-hidden rounded-[34px] border p-6',
        darkMode ? 'border-[#3c3c3c] bg-[#252526]/88 shadow-black/25' : 'border-border-subtle bg-white/62 shadow-sm backdrop-blur-sm',
      )}
    >
      <div className="absolute inset-0 welcome-demo-grid opacity-55" />

      <div className="relative z-10 mt-14 grid items-center justify-start gap-4 overflow-hidden [grid-template-columns:282px_174px] max-[620px]:grid-cols-1">
        <motion.div variants={fadeUpItem} className="relative h-[159px] w-[282px] justify-self-start">
          <div className="absolute left-0 top-0 h-[474px] w-[984px] origin-top-left scale-[0.335]">
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 984 474"
              fill="none"
              aria-hidden="true"
            >
            <path d="M204 237H232" className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')} />
            <path d="M388 237C456 237 374 66 458 66" className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')} />
            <path d="M388 237H458" className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')} />
            <path d="M388 237C456 237 374 418 458 418" className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')} />
            <path d="M738 66H760Q782 66 782 88V237" className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')} />
            <path d="M708 237H782" className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')} />
            <path d="M738 418H760Q782 418 782 396V237" className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')} />
            <path d="M782 237H890" className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')} />

            <path d="M204 237H232" className={cn('recall-moving-path', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')} />
            <path d="M388 237C456 237 374 66 458 66" className={cn('recall-moving-path index-moving-path-delay', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')} />
            <path d="M388 237H458" className={cn('recall-moving-path index-moving-path-late', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')} />
            <path d="M388 237C456 237 374 418 458 418" className={cn('recall-moving-path index-moving-path-out', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')} />
            <path d="M738 66H760Q782 66 782 88V237" className={cn('recall-moving-path index-moving-path-out', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')} />
            <path d="M708 237H782" className={cn('recall-moving-path index-moving-path-out index-moving-path-delay', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')} />
            <path d="M738 418H760Q782 418 782 396V237" className={cn('recall-moving-path index-moving-path-out index-moving-path-late', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')} />
            <path d="M782 237H890" className={cn('recall-moving-path index-moving-path-out index-moving-path-delay', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')} />
            </svg>

          <div className="absolute left-[14px] top-[184px] flex h-[106px] w-[190px] items-center">
            <p className={cn('font-sans text-[36px] font-bold leading-[1.14] tracking-normal', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>
              <span className="block whitespace-nowrap">为什么需要</span>
              <span className="block whitespace-nowrap">注意力机制？</span>
            </p>
          </div>

          <div className={cn('multi-core absolute left-[238px] top-[162px] flex h-[150px] w-[150px] items-center justify-center rounded-full border-[3px]', darkMode ? 'border-[#3b82f6]/38 bg-[#1e1e1e]/92' : 'border-primary/38 bg-white/74')}>
            <div className={cn('demo-pulse-ring absolute h-[126px] w-[126px] rounded-full border', darkMode ? 'border-[#3b82f6]/28' : 'border-primary/28')} />
            <div className="relative h-[110px] w-[110px]">
              {[
                [18, 52],
                [40, 24],
                [66, 38],
                [54, 70],
                [78, 62],
                [36, 58],
              ].map(([x, y], index) => (
                <span
                  key={`${x}-${y}`}
                  className={cn('multi-core-dot absolute h-[10px] w-[10px] rounded-full', index % 2 ? 'bg-primary/70' : 'bg-primary')}
                  style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${index * 0.14}s` }}
                />
              ))}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
                <path d="M23 57L45 29L70 43L60 75L41 64L23 57M41 64L45 29M41 64L70 43M70 43L82 67" className={cn('recall-core-line', darkMode ? 'stroke-[#3b82f6]/58' : 'stroke-primary/62')} />
              </svg>
            </div>
          </div>

          {channels.map((channel, index) => {
            const Icon = channel.icon;

            return (
              <div
                key={channel.label}
              className={cn('multi-channel-card absolute left-[458px] flex h-[88px] w-[280px] items-center gap-5 rounded-[20px] border px-7', darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/88' : 'border-border-subtle bg-white/62')}
              style={{ top: channel.y, animationDelay: `${0.7 + index * 0.3}s` }}
            >
                <Icon size={48} strokeWidth={1.8} className={cn('shrink-0', darkMode ? 'text-[#3b82f6]' : 'text-primary')} />
                <span className={cn('text-[27px] font-medium tracking-tight', darkMode ? 'text-[#f0f0f0]' : 'text-text-main/76')}>{channel.label}</span>
              </div>
            );
          })}

          </div>
        </motion.div>

        <motion.div
          variants={fadeUpItem}
          className={cn(
            'w-[174px] justify-self-start rounded-2xl border px-3 py-3',
            darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/82' : 'border-border-subtle bg-white/58',
          )}
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div>
              <p className={cn('text-[12px] font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>Top-K 片段</p>
              <p className={cn('mt-0.5 text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>融合候选结果</p>
            </div>
            <span className={cn('font-mono text-[10px]', darkMode ? 'text-[#3b82f6]' : 'text-primary')}>K=3</span>
          </div>
          <div className={cn('divide-y', darkMode ? 'divide-[#3c3c3c]' : 'divide-border-subtle')}>
            {topKChunks.map((chunk, index) => (
              <motion.div
                key={chunk.score}
                className="py-2"
                animate={{ opacity: [0.72, 1, 0.72] }}
                transition={{ duration: 2.4, delay: index * 0.24, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className={cn('h-1.5 w-1.5 rounded-full', darkMode ? 'bg-[#3b82f6]' : 'bg-primary')} />
                  <span className={cn('font-mono text-[9px] font-bold', darkMode ? 'text-[#3b82f6]' : 'text-primary')}>
                    得分 {chunk.score}
                  </span>
                </div>
                <p className={cn('line-clamp-2 text-[10px] leading-4', darkMode ? 'text-[#d9d9d9]' : 'text-text-main/66')}>
                  {chunk.text}
                </p>
              </motion.div>
            ))}
          </div>
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
        'h-[86px] overflow-hidden rounded-2xl border px-3 py-2.5 text-[11px] leading-5',
        darkMode ? 'border-[#3c3c3c] bg-[#252526] text-[#d9d9d9]' : 'border-border-subtle bg-white/72 text-text-main/68',
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
        'relative min-h-[430px] overflow-hidden rounded-[34px] border p-6',
        darkMode ? 'border-[#3c3c3c] bg-[#252526]/88 shadow-black/25' : 'border-border-subtle bg-white/62 shadow-sm backdrop-blur-sm',
      )}
    >
      <div className="absolute inset-0 welcome-demo-grid opacity-55" />

      <div className="relative z-10 mx-auto mt-6 h-[350px] w-[520px] overflow-visible">
        <div className="absolute left-0 top-0 h-[382px] w-[620px] origin-top-left scale-[0.835]">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 620 382" fill="none" aria-hidden="true">
          <path d="M188 191H238" className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')} />
          <path d="M358 191H392" className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')} />
          <path d="M188 191H238" className={cn('recall-moving-path', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')} />
          <path d="M358 191H392" className={cn('recall-moving-path index-moving-path-delay', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')} />
        </svg>

        <motion.div
          variants={fadeUpItem}
          className={cn('absolute left-0 top-[22px] h-[328px] w-[188px] overflow-hidden rounded-[24px] border p-3.5', darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/88' : 'border-border-subtle bg-bg-base/82')}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className={cn('text-[15px] font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>Top-K 片段</p>
              <p className={cn('mt-0.5 text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>召回上下文</p>
            </div>
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', darkMode ? 'bg-[#2d2d2d] text-[#3b82f6]' : 'bg-primary/12 text-primary')}>
              <FileText size={20} />
            </div>
          </div>

          <div className="space-y-2">
            {answerChunks.map((chunk, index) => (
              <motion.div
                key={chunk.title}
                className={cn('rounded-2xl border px-3 py-2.5', darkMode ? 'border-[#3c3c3c] bg-[#252526]/82' : 'border-border-subtle bg-white/70')}
                animate={{ opacity: [0.76, 1, 0.76] }}
                transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.22, ease: 'easeInOut' }}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px]', darkMode ? 'bg-[#3b82f6]/12 text-[#3b82f6]' : 'bg-primary/14 text-primary')}>{index + 1}</span>
                    <span className={cn('truncate text-[11px] font-bold', darkMode ? 'text-[#d9d9d9]' : 'text-text-main/70')}>{chunk.title}</span>
                  </div>
                  <span className={cn('font-mono text-[10px]', darkMode ? 'text-[#3b82f6]' : 'text-primary')}>{chunk.score.toFixed(2)}</span>
                </div>
                <p className={cn('line-clamp-1 text-[10px] leading-4', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/55')}>{chunk.text}</p>
                <div className={cn('mt-1.5 h-1 rounded-full', darkMode ? 'bg-[#3c3c3c]' : 'bg-text-main/10')}>
                  <motion.div
                    className={cn('h-1 rounded-full', darkMode ? 'bg-[#3b82f6]' : 'bg-primary')}
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
          className={cn('multi-core absolute left-[238px] top-[119px] flex h-[120px] w-[120px] items-center justify-center rounded-full border-[3px]', darkMode ? 'border-[#3b82f6]/38 bg-[#1e1e1e]/92' : 'border-primary/38 bg-white/74')}
        >
          <div className={cn('demo-pulse-ring absolute h-[94px] w-[94px] rounded-full border', darkMode ? 'border-[#3b82f6]/28' : 'border-primary/28')} />
          <div className={cn('absolute inset-0 overflow-hidden rounded-full opacity-35', darkMode ? 'bg-[#252526]' : 'bg-bg-base')}>
            <div className="h-full w-full bg-[linear-gradient(rgba(26,26,26,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(26,26,26,.12)_1px,transparent_1px)] bg-[size:18px_18px]" />
          </div>
          <div className={cn('relative flex flex-col items-center gap-1', darkMode ? 'text-[#3b82f6]' : 'text-primary')}>
            <BrainCircuit size={42} strokeWidth={1.8} />
            <span className={cn('text-[11px] font-bold', darkMode ? 'text-[#d9d9d9]' : 'text-text-main/70')}>LLM 智能回答</span>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUpItem}
          className={cn('absolute left-[392px] top-[22px] h-[328px] w-[212px] overflow-hidden rounded-[24px] border p-3.5', darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/88' : 'border-border-subtle bg-bg-base/82')}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className={cn('text-[15px] font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>AI 回答</p>
              <p className={cn('mt-0.5 text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>生成并保留引用</p>
            </div>
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', darkMode ? 'bg-[#2d2d2d] text-[#3b82f6]' : 'bg-primary/12 text-primary')}>
              <BotMessageSquare size={20} />
            </div>
          </div>

          <div className="mb-2.5 grid grid-cols-3 gap-1.5">
            {['系统', '上下文', '问题'].map((item, index) => (
              <motion.div
                key={item}
                className={cn('rounded-xl border px-2 py-1.5 text-center text-[10px]', darkMode ? 'border-[#3c3c3c] bg-[#252526] text-[#858585]' : 'border-border-subtle bg-white/60 text-text-main/45')}
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
                className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]', darkMode ? 'border-[#3b82f6]/22 bg-[#3b82f6]/8 text-[#d9d9d9]' : 'border-primary/20 bg-primary/10 text-text-main/62')}
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

function WarmRibbonBackground({ darkMode }: { darkMode?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={cn(
          'absolute inset-0',
          darkMode
            ? 'bg-[linear-gradient(180deg,#1f1f1f_0%,#242424_40%,#1f1f1f_100%)]'
            : 'bg-[linear-gradient(180deg,#f8f4ef_0%,#f3eee7_40%,#f8f4ef_100%)]',
        )}
      />
      <div
        className={cn(
          'welcome-ribbon absolute -left-[12%] top-[7%] h-[220px] w-[72%] rotate-[-6deg] rounded-[999px]',
          darkMode ? 'bg-[#3b82f6]/12' : 'bg-[#f0d9bf]/70',
        )}
      />
      <div
        className={cn(
          'welcome-ribbon absolute right-[-16%] top-[18%] h-[180px] w-[62%] rotate-[8deg] rounded-[999px]',
          darkMode ? 'bg-[#094771]/26' : 'bg-[#ead9ca]/86',
        )}
      />
      <div
        className={cn(
          'welcome-ribbon absolute left-[-8%] top-[44%] h-[210px] w-[58%] rotate-[6deg] rounded-[999px]',
          darkMode ? 'bg-[#d4a373]/12' : 'bg-[#f4e8dc]/92',
        )}
      />
      <div
        className={cn(
          'welcome-ribbon absolute right-[-10%] bottom-[22%] h-[220px] w-[65%] rotate-[-7deg] rounded-[999px]',
          darkMode ? 'bg-[#3b82f6]/10' : 'bg-[#f1decc]/85',
        )}
      />
      <div className="welcome-grid absolute inset-0 opacity-50" />
      <div className="absolute left-[7%] top-[15%] h-4 w-4 rounded-full bg-primary/30 animate-float-slow" />
      <div className="absolute right-[12%] top-[28%] h-6 w-6 rounded-full bg-primary/20 animate-float-delay" />
      <div className="absolute left-[18%] bottom-[18%] h-5 w-5 rounded-full bg-primary/20 animate-float-slow" />
    </div>
  );
}

export default function WelcomePage() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const loginRef = useRef<HTMLDivElement | null>(null);
  const { user, setUser, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const [mode, setMode] = useState<AuthMode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthFieldKey, string>>>({});
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [hasUserSelectedFlow, setHasUserSelectedFlow] = useState(false);
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

  const heading = useMemo(
    () => (mode === 'login' ? '登录' : '注册'),
    [mode],
  );
  const activeWorkflowSlide = workflowSlides[activeFlowIndex];

  useEffect(() => {
    setHeaderPortalTarget(document.body);

    return () => setHeaderPortalTarget(null);
  }, []);

  useEffect(() => {
    if (hasUserSelectedFlow) return;

    const timer = window.setInterval(() => {
      setActiveFlowIndex((currentIndex) => (currentIndex + 1) % workflowSlides.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [hasUserSelectedFlow]);

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

  function scrollToLogin(nextMode: AuthMode) {
    setMode(nextMode);
    setFieldErrors({});
    const target = loginRef.current;
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
      behavior: 'smooth',
    });
  }

  function clearFieldError(field: AuthFieldKey) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function buildRequiredFieldErrors(): Partial<Record<AuthFieldKey, string>> {
    const nextFieldErrors: Partial<Record<AuthFieldKey, string>> = {};
    const username = form.username.trim();
    const email = form.email.trim();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    if (!username) {
      nextFieldErrors.username = '未填写用户名！';
    }

    if (!password) {
      nextFieldErrors.password = '未填写密码！';
    }

    if (mode === 'register') {
      if (!email) {
        nextFieldErrors.email = '未填写邮箱！';
      }
      if (!confirmPassword) {
        nextFieldErrors.confirmPassword = '请确认密码！';
      }
    }

    return nextFieldErrors;
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

  function validateAuthForm(): string | null {
    const username = form.username.trim();
    const password = form.password;
    const email = form.email.trim();

    if (!username) {
      return '请输入用户名';
    }

    if (mode === 'register') {
      if (username.length < 3 || username.length > 64) {
        return '用户名长度需在 3 到 64 个字符之间';
      }
      if (!email) {
        return '请输入邮箱';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return '请输入正确的邮箱地址';
      }
      if (password.length < 6 || password.length > 128) {
        return '密码长度需在 6 到 128 个字符之间';
      }
      if (password !== form.confirmPassword) {
        return '两次输入的密码不一致';
      }
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requiredFieldErrors = buildRequiredFieldErrors();
    if (Object.keys(requiredFieldErrors).length > 0) {
      setFieldErrors(requiredFieldErrors);
      focusFirstInvalidField(requiredFieldErrors);
      return;
    }
    setFieldErrors({});

    const validationMessage = validateAuthForm();
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
        darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main',
      )}
    >
      <WarmRibbonBackground darkMode={darkMode} />

      {headerPortalTarget
        ? createPortal(
          <header className={cn(
            'welcome-floating-header pointer-events-none fixed inset-x-0 top-0 z-[100] px-4 transition-all duration-300 lg:px-8',
            headerCompact ? 'py-2' : 'py-3',
          )}>
            <div
              className={cn(
                'pointer-events-auto relative mx-auto flex max-w-[1240px] items-center justify-between rounded-full px-4 backdrop-blur-xl transition-all duration-300',
                headerCompact ? 'py-2 shadow-md' : 'py-3 shadow-lg',
                darkMode
                  ? headerCompact
                    ? 'bg-[#252526]/98 border border-[#454545] shadow-black/30'
                    : 'bg-[#252526]/95 border border-[#3c3c3c] shadow-black/25'
                  : headerCompact
                    ? 'bg-white/96 border border-white shadow-text-main/12'
                    : 'bg-white/92 border border-white/90 shadow-text-main/10',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex items-center justify-center transition-all duration-300',
                  headerCompact ? 'h-10 w-10' : 'h-12 w-12',
                )}>
                  <LinkRagMark darkMode={darkMode} />
                </div>
                <div>
                  <p className={cn('mono-label transition-all duration-300', headerCompact ? 'mb-0 text-[8px]' : 'mb-1', darkMode ? 'text-[#858585]' : '')}>knowledge workspace</p>
                  <h1 className={cn('font-bold tracking-tight transition-all duration-300', headerCompact ? 'text-base' : 'text-lg', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                    LinkRag
                  </h1>
                </div>
              </div>

              <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex">
                {scrollSections.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={cn(
                      'text-sm font-bold uppercase tracking-[0.18em] transition-colors',
                      darkMode ? 'text-[#858585] hover:text-[#e0e0e0]' : 'text-text-main/45 hover:text-text-main',
                    )}
                  >
                    {item.label}
                  </a>
                ))}
                <Link
                  to={Routes.Blogs}
                  className={cn(
                    'text-sm font-bold uppercase tracking-[0.18em] transition-colors',
                    darkMode ? 'text-[#858585] hover:text-[#e0e0e0]' : 'text-text-main/45 hover:text-text-main',
                  )}
                >
                  博客
                </Link>
                <Link
                  to={Routes.Feedback}
                  className={cn(
                    'text-sm font-bold uppercase tracking-[0.18em] transition-colors',
                    darkMode ? 'text-[#858585] hover:text-[#e0e0e0]' : 'text-text-main/45 hover:text-text-main',
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
                    darkMode
                      ? 'text-[#858585] hover:text-[#e0e0e0]'
                      : 'text-text-main/45 hover:text-text-main',
                  )}
                >
                  <Github size={18} strokeWidth={1.85} />
                </a>
              </nav>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollToLogin('login')}
                  className={cn(
                    'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] transition-colors',
                    darkMode ? 'bg-[#2d2d2d] text-[#e0e0e0] hover:bg-[#3a3a3a]' : 'bg-bg-base text-text-main hover:bg-white',
                  )}
                >
                  登录
                </button>
                <button
                  onClick={() => scrollToLogin('register')}
                  className={cn(
                    'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] transition-opacity',
                    darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-text-main text-white hover:opacity-90',
                  )}
                >
                  注册
                </button>
              </div>
            </div>
          </header>,
          headerPortalTarget,
        )
        : null}

      <main className="relative z-10 mx-auto max-w-[1240px] px-5 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32 lg:px-8">
        <RevealSection
          id="intro"
          className="min-h-[82vh] flex flex-col justify-center border-b border-border-subtle/60 py-12 sm:min-h-[88vh] sm:py-20"
        >
          <motion.div
            className="max-w-[820px]"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.p variants={fadeUpItem} className={cn('mono-label mb-4 sm:mb-6', darkMode ? 'text-[#858585]' : '')}>
              knowledge workspace
            </motion.p>
            <motion.h2 variants={fadeUpItem} className={cn('serif-heading text-5xl leading-[1.02] sm:text-6xl lg:text-8xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
              LinkRag
              <br />
              让知识可问可答
            </motion.h2>
            <motion.p variants={fadeUpItem} className={cn('mt-6 max-w-[820px] text-base leading-8 sm:mt-8 sm:text-lg sm:leading-9', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/60')}>
              上传文档，自动构建知识库。围绕内容直接提问，答案溯源至原文。
              <br />
              LinkRag 使每一份资料都被检索、被理解、被使用。
            </motion.p>
          </motion.div>

          <motion.div
            className="mt-10 flex flex-wrap gap-3 sm:mt-14 sm:gap-4"
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
                'flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-[0.22em] transition-opacity shadow-sm',
                darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-text-main text-white hover:opacity-90',
              )}
            >
              开始使用
              <ArrowRight size={16} />
            </motion.button>
            <motion.a
              variants={fadeUpItem}
              whileHover={{ y: -3 }}
              href="#knowledge"
              className={cn(
                'flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-[0.22em]',
                darkMode ? 'bg-[#2d2d2d] text-[#e0e0e0] border border-[#3c3c3c]' : 'bg-white/70 text-text-main border border-border-subtle',
              )}
            >
              查看功能
              <ArrowDown size={16} />
            </motion.a>
          </motion.div>
        </RevealSection>

        <RevealSection
          id="knowledge"
          className="min-h-[88vh] flex flex-col justify-center border-b border-border-subtle/60 py-16"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className={cn('mono-label mb-2', darkMode ? 'text-[#858585]' : '')}>workflow</p>
              <h3 className={cn('text-xl font-bold tracking-tight', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                四步流程
              </h3>
            </div>
          </div>

          <div className="relative min-h-[600px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.section
                key={activeWorkflowSlide.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="grid items-start gap-8 py-6 lg:min-h-[540px] lg:grid-cols-[0.92fr_1.08fr]"
              >
                  <div>
                    <p className={cn('mono-label mb-5', darkMode ? 'text-[#858585]' : '')}>{activeWorkflowSlide.step}</p>
                    <h3 className={cn('serif-heading text-4xl leading-tight lg:text-6xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                      {activeWorkflowSlide.title}
                    </h3>
                    <p className={cn('mt-6 max-w-[580px] text-base leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}>
                      {activeWorkflowSlide.description}
                    </p>
                  </div>

                  {activeWorkflowSlide.kind === 'capabilities' && (
                    <UploadChunkDemo darkMode={darkMode} />
                  )}

                  {activeWorkflowSlide.kind === 'operations' && (
                    <IndexingDemo darkMode={darkMode} />
                  )}

                  {activeWorkflowSlide.kind === 'timeline' && (
                    <RetrievalDemo darkMode={darkMode} />
                  )}

                  {activeWorkflowSlide.kind === 'answer' && (
                    <AnswerGenerationDemo darkMode={darkMode} />
                  )}
              </motion.section>
            </AnimatePresence>
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            {workflowSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  setHasUserSelectedFlow(true);
                  setActiveFlowIndex(index);
                }}
                className={cn(
                  'h-2.5 rounded-full transition-all',
                  activeFlowIndex === index ? 'w-8' : 'w-2.5',
                  darkMode
                    ? activeFlowIndex === index ? 'bg-[#3b82f6]' : 'bg-[#3c3c3c]'
                    : activeFlowIndex === index ? 'bg-primary' : 'bg-text-main/12',
                )}
                aria-label={`查看第 ${index + 1} 页`}
              />
            ))}
          </div>
        </RevealSection>

        <RevealSection id="login" className="min-h-[92vh] flex items-center py-16 lg:py-20 scroll-mt-28">
          <div ref={loginRef} className="grid w-full items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h3 className={cn('serif-heading text-4xl leading-tight lg:text-6xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                进入工作台
                <br />
                登录或注册后开始使用
              </h3>
              <p className={cn('mt-6 max-w-[480px] text-base leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}>
                登录已有账号或注册新账号
进入工作台后，即可构建知识库并进行问答。
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              className={cn(
                'rounded-[34px] p-7 shadow-xl lg:p-8 card-glow',
                darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white/84 backdrop-blur-sm border border-white/85',
              )}
            >
              <div className="mb-6">
                <h3 className={cn('text-3xl font-bold tracking-tight', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>
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
                      className={cn('font-medium transition-colors', darkMode ? 'text-[#d0d0d0] hover:text-[#f0f0f0]' : 'text-text-main/70 hover:text-text-main')}
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
                      className={cn('font-medium transition-colors', darkMode ? 'text-[#d0d0d0] hover:text-[#f0f0f0]' : 'text-text-main/70 hover:text-text-main')}
                    >
                      已有账号？登录
                    </button>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  'mb-6 grid grid-cols-2 gap-2 rounded-2xl p-1',
                  darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base/70',
                )}
              >
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setMode('login');
                    setFieldErrors({});
                  }}
                  className={cn(
                    'rounded-2xl py-3 text-xs font-bold uppercase tracking-[0.22em] transition-colors',
                    mode === 'login'
                      ? darkMode
                        ? 'bg-[#2d2d2d] text-[#f0f0f0]'
                        : 'bg-white text-text-main shadow-sm'
                      : darkMode
                        ? 'text-[#858585] hover:text-[#cccccc]'
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
                    'rounded-2xl py-3 text-xs font-bold uppercase tracking-[0.22em] transition-colors',
                    mode === 'register'
                      ? darkMode
                        ? 'bg-[#2d2d2d] text-[#f0f0f0]'
                        : 'bg-white text-text-main shadow-sm'
                      : darkMode
                        ? 'text-[#858585] hover:text-[#cccccc]'
                        : 'text-text-main/50 hover:text-text-main',
                  )}
                >
                  注册
                </motion.button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <label className="block">
                  <span className={cn('mb-2 block text-xs font-bold uppercase tracking-[0.22em]', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}>
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
                      'w-full rounded-2xl px-4 py-3 text-sm focus:outline-none',
                      darkMode
                        ? 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                        : 'bg-bg-base/45 border border-border-subtle placeholder:text-text-main/30',
                      fieldErrors.username && (darkMode ? 'border-red-500 placeholder:!text-red-300' : 'border-red-400 placeholder:!text-red-500'),
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
                      <span className={cn('mb-2 block text-xs font-bold uppercase tracking-[0.22em]', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}>
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
                          'w-full rounded-2xl px-4 py-3 text-sm focus:outline-none',
                          darkMode
                            ? 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                            : 'bg-bg-base/45 border border-border-subtle placeholder:text-text-main/30',
                          fieldErrors.email && (darkMode ? 'border-red-500 placeholder:!text-red-300' : 'border-red-400 placeholder:!text-red-500'),
                        )}
                        placeholder={fieldErrors.email ?? 'name@example.com'}
                      />
                    </label>
                    </motion.div>
                  )}
                </AnimatePresence>

                <label className="block">
                  <span className={cn('mb-2 block text-xs font-bold uppercase tracking-[0.22em]', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}>
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
                      'w-full rounded-2xl px-4 py-3 text-sm focus:outline-none',
                      darkMode
                        ? 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                        : 'bg-bg-base/45 border border-border-subtle placeholder:text-text-main/30',
                      fieldErrors.password && (darkMode ? 'border-red-500 placeholder:!text-red-300' : 'border-red-400 placeholder:!text-red-500'),
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
                      <span className={cn('mb-2 block text-xs font-bold uppercase tracking-[0.22em]', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}>
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
                          'w-full rounded-2xl px-4 py-3 text-sm focus:outline-none',
                          darkMode
                            ? 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                            : 'bg-bg-base/45 border border-border-subtle placeholder:text-text-main/30',
                          fieldErrors.confirmPassword && (darkMode ? 'border-red-500 placeholder:!text-red-300' : 'border-red-400 placeholder:!text-red-500'),
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
                    'mt-2 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold uppercase tracking-[0.24em] transition-opacity',
                    darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-text-main text-white hover:opacity-90',
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
    </div>
  );
}
