import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, Navigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
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
  TextQuote,
  Upload,
  FileType,
  Github,
  Paperclip,
  Quote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  fluidEnterTransition,
  fluidLift,
  fluidPress,
  fluidSpring,
  fluidSpringQuick,
  fluidSpringSoft,
} from '@/lib/fluid-motion';

const githubProjectUrl =
  (import.meta.env.VITE_GITHUB_URL as string | undefined)?.trim() || 'https://github.com/ql-link/LinkRag';
const darkModeLogoStyle = {
  filter: 'saturate(1.05) brightness(1.55) contrast(0.95) drop-shadow(0 0 1px rgba(255,255,255,0.45))',
};
const MotionLink = motion.create(Link);

const scrollSections = [{ id: 'knowledge', label: '功能' }];

const workflowSlides = [
  {
    id: 'knowledge',
    step: '01',
    title: (
      <>
        解析与分块
        <br />
        统一为 Markdown 再切成语义片段
      </>
    ),
    description: '保留标题层级与原文上下文，表格、代码、公式和图片不被粗暴切断',
    kind: 'capabilities',
  },
  {
    id: 'files',
    step: '02',
    title: (
      <>
        三路索引
        <br />
        稠密、稀疏与 BM25 并行构建
      </>
    ),
    description: '以 MySQL 为真值源，向量与关键词索引均可诊断、可重建',
    kind: 'operations',
  },
  {
    id: 'conversation',
    step: '03',
    title: (
      <>
        混合检索
        <br />
        三路并行召回并做加权融合
      </>
    ),
    description: '同时覆盖语义相似、术语表达与精确关键词，优先保留真正相关的片段',
    kind: 'timeline',
  },
  {
    id: 'answer',
    step: '04',
    title: (
      <>
        有据回答
        <br />
        回填原文，按上下文预算流式生成
      </>
    ),
    description: '无依据时明确不回答；有命中则保留引用，方便回看和核验来源',
    kind: 'answer',
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
    transition: fluidSpringSoft,
  },
};

function LinkRagMark({ darkMode }: { darkMode?: boolean }) {
  return (
    <img
      src="/linkrag-mark-v2.png"
      alt="LinkRag"
      className="h-full w-full object-contain"
      style={darkMode ? darkModeLogoStyle : undefined}
    />
  );
}

function RevealSection({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

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
    <motion.section
      id={id}
      ref={ref}
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: reducedMotion ? 0 : visible ? 0 : 36 }}
      transition={fluidEnterTransition(reducedMotion)}
      className={cn('fluid-compositor', className)}
    >
      {children}
    </motion.section>
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
      parseTimers.current.push(
        window.setTimeout(() => {
          setActiveFileIndex(index);
        }, index * 760),
      );
    });

    parseTimers.current.push(
      window.setTimeout(
        () => {
          setStage('parsing');
          setActiveFileIndex(-1);
        },
        uploadFiles.length * 760 + 180,
      ),
    );

    parseTimers.current.push(
      window.setTimeout(
        () => {
          setStage('done');
        },
        uploadFiles.length * 760 + 780,
      ),
    );

    return () => clearParseTimers();
  }, []);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(
        'relative min-h-[470px] overflow-hidden rounded-[34px] border p-6',
        darkMode
          ? 'border-[#3c3c3c] bg-[#252526]/88 shadow-black/25 backdrop-blur-sm'
          : 'border-border-subtle bg-white/62 shadow-sm backdrop-blur-sm',
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
                darkMode
                  ? 'border-[#3c3c3c] bg-[#1e1e1e]/88 shadow-[0_0_30px_rgba(197,134,192,0.08)] backdrop-blur-sm'
                  : 'border-border-subtle bg-white/86 shadow-[0_16px_40px_rgba(212,163,115,0.14)] backdrop-blur-sm',
                stage === 'parsing' ? 'ring-1 ring-primary/20' : '',
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

              <div
                className={cn(
                  'mt-4 flex-1 rounded-[28px] border border-dashed transition-colors',
                  darkMode ? 'border-[#3c3c3c] bg-[#252526]/80' : 'border-border-subtle bg-white/72 backdrop-blur-sm',
                  stage === 'uploading' ? 'border-primary/50' : '',
                )}
              >
                <div className="flex h-full items-center justify-center">
                  <div
                    className={cn(
                      'flex h-20 w-20 items-center justify-center rounded-[26px] border transition-transform',
                      darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-primary/12 bg-primary/10',
                      stage === 'parsing' ? 'scale-90' : '',
                    )}
                  >
                    <ScissorsLineDashed
                      size={36}
                      className={cn(
                        darkMode ? 'text-[#d9d9d9]' : 'text-primary',
                        stage === 'parsing' ? 'animate-pulse' : '',
                      )}
                    />
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
                <span
                  className={cn(
                    'max-w-[82px] truncate text-center text-[11px]',
                    darkMode ? 'text-[#858585]' : 'text-text-main/45',
                  )}
                >
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
  const bm25RecordLines = [
    { indent: 0, text: '{' },
    { indent: 1, key: '"chunk_id"', value: '"ml-note-042-03",' },
    { indent: 1, key: '"dataset_id"', value: '42,' },
    { indent: 1, key: '"doc_id"', value: '108,' },
    { indent: 1, key: '"coarse"', value: '"梯度 下降 反向 传播",' },
    { indent: 1, key: '"chunk_type"', value: '"text"' },
    { indent: 0, text: '}' },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(
        'relative min-h-[430px] overflow-hidden rounded-[34px] border p-6',
        darkMode
          ? 'border-[#3c3c3c] bg-[#252526]/88 shadow-black/25 backdrop-blur-sm'
          : 'border-border-subtle bg-white/62 shadow-sm backdrop-blur-sm',
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
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    index === 1 ? 'bg-primary/55' : darkMode ? 'bg-[#858585]' : 'bg-text-main/24',
                  )}
                />
                <p
                  className={cn(
                    'font-mono text-[9px] uppercase tracking-[0.18em]',
                    darkMode ? 'text-[#858585]' : 'text-text-main/42',
                  )}
                >
                  chunk {index + 1}
                </p>
              </div>
              <p className={cn('text-[12px] leading-5', darkMode ? 'text-[#d9d9d9]' : 'text-text-main/64')}>{label}</p>
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
            className={cn(
              'index-moving-path index-moving-path-delay',
              darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary',
            )}
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
            className={cn(
              'index-moving-path index-moving-path-out index-moving-path-delay',
              darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary',
            )}
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
                <p className={cn('text-[13px] font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>
                  Qdrant 向量
                </p>
                <p className={cn('text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/48')}>dense + sparse</p>
              </div>
            </div>
            <div
              className={cn(
                'relative h-[74px] overflow-hidden rounded-2xl border',
                darkMode ? 'border-[#3c3c3c] bg-[#252526]/80' : 'border-border-subtle bg-white/72 backdrop-blur-sm',
              )}
            >
              <div
                className={cn(
                  'absolute left-[46%] top-[38%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border',
                  darkMode ? 'border-[#3b82f6]/28 bg-[#3b82f6]/6' : 'border-primary/28 bg-primary/10',
                )}
              />
              <div
                className={cn(
                  'demo-pulse-ring absolute left-[46%] top-[38%] h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border',
                  darkMode ? 'border-[#3b82f6]/25' : 'border-primary/24',
                )}
              />
              {vectorPoints.map((point, index) => (
                <motion.span
                  key={`${point.x}-${point.y}`}
                  className={cn(
                    'absolute rounded-full',
                    point.near
                      ? darkMode
                        ? 'bg-[#3b82f6] shadow-[0_0_16px_rgba(197,134,192,0.45)]'
                        : 'bg-primary shadow-[0_0_16px_rgba(212,163,115,0.5)]'
                      : darkMode
                        ? 'bg-[#5a5a5a]'
                        : 'bg-text-main/18',
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
                className={cn(
                  'absolute left-[58%] top-[42%] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white',
                  darkMode ? 'border-[#3b82f6]' : 'border-primary',
                )}
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
                <p className={cn('text-[13px] font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>BM25 索引</p>
                <p className={cn('text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/48')}>Manticore Search</p>
              </div>
            </div>
            <div
              className={cn(
                'rounded-2xl border px-2.5 py-2 font-mono text-[8px] leading-[1.8]',
                darkMode ? 'border-[#3c3c3c] bg-[#252526]/80' : 'border-border-subtle bg-white/72 backdrop-blur-sm',
              )}
            >
              {bm25RecordLines.map((line, index) => (
                <p
                  key={index}
                  className={cn(
                    'index-record-row flex min-w-0 whitespace-nowrap',
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
    { label: '稠密向量', icon: DatabaseZap, y: 22 },
    { label: '稀疏向量', icon: SearchCheck, y: 198 },
    { label: 'BM25 关键词', icon: Database, y: 374 },
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
        darkMode
          ? 'border-[#3c3c3c] bg-[#252526]/88 shadow-black/25 backdrop-blur-sm'
          : 'border-border-subtle bg-white/62 shadow-sm backdrop-blur-sm',
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
              <path
                d="M204 237H232"
                className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')}
              />
              <path
                d="M388 237C456 237 374 66 458 66"
                className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')}
              />
              <path
                d="M388 237H458"
                className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')}
              />
              <path
                d="M388 237C456 237 374 418 458 418"
                className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')}
              />
              <path
                d="M738 66H760Q782 66 782 88V237"
                className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')}
              />
              <path
                d="M708 237H782"
                className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')}
              />
              <path
                d="M738 418H760Q782 418 782 396V237"
                className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')}
              />
              <path
                d="M782 237H890"
                className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')}
              />

              <path
                d="M204 237H232"
                className={cn('recall-moving-path', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')}
              />
              <path
                d="M388 237C456 237 374 66 458 66"
                className={cn(
                  'recall-moving-path index-moving-path-delay',
                  darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary',
                )}
              />
              <path
                d="M388 237H458"
                className={cn(
                  'recall-moving-path index-moving-path-late',
                  darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary',
                )}
              />
              <path
                d="M388 237C456 237 374 418 458 418"
                className={cn(
                  'recall-moving-path index-moving-path-out',
                  darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary',
                )}
              />
              <path
                d="M738 66H760Q782 66 782 88V237"
                className={cn(
                  'recall-moving-path index-moving-path-out',
                  darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary',
                )}
              />
              <path
                d="M708 237H782"
                className={cn(
                  'recall-moving-path index-moving-path-out index-moving-path-delay',
                  darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary',
                )}
              />
              <path
                d="M738 418H760Q782 418 782 396V237"
                className={cn(
                  'recall-moving-path index-moving-path-out index-moving-path-late',
                  darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary',
                )}
              />
              <path
                d="M782 237H890"
                className={cn(
                  'recall-moving-path index-moving-path-out index-moving-path-delay',
                  darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary',
                )}
              />
            </svg>

            <div className="absolute left-[14px] top-[184px] flex h-[106px] w-[190px] items-center">
              <p
                className={cn(
                  'font-sans text-[36px] font-bold leading-[1.14] tracking-normal',
                  darkMode ? 'text-[#f0f0f0]' : 'text-text-main',
                )}
              >
                <span className="block whitespace-nowrap">为什么需要</span>
                <span className="block whitespace-nowrap">注意力机制？</span>
              </p>
            </div>

            <div
              className={cn(
                'multi-core absolute left-[238px] top-[162px] flex h-[150px] w-[150px] items-center justify-center rounded-full border-[3px]',
                darkMode ? 'border-[#3b82f6]/38 bg-[#1e1e1e]/92' : 'border-primary/38 bg-white/74 backdrop-blur-sm',
              )}
            >
              <div
                className={cn(
                  'demo-pulse-ring absolute h-[126px] w-[126px] rounded-full border',
                  darkMode ? 'border-[#3b82f6]/28' : 'border-primary/28',
                )}
              />
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
                    className={cn(
                      'multi-core-dot absolute h-[10px] w-[10px] rounded-full',
                      index % 2 ? 'bg-primary/70' : 'bg-primary',
                    )}
                    style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${index * 0.14}s` }}
                  />
                ))}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
                  <path
                    d="M23 57L45 29L70 43L60 75L41 64L23 57M41 64L45 29M41 64L70 43M70 43L82 67"
                    className={cn('recall-core-line', darkMode ? 'stroke-[#3b82f6]/58' : 'stroke-primary/62')}
                  />
                </svg>
              </div>
            </div>

            {channels.map((channel, index) => {
              const Icon = channel.icon;

              return (
                <div
                  key={channel.label}
                  className={cn(
                    'multi-channel-card absolute left-[458px] flex h-[88px] w-[280px] items-center gap-5 rounded-[20px] border px-7',
                    darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/88' : 'border-border-subtle bg-white/62 backdrop-blur-sm',
                  )}
                  style={{ top: channel.y, animationDelay: `${0.7 + index * 0.3}s` }}
                >
                  <Icon
                    size={48}
                    strokeWidth={1.8}
                    className={cn('shrink-0', darkMode ? 'text-[#3b82f6]' : 'text-primary')}
                  />
                  <span
                    className={cn(
                      'text-[27px] font-medium tracking-tight',
                      darkMode ? 'text-[#f0f0f0]' : 'text-text-main/76',
                    )}
                  >
                    {channel.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          variants={fadeUpItem}
          className={cn(
            'w-[174px] justify-self-start rounded-2xl border px-3 py-3',
            darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/82' : 'border-border-subtle bg-white/58 backdrop-blur-sm',
          )}
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div>
              <p className={cn('text-[12px] font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>Top-K 片段</p>
              <p className={cn('mt-0.5 text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
                加权融合结果
              </p>
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
                <p
                  className={cn(
                    'line-clamp-2 text-[10px] leading-4',
                    darkMode ? 'text-[#d9d9d9]' : 'text-text-main/66',
                  )}
                >
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
        darkMode
          ? 'border-[#3c3c3c] bg-[#252526] text-[#d9d9d9]'
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
        'relative min-h-[430px] overflow-hidden rounded-[34px] border p-6',
        darkMode
          ? 'border-[#3c3c3c] bg-[#252526]/88 shadow-black/25 backdrop-blur-sm'
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
              className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')}
            />
            <path
              d="M358 191H392"
              className={cn('recall-dashed-path', darkMode ? 'stroke-[#3b82f6]/30' : 'stroke-primary/38')}
            />
            <path
              d="M188 191H238"
              className={cn('recall-moving-path', darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary')}
            />
            <path
              d="M358 191H392"
              className={cn(
                'recall-moving-path index-moving-path-delay',
                darkMode ? 'stroke-[#3b82f6]' : 'stroke-primary',
              )}
            />
          </svg>

          <motion.div
            variants={fadeUpItem}
            className={cn(
              'absolute left-0 top-[22px] h-[328px] w-[188px] overflow-hidden rounded-[24px] border p-3.5',
              darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/88' : 'border-border-subtle bg-bg-base/82',
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={cn('text-[15px] font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>
                  Top-K 片段
                </p>
                <p className={cn('mt-0.5 text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
                  正文回填结果
                </p>
              </div>
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl',
                  darkMode ? 'bg-[#2d2d2d] text-[#3b82f6]' : 'bg-primary/12 text-primary',
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
                    'rounded-2xl border px-3 py-2.5',
                    darkMode ? 'border-[#3c3c3c] bg-[#252526]/82' : 'border-border-subtle bg-white/70 backdrop-blur-sm',
                  )}
                  animate={{ opacity: [0.76, 1, 0.76] }}
                  transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.22, ease: 'easeInOut' }}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px]',
                          darkMode ? 'bg-[#3b82f6]/12 text-[#3b82f6]' : 'bg-primary/14 text-primary',
                        )}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          'truncate text-[11px] font-bold',
                          darkMode ? 'text-[#d9d9d9]' : 'text-text-main/70',
                        )}
                      >
                        {chunk.title}
                      </span>
                    </div>
                    <span className={cn('font-mono text-[10px]', darkMode ? 'text-[#3b82f6]' : 'text-primary')}>
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
            className={cn(
              'multi-core absolute left-[238px] top-[119px] flex h-[120px] w-[120px] items-center justify-center rounded-full border-[3px]',
              darkMode ? 'border-[#3b82f6]/38 bg-[#1e1e1e]/92' : 'border-primary/38 bg-white/74 backdrop-blur-sm',
            )}
          >
            <div
              className={cn(
                'demo-pulse-ring absolute h-[94px] w-[94px] rounded-full border',
                darkMode ? 'border-[#3b82f6]/28' : 'border-primary/28',
              )}
            />
            <div
              className={cn(
                'absolute inset-0 overflow-hidden rounded-full opacity-35',
                darkMode ? 'bg-[#252526]' : 'bg-bg-base',
              )}
            >
              <div className="h-full w-full bg-[linear-gradient(rgba(26,26,26,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(26,26,26,.12)_1px,transparent_1px)] bg-[size:18px_18px]" />
            </div>
            <div
              className={cn('relative flex flex-col items-center gap-1', darkMode ? 'text-[#3b82f6]' : 'text-primary')}
            >
              <BrainCircuit size={42} strokeWidth={1.8} />
              <span className={cn('text-[11px] font-bold', darkMode ? 'text-[#d9d9d9]' : 'text-text-main/70')}>
                上下文生成
              </span>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUpItem}
            className={cn(
              'absolute left-[392px] top-[22px] h-[328px] w-[212px] overflow-hidden rounded-[24px] border p-3.5',
              darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/88' : 'border-border-subtle bg-bg-base/82',
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={cn('text-[15px] font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>AI 回答</p>
                <p className={cn('mt-0.5 text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
                  流式生成并保留引用
                </p>
              </div>
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl',
                  darkMode ? 'bg-[#2d2d2d] text-[#3b82f6]' : 'bg-primary/12 text-primary',
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
                      ? 'border-[#3c3c3c] bg-[#252526] text-[#858585]'
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
                    'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
                    darkMode
                      ? 'border-[#3b82f6]/22 bg-[#3b82f6]/8 text-[#d9d9d9]'
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

const evidenceSources = [
  {
    name: '产品规划.pdf',
    location: '第 3 页',
    excerpt: '围绕用户核心场景，提供可验证的解决方案。',
    citation: '引用 1',
  },
  {
    name: '技术说明.docx',
    location: '第 1 页',
    excerpt: '检索增强生成结合可追溯来源，为每个结论提供可靠依据。',
    citation: '引用 2',
  },
  {
    name: '上线方案.md',
    location: '第 2 页',
    excerpt: '通过增量同步与版本记录协调产品目标与技术实现。',
    citation: '引用 3',
  },
] as const;

function EvidenceStage({ darkMode }: { darkMode?: boolean }) {
  const reducedMotion = useReducedMotion();

  return (
    <RevealSection id="continuity" className="py-12 sm:py-16 lg:py-20">
      <div
        className={cn(
          'relative min-h-[50rem] overflow-hidden rounded-[2.25rem] px-5 pb-0 pt-16 text-white shadow-[0_30px_90px_rgba(77,47,31,0.22)] sm:px-10 sm:pt-20 lg:min-h-[48rem] lg:px-16',
          darkMode ? 'bg-[#604637]' : 'bg-[#7B5037]',
        )}
      >
        <div
          className="welcome-dot-grid pointer-events-none absolute inset-0 opacity-[0.08] invert"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-white/[0.035]" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-[50rem] text-center">
          <p className="mono-label mb-5 text-white/48">evidence, not assumption</p>
          <h3 className="font-display-cn text-4xl font-semibold leading-[1.06] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            答案不是终点，
            <br className="sm:hidden" />
            证据才是
          </h3>
          <p className="mx-auto mt-5 max-w-[42rem] text-sm leading-7 text-white/66 sm:text-base sm:leading-8">
            把分散的资料沉淀为可验证的知识链路。每个结论都能回到来源，每次追问都有上下文可循。
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <MotionLink
              to={Routes.Register}
              whileHover={reducedMotion ? undefined : fluidLift}
              whileTap={fluidPress}
              transition={fluidSpring}
              className="fluid-compositor inline-flex items-center gap-2 rounded-full border border-white/62 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-lg"
            >
              创建知识空间
              <ArrowRight size={16} />
            </MotionLink>
            <MotionLink
              to={Routes.Login}
              whileTap={fluidPress}
              transition={fluidSpringQuick}
              className="fluid-compositor rounded-full border border-white/28 px-6 py-3 text-sm font-semibold text-white/82"
            >
              登录 LinkRag
            </MotionLink>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-12 max-w-[55rem] sm:mt-14">
          <motion.div
            initial={{ opacity: 0, y: reducedMotion ? 0 : 28, rotate: 0 }}
            whileInView={{ opacity: 0.5, y: 0, rotate: -4 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={fluidEnterTransition(reducedMotion)}
            className="fluid-compositor absolute left-3 right-14 top-8 h-[31rem] rounded-[1.75rem] bg-[#eadfce] sm:left-10 sm:right-20"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: reducedMotion ? 0 : 34, rotate: 0 }}
            whileInView={{ opacity: 0.72, y: 0, rotate: 4 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={fluidEnterTransition(reducedMotion)}
            className="fluid-compositor absolute left-14 right-3 top-10 h-[31rem] rounded-[1.75rem] bg-[#f3eadc] sm:left-20 sm:right-10"
            aria-hidden="true"
          />

          <motion.article
            initial={{ opacity: 0, y: reducedMotion ? 0 : 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.28 }}
            whileHover={reducedMotion ? undefined : { y: -6 }}
            transition={fluidSpringSoft}
            className="fluid-compositor relative min-h-[31rem] rounded-t-[1.75rem] border border-white/80 bg-[#fbf8f2] px-5 py-6 text-left text-text-main shadow-[0_28px_70px_rgba(43,26,17,0.26)] sm:px-8 sm:py-8"
          >
            <Paperclip
              size={32}
              strokeWidth={1.35}
              className="absolute -right-2 -top-5 rotate-12 text-[#9f795e] sm:right-8"
              aria-hidden="true"
            />

            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <SearchCheck size={16} />
              </span>
              <div>
                <p className="text-xs font-bold tracking-[0.1em]">最终结论</p>
                <p className="mt-0.5 text-[10px] text-text-main/38">基于 3 个来源 · 2 处引用</p>
              </div>
            </div>

            <p className="mt-5 max-w-[44rem] text-base font-medium leading-8 text-text-main/72">
              产品目标与技术约束之间的冲突，可以通过分阶段优化、增量同步与版本协同来化解。
            </p>

            <div className="mt-6 border-t border-border-subtle pt-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-text-main/38">来源证据</p>
              <div className="overflow-hidden rounded-2xl border border-border-subtle bg-white/58">
                {evidenceSources.map((source, index) => (
                  <div
                    key={source.name}
                    className={cn(
                      'grid gap-3 px-4 py-3.5 sm:grid-cols-[10rem_1fr_auto] sm:items-center',
                      index > 0 && 'border-t border-border-subtle',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText size={16} className="shrink-0 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-text-main/68">{source.name}</p>
                        <p className="mt-0.5 text-[10px] text-text-main/34">{source.location}</p>
                      </div>
                    </div>
                    <p className="text-xs leading-5 text-text-main/48">{source.excerpt}</p>
                    <span className="w-fit rounded-full bg-surface-soft px-2.5 py-1 text-[10px] font-bold text-text-main/42">
                      {source.citation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.article>

          <div className="pointer-events-none absolute -top-5 left-1/2 z-20 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-white/45 bg-[#d8bda5] text-[#7B5037] shadow-md">
            <Quote size={15} fill="currentColor" />
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

function DottedCanvasBackground({ darkMode }: { darkMode?: boolean }) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', darkMode ? 'bg-[#1f1f1f]' : 'bg-[#fbfaf7]')}
      aria-hidden="true"
    >
      <div className={cn('welcome-dot-grid absolute inset-0', darkMode && 'welcome-dot-grid-dark')} />
    </div>
  );
}

export default function WelcomePage() {
  const { darkMode } = useTheme();
  const reducedMotion = useReducedMotion();
  const knowledgeRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [hasUserSelectedFlow, setHasUserSelectedFlow] = useState(false);
  const [headerPortalTarget, setHeaderPortalTarget] = useState<HTMLElement | null>(null);
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

  if (user) {
    return <Navigate to={Routes.Home} replace />;
  }

  function scrollElementIntoCenteredView(target: HTMLElement | null) {
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

  function scrollToKnowledge() {
    scrollElementIntoCenteredView(knowledgeRef.current);
  }

  return (
    <div
      className={cn(
        'relative min-h-screen overflow-x-hidden',
        darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main',
      )}
    >
      <DottedCanvasBackground darkMode={darkMode} />

      {headerPortalTarget
        ? createPortal(
            <header className="welcome-floating-header pointer-events-none fixed inset-x-0 top-0 z-[100] px-4 py-3 lg:px-8">
              <div
                className={cn(
                  'fluid-material pointer-events-auto relative mx-auto flex max-w-[1240px] items-center justify-between rounded-full px-4 py-3',
                  darkMode
                    ? 'border-[#3c3c3c] bg-[#252526]/95 shadow-black/25'
                    : 'border-white/90 bg-white/82 shadow-text-main/10',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center">
                    <LinkRagMark darkMode={darkMode} />
                  </div>
                  <div>
                    <p className={cn('mono-label mb-1', darkMode ? 'text-[#858585]' : '')}>knowledge workspace</p>
                    <h1
                      className={cn(
                        'text-lg font-bold tracking-[-0.02em]',
                        darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                      )}
                    >
                      LinkRag
                    </h1>
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
                        'text-sm font-bold uppercase tracking-[0.18em]',
                        darkMode ? 'text-[#858585] hover:text-[#e0e0e0]' : 'text-text-main/45 hover:text-text-main',
                      )}
                    >
                      {item.label}
                    </a>
                  ))}
                  <Link
                    to={Routes.Blogs}
                    className={cn(
                      'text-sm font-bold uppercase tracking-[0.18em]',
                      darkMode ? 'text-[#858585] hover:text-[#e0e0e0]' : 'text-text-main/45 hover:text-text-main',
                    )}
                  >
                    博客
                  </Link>
                  <Link
                    to={Routes.Feedback}
                    className={cn(
                      'text-sm font-bold uppercase tracking-[0.18em]',
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
                      'group inline-flex h-9 w-9 items-center justify-center',
                      darkMode ? 'text-[#858585] hover:text-[#e0e0e0]' : 'text-text-main/45 hover:text-text-main',
                    )}
                  >
                    <Github size={18} strokeWidth={1.85} />
                  </a>
                </nav>

                <div className="flex items-center gap-2">
                  <MotionLink
                    to={Routes.Login}
                    whileTap={fluidPress}
                    transition={fluidSpringQuick}
                    className={cn(
                      'fluid-compositor rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em]',
                      darkMode
                        ? 'bg-[#2d2d2d] text-[#e0e0e0] hover:bg-[#3a3a3a]'
                        : 'bg-bg-base text-text-main hover:bg-white',
                    )}
                  >
                    登录
                  </MotionLink>
                  <MotionLink
                    to={Routes.Register}
                    whileTap={fluidPress}
                    transition={fluidSpringQuick}
                    className={cn(
                      'fluid-compositor rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em]',
                      darkMode
                        ? 'bg-[#8A7662] text-white hover:bg-[#7B6B5D]'
                        : 'bg-[#7B6B5D] text-white hover:opacity-90',
                    )}
                  >
                    注册
                  </MotionLink>
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
          <motion.div className="max-w-[820px]" variants={staggerContainer} initial="hidden" animate="show">
            <motion.p variants={fadeUpItem} className={cn('mono-label mb-4 sm:mb-6', darkMode ? 'text-[#858585]' : '')}>
              knowledge workspace
            </motion.p>
            <motion.h2
              variants={fadeUpItem}
              className={cn(
                'serif-heading text-5xl leading-[1.02] sm:text-6xl lg:text-8xl',
                darkMode ? 'text-[#f2f2f2]' : 'text-text-main',
              )}
            >
              LinkRag
              <br />
              让知识可问可答
            </motion.h2>
            <motion.p
              variants={fadeUpItem}
              className={cn(
                'mt-6 max-w-[820px] text-base leading-8 sm:mt-8 sm:text-lg sm:leading-9',
                darkMode ? 'text-[#a6a6a6]' : 'text-text-main/60',
              )}
            >
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
            <motion.div
              variants={fadeUpItem}
              whileHover={reducedMotion ? undefined : { y: -3 }}
              whileTap={fluidPress}
              transition={fluidSpring}
              className="fluid-compositor"
            >
              <Link
                to={Routes.Login}
                className={cn(
                  'flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-[0.22em] shadow-sm',
                  darkMode ? 'bg-[#8A7662] text-white hover:bg-[#7B6B5D]' : 'bg-[#7B6B5D] text-white hover:opacity-90',
                )}
              >
                开始使用
                <ArrowRight size={16} />
              </Link>
            </motion.div>
            <motion.a
              variants={fadeUpItem}
              whileHover={reducedMotion ? undefined : { y: -3 }}
              whileTap={fluidPress}
              transition={fluidSpring}
              href="#knowledge"
              onClick={(event) => {
                event.preventDefault();
                scrollToKnowledge();
              }}
              className={cn(
                'flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-[0.22em]',
                darkMode
                  ? 'bg-[#2d2d2d] text-[#e0e0e0] border border-[#3c3c3c]'
                  : 'bg-white/70 text-text-main border border-border-subtle backdrop-blur-sm',
              )}
            >
              查看功能
              <ArrowDown size={16} />
            </motion.a>
          </motion.div>
        </RevealSection>

        <RevealSection
          id="knowledge"
          className="min-h-[88vh] flex items-center border-b border-border-subtle/60 py-16 scroll-mt-28"
        >
          <div ref={knowledgeRef} className="w-full">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className={cn('mono-label mb-2', darkMode ? 'text-[#858585]' : '')}>workflow</p>
                <h3 className={cn('text-xl font-bold tracking-tight', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                  四步流程
                </h3>
              </div>
            </div>

            <div className="relative flex min-h-[560px] items-center overflow-hidden sm:min-h-[600px]">
              <AnimatePresence mode="wait">
                <motion.section
                  key={activeWorkflowSlide.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={fluidEnterTransition(reducedMotion)}
                  className="fluid-compositor grid w-full items-center gap-8 py-6 lg:min-h-[540px] lg:grid-cols-[0.92fr_1.08fr]"
                >
                  <div>
                    <p className={cn('mono-label mb-5', darkMode ? 'text-[#858585]' : '')}>
                      {activeWorkflowSlide.step}
                    </p>
                    <h3
                      className={cn(
                        'serif-heading text-4xl leading-tight lg:text-6xl',
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

                  {activeWorkflowSlide.kind === 'capabilities' && <UploadChunkDemo darkMode={darkMode} />}

                  {activeWorkflowSlide.kind === 'operations' && <IndexingDemo darkMode={darkMode} />}

                  {activeWorkflowSlide.kind === 'timeline' && <RetrievalDemo darkMode={darkMode} />}

                  {activeWorkflowSlide.kind === 'answer' && <AnswerGenerationDemo darkMode={darkMode} />}
                </motion.section>
              </AnimatePresence>
            </div>

            <div className="mt-5 flex items-center justify-center gap-3">
              {workflowSlides.map((slide, index) => (
                <motion.button
                  key={slide.id}
                  type="button"
                  onClick={() => {
                    setHasUserSelectedFlow(true);
                    setActiveFlowIndex(index);
                  }}
                  layout
                  whileTap={fluidPress}
                  transition={fluidSpringQuick}
                  className={cn(
                    'fluid-compositor h-2.5 rounded-full',
                    activeFlowIndex === index ? 'w-8' : 'w-2.5',
                    darkMode
                      ? activeFlowIndex === index
                        ? 'bg-[#3b82f6]'
                        : 'bg-[#3c3c3c]'
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

        <EvidenceStage darkMode={darkMode} />
      </main>

      <footer className="relative z-10 py-6 text-center">
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            'text-xs',
            darkMode ? 'text-[#5a5a5a] hover:text-[#858585]' : 'text-text-main/30 hover:text-text-main/55',
          )}
        >
          © 2026 LinkRag · 皖ICP备2026017322号
        </a>
      </footer>
    </div>
  );
}
