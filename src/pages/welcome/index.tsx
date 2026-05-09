import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, Navigate, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  Database,
  DatabaseZap,
  FileCode2,
  FileText,
  Layers,
  SearchCheck,
  ScissorsLineDashed,
  ShieldCheck,
  Upload,
  FileType,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { useAuth } from '@/contexts/AuthContext';
import { login, register } from '@/services/auth';

interface WelcomePageProps {
  darkMode?: boolean;
}

type AuthMode = 'login' | 'register';

const scrollSections = [
  { id: 'knowledge', label: '功能' },
  { id: 'login', label: '登录' },
];

const timeline = [
  {
    title: '创建知识库',
    description: '确定主题，为文档建立归属。',
  },
  {
    title: '上传文件',
    description: '支持 PDF、文档、笔记等多种格式。',
  },
  {
    title: '开始提问',
    description: '基于知识库内容获取精准回答。',
  },
  {
    title: '持续丰富',
    description: '资料越完整，回答质量越高。',
  },
];

const workflowSlides = [
  {
    id: 'knowledge',
    step: '01',
    title: (
      <>
        上传文件，
        <br />
        拖入后自动切成 chunk
      </>
    ),
    description: 'PDF、Word、Markdown 等文件拖入上传框后，会先完成识别、抽取与分片，再变成结构化 chunk，进入后续索引流程。',
    kind: 'capabilities',
  },
  {
    id: 'files',
    step: '02',
    title: (
      <>
        索引入库，
        <br />
        向量索引与 ES 双路写入
      </>
    ),
    description: '分片完成后，系统生成 embedding 写入向量索引，同时将文本与元数据写入 Elasticsearch，兼顾语义召回与关键词检索。',
    kind: 'operations',
  },
  {
    id: 'conversation',
    step: '03',
    title: (
      <>
        多路召回，
        <br />
        从多个检索通道找候选片段
      </>
    ),
    description: '问题先同时经过向量召回、关键词检索与规则过滤，聚合出相关片段集合，为最终回答准备更完整的上下文。',
    kind: 'timeline',
  },
  {
    id: 'answer',
    step: '04',
    title: (
      <>
        检索回答，
        <br />
        结合上下文生成有来源的答案
      </>
    ),
    description: '模型结合召回片段、对话历史与引用来源生成回答，输出可追溯、可验证的最终结果。',
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
  const nodeFill = darkMode ? '#d6bfd7' : '#e4c690';
  const stroke = darkMode ? '#b997bd' : '#c6a36a';

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="h-12 w-12 overflow-visible"
      fill="none"
    >
      <path
        d="M32 12 16 24 18 43 32 52 48 43 50 24 32 12M16 24 32 32 50 24M18 43 32 32 48 43M32 12v20M32 32v20"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 24c4.2 2.7 4.2 9.2 0 12"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.55"
      />
      {[
        [32, 12, 4.7],
        [16, 24, 5],
        [50, 24, 4.7],
        [18, 43, 4.7],
        [48, 43, 4.7],
        [32, 52, 5],
        [32, 32, 5.9],
      ].map(([cx, cy, r]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={r}
          fill={nodeFill}
          stroke={stroke}
          strokeWidth="1.4"
        />
      ))}
    </svg>
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
  const [draggingFile, setDraggingFile] = useState<string | null>(null);
  const [droppedFile, setDroppedFile] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'parsing' | 'done'>('idle');
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

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!draggingFile || stage !== 'idle') return;

    clearParseTimers();
    setDroppedFile(draggingFile);
    setStage('parsing');
    parseTimers.current.push(window.setTimeout(() => {
      setDraggingFile(null);
      setDroppedFile(null);
    }, 120));
    parseTimers.current.push(window.setTimeout(() => {
      setStage('done');
    }, 320));
  }

  function handleReset() {
    clearParseTimers();
    setDraggingFile(null);
    setDroppedFile(null);
    setStage('idle');
  }

  useEffect(() => () => clearParseTimers(), []);

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
        <div className="absolute left-[25%] right-[20%] top-[14%] h-2 rounded-full bg-gradient-to-r from-transparent via-primary/18 to-transparent" />

        <AnimatePresence mode="wait">
          {stage !== 'done' ? (
            <motion.div
              key="upload-box"
              variants={fadeUpItem}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{
                opacity: stage === 'parsing' ? 0.75 : 1,
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
                  <p className={cn('mono-label', darkMode ? 'text-[#858585]' : '')}>upload box</p>
                  <p className={cn('mt-1 text-sm font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>
                    {stage === 'parsing' ? '解析中...' : '拖拽文件到这里'}
                  </p>
                </div>
                <Upload size={20} className={darkMode ? 'text-[#d9d9d9]' : 'text-primary'} />
              </div>

              <div className={cn('mt-4 flex-1 rounded-[28px] border border-dashed transition-colors', darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/72', draggingFile ? 'border-primary/50' : '')}>
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
          const isActive = draggingFile === file.type;
          const isDropped = stage !== 'idle' && droppedFile === file.type;

          return (
            <motion.div
              key={file.name}
              draggable
              onDragStart={() => setDraggingFile(file.type)}
              onDragEnd={() => setDraggingFile(null)}
              className="absolute cursor-grab active:cursor-grabbing"
              style={{
                top: `${22 + index * 18}%`,
                left: index === 1 ? '1.5%' : '4%',
              }}
              animate={{
                x: isActive ? 330 : 0,
                y: isActive ? index === 0 ? 26 : index === 1 ? -4 : -34 : 0,
                opacity: stage === 'done' || (stage === 'parsing' && isDropped) ? 0 : 1,
                scale: isActive ? 1.08 : 1,
                rotate: isActive ? -10 : index === 1 ? 4 : -3,
              }}
              transition={{ duration: 0.16 }}
            >
              <div className="flex flex-col items-center gap-1.5">
                <Icon size={30} className={darkMode ? 'text-[#e6e6e6]' : 'text-primary'} />
                <span className={cn('max-w-[82px] truncate text-center font-mono text-[9px] tracking-[0.08em]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
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
                      <span className={cn('h-1.5 w-1.5 rounded-full', darkMode ? 'bg-[#c586c0]' : 'bg-primary')} />
                      <p className={cn('font-mono text-[10px] uppercase tracking-[0.2em]', darkMode ? 'text-[#858585]' : 'text-text-main/42')}>
                        chunk {index + 1}
                      </p>
                    </div>
                    <p className={cn('text-[12px] leading-6', darkMode ? 'text-[#d9d9d9]' : 'text-text-main/68')}>
                      {chunk}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          type="button"
          onClick={handleReset}
          className={cn(
            'absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors',
            darkMode ? 'border-[#3c3c3c] bg-[#252526] text-[#d9d9d9] hover:bg-[#2d2d2d]' : 'border-border-subtle bg-white text-text-main/56 hover:bg-bg-base',
          )}
          aria-label="重置演示"
        >
          <RotateCcw size={11} />
          重置
        </button>
      </div>
    </motion.div>
  );
}

function IndexingDemo({ darkMode }: { darkMode?: boolean }) {
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
      <div className={cn('absolute left-[27%] right-[28%] top-[42%] h-px border-t border-dashed', darkMode ? 'border-[#c586c0]/30' : 'border-primary/36')} />
      <div className={cn('absolute left-[27%] right-[28%] top-[62%] h-px border-t border-dashed', darkMode ? 'border-[#c586c0]/30' : 'border-primary/36')} />
      <div className={cn('demo-flow-line absolute left-[27%] right-[28%] top-[42%] h-px', darkMode ? 'bg-[#c586c0]' : 'bg-primary')} />
      <div className={cn('demo-flow-line demo-flow-delay absolute left-[27%] right-[28%] top-[62%] h-px', darkMode ? 'bg-[#c586c0]' : 'bg-primary')} />

      <div className="relative z-10 h-[382px]">
        <motion.div
          variants={fadeUpItem}
          className="absolute left-0 top-1/2 grid w-[165px] -translate-y-1/2 gap-3"
        >
          {['chunk 01', 'chunk 02', 'chunk 03'].map((label, index) => (
            <div
              key={label}
              className={cn(
                'rounded-2xl border p-3',
                darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-border-subtle bg-bg-base/86',
              )}
            >
              <p className={cn('mb-2 font-mono text-[9px] uppercase tracking-[0.18em]', darkMode ? 'text-[#858585]' : 'text-text-main/42')}>
                {label}
              </p>
              <span className={cn('mb-1.5 block h-1.5 rounded-full', darkMode ? 'bg-[#3c3c3c]' : 'bg-text-main/12')} style={{ width: index === 1 ? 82 : 96 }} />
              <span className={cn('block h-1.5 rounded-full', darkMode ? 'bg-[#3c3c3c]' : 'bg-text-main/12')} style={{ width: index === 2 ? 58 : 72 }} />
            </div>
          ))}
        </motion.div>

        <motion.div
          variants={fadeUpItem}
          className={cn(
            'absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-3xl border',
            darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e] shadow-[0_0_34px_rgba(197,134,192,0.2)]' : 'border-border-subtle bg-white shadow-[0_0_34px_rgba(212,163,115,0.18)]',
          )}
        >
          <div className={cn('demo-pulse-ring absolute h-24 w-24 rounded-full border', darkMode ? 'border-[#c586c0]/35' : 'border-primary/32')} />
          <Layers size={38} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
          <p className={cn('mt-2 font-mono text-[9px] uppercase tracking-[0.18em]', darkMode ? 'text-[#858585]' : 'text-text-main/42')}>
            embedding
          </p>
        </motion.div>

        <div className="absolute right-0 top-1/2 flex w-[210px] -translate-y-1/2 flex-col gap-4">
          <motion.div
            variants={fadeUpItem}
            className={cn(
              'rounded-2xl border p-4',
              darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-border-subtle bg-bg-base/86',
            )}
          >
            <div className="mb-3 flex items-center gap-3">
              <DatabaseZap size={23} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
              <div>
                <p className={cn('text-sm font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>Vector Index</p>
                <p className={cn('text-[11px]', darkMode ? 'text-[#858585]' : 'text-text-main/48')}>语义召回</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 15 }).map((_, index) => (
                <span key={index} className={cn('h-1.5 rounded-full', index % 4 === 0 ? 'bg-primary/70' : darkMode ? 'bg-[#3c3c3c]' : 'bg-text-main/12')} />
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUpItem}
            className={cn(
              'rounded-2xl border p-4',
              darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-border-subtle bg-bg-base/86',
            )}
          >
            <div className="mb-3 flex items-center gap-3">
              <Database size={23} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
              <div>
                <p className={cn('text-sm font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>Elasticsearch</p>
                <p className={cn('text-[11px]', darkMode ? 'text-[#858585]' : 'text-text-main/48')}>全文与元数据</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {[112, 86, 124].map((width) => (
                <span key={width} className={cn('block h-1.5 rounded-full', darkMode ? 'bg-[#3c3c3c]' : 'bg-text-main/12')} style={{ width }} />
              ))}
            </div>
          </motion.div>
        </div>

        <div className={cn('demo-spark absolute left-[34%] top-[36%]', darkMode ? 'bg-[#c586c0]' : 'bg-primary')} />
        <div className={cn('demo-spark demo-spark-delay absolute left-[34%] top-[58%]', darkMode ? 'bg-[#c586c0]' : 'bg-primary')} />
      </div>
    </motion.div>
  );
}

function RetrievalDemo({ darkMode }: { darkMode?: boolean }) {
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
      <div className={cn('absolute left-[14%] right-[34%] top-[42%] h-px border-t border-dashed', darkMode ? 'border-[#c586c0]/30' : 'border-primary/36')} />
      <div className={cn('absolute left-[14%] right-[34%] top-[66%] h-px border-t border-dashed', darkMode ? 'border-[#c586c0]/30' : 'border-primary/36')} />
      <div className={cn('demo-flow-line absolute left-[14%] right-[34%] top-[42%] h-px', darkMode ? 'bg-[#c586c0]' : 'bg-primary')} />
      <div className={cn('demo-flow-line demo-flow-delay absolute left-[14%] right-[34%] top-[66%] h-px', darkMode ? 'bg-[#c586c0]' : 'bg-primary')} />

      <div className="relative z-10 h-[382px]">
        <motion.div
          variants={fadeUpItem}
          className="absolute left-0 top-1/2 flex w-[180px] -translate-y-1/2 flex-col gap-3"
        >
          {['vector hit', 'es hit', 'rerank'].map((label, index) => (
            <div
              key={label}
              className={cn(
                'rounded-2xl border p-3',
                darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-border-subtle bg-bg-base/86',
              )}
            >
              <p className={cn('mb-2 font-mono text-[9px] uppercase tracking-[0.18em]', darkMode ? 'text-[#858585]' : 'text-text-main/42')}>
                {label}
              </p>
              <span className={cn('block h-1.5 rounded-full', darkMode ? 'bg-[#3c3c3c]' : 'bg-text-main/12')} style={{ width: index === 1 ? 96 : 84 }} />
            </div>
          ))}
        </motion.div>

        <motion.div
          variants={fadeUpItem}
          className={cn(
            'absolute left-[26%] top-1/2 flex h-28 w-28 -translate-y-1/2 items-center justify-center rounded-3xl border',
            darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e] shadow-[0_0_28px_rgba(197,134,192,0.18)]' : 'border-border-subtle bg-white shadow-[0_0_28px_rgba(212,163,115,0.16)]',
          )}
        >
          <SearchCheck size={40} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
        </motion.div>

        <motion.div
          variants={fadeUpItem}
          className={cn(
            'absolute right-0 top-1/2 flex w-[220px] -translate-y-1/2 flex-col gap-3 rounded-2xl border p-4',
            darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-border-subtle bg-bg-base/86',
          )}
        >
          <div className="flex items-center gap-3">
            <SearchCheck size={23} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
            <div>
              <p className={cn('text-sm font-bold', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>检索回答</p>
              <p className={cn('text-[11px]', darkMode ? 'text-[#858585]' : 'text-text-main/48')}>Answer with citations</p>
            </div>
          </div>
          <div className={cn('rounded-2xl border px-3 py-2', darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white')}>
            <p className={cn('text-[11px] leading-5', darkMode ? 'text-[#d8d8d8]' : 'text-text-main/70')}>
              基于召回片段生成答案，并标注引用来源。
            </p>
          </div>
          <div className={cn('rounded-2xl border px-3 py-2', darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white')}>
            <p className={cn('font-mono text-[9px] uppercase tracking-[0.18em]', darkMode ? 'text-[#858585]' : 'text-text-main/42')}>
              sources
            </p>
            <div className="mt-2 space-y-1.5">
              {[78, 92, 64].map((width) => (
                <span key={width} className={cn('block h-1.5 rounded-full', darkMode ? 'bg-[#3c3c3c]' : 'bg-text-main/12')} style={{ width }} />
              ))}
            </div>
          </div>
        </motion.div>
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
          darkMode ? 'bg-[#c586c0]/12' : 'bg-[#f0d9bf]/70',
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
          darkMode ? 'bg-[#c586c0]/10' : 'bg-[#f1decc]/85',
        )}
      />
      <div className="welcome-grid absolute inset-0 opacity-50" />
      <div className="absolute left-[7%] top-[15%] h-4 w-4 rounded-full bg-primary/30 animate-float-slow" />
      <div className="absolute right-[12%] top-[28%] h-6 w-6 rounded-full bg-primary/20 animate-float-delay" />
      <div className="absolute left-[18%] bottom-[18%] h-5 w-5 rounded-full bg-primary/20 animate-float-slow" />
    </div>
  );
}

export default function WelcomePage({ darkMode }: WelcomePageProps) {
  const navigate = useNavigate();
  const loginRef = useRef<HTMLDivElement | null>(null);
  const { user, setUser, refreshProfile, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [hasUserSelectedFlow, setHasUserSelectedFlow] = useState(false);
  const [headerPortalTarget, setHeaderPortalTarget] = useState<HTMLElement | null>(null);
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

  if (loading) {
    return (
      <div
        className={cn(
          'min-h-screen flex items-center justify-center',
          darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main',
        )}
      >
        <div className="mono-label !text-xs">loading linkrag...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={Routes.Home} replace />;
  }

  function scrollToLogin(nextMode: AuthMode) {
    setMode(nextMode);
    setError('');
    loginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    setError('');

    const validationMessage = validateAuthForm();
    if (validationMessage) {
      setError(validationMessage);
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
      navigate(Routes.Home, { replace: true });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : '认证失败，请稍后再试';
      setError(message);
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
          <header className="welcome-floating-header pointer-events-none fixed inset-x-0 top-0 z-[100] px-4 py-3 lg:px-8">
            <div
              className={cn(
                'pointer-events-auto relative mx-auto flex max-w-[1240px] items-center justify-between rounded-full px-4 py-3 backdrop-blur-xl shadow-lg transition-shadow',
                darkMode
                  ? 'bg-[#252526]/95 border border-[#3c3c3c] shadow-black/25'
                  : 'bg-white/92 border border-white/90 shadow-text-main/10',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center">
                  <LinkRagMark darkMode={darkMode} />
                </div>
                <div>
                  <p className={cn('mono-label mb-1', darkMode ? 'text-[#858585]' : '')}>knowledge workspace</p>
                  <h1 className={cn('text-lg font-bold tracking-tight', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
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

      <main className="relative z-10 mx-auto max-w-[1240px] px-6 pb-24 pt-32 lg:px-8">
        <RevealSection
          id="intro"
          className="min-h-[88vh] flex flex-col justify-center border-b border-border-subtle/60 py-20"
        >
          <motion.div
            className="max-w-[820px]"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.p variants={fadeUpItem} className={cn('mono-label mb-6', darkMode ? 'text-[#858585]' : '')}>
              document intelligence platform
            </motion.p>
            <motion.h2 variants={fadeUpItem} className={cn('serif-heading text-5xl leading-[1.02] lg:text-8xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
              将文档转化为
              <br />
              可对话的知识库
            </motion.h2>
            <motion.p variants={fadeUpItem} className={cn('mt-8 max-w-[700px] text-lg leading-9', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/60')}>
              上传文档、构建知识库、围绕内容展开问答。LinkRag 让每份资料都能被检索、被理解、被使用。
            </motion.p>
          </motion.div>

          <motion.div
            className="mt-14 flex flex-wrap gap-4"
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
              了解更多
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
                三步了解 LinkRag
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
                className="grid items-center gap-8 py-6 lg:min-h-[540px] lg:grid-cols-[0.92fr_1.08fr]"
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
                    <motion.div
                      whileHover={{ y: -4 }}
                      className={cn(
                        'rounded-[32px] p-7 card-glow',
                        darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white/78 border border-border-subtle shadow-sm',
                      )}
                    >
                      <div className="space-y-4">
                        {timeline.map((item, index) => (
                          <div key={item.title} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div
                                className={cn(
                                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
                                  darkMode ? 'bg-[#2d2d2d] text-[#c586c0] border border-[#3c3c3c]' : 'bg-primary/12 text-primary border border-primary/10',
                                )}
                              >
                                {index + 1}
                              </div>
                              {index < timeline.length - 1 && (
                                <div className={cn('mt-2 h-12 w-px', darkMode ? 'bg-[#3c3c3c]' : 'bg-border-subtle')} />
                              )}
                            </div>
                          <div className="pb-4">
                            <h4 className={cn('text-base font-bold', darkMode ? 'text-[#ececec]' : 'text-text-main')}>
                              {item.title}
                            </h4>
                            <p className={cn('mt-2 text-sm leading-7', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}>
                              {item.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
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
                    ? activeFlowIndex === index ? 'bg-[#c586c0]' : 'bg-[#3c3c3c]'
                    : activeFlowIndex === index ? 'bg-primary' : 'bg-text-main/12',
                )}
                aria-label={`查看第 ${index + 1} 页`}
              />
            ))}
          </div>
        </RevealSection>

        <RevealSection id="login" className="min-h-[92vh] flex items-center py-24">
          <div ref={loginRef} className="grid w-full items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="pt-4">
              <p className={cn('mono-label mb-5', darkMode ? 'text-[#858585]' : '')}>04</p>
              <h3 className={cn('serif-heading text-4xl leading-tight lg:text-6xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                从这里开始
                <br />
                管理你的知识库
              </h3>
              <p className={cn('mt-6 max-w-[480px] text-base leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}>
                登录已有账号或注册新账号，进入工作台开始管理你的知识库。
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
              <div className="mb-7">
                <div className="mb-4 flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em]',
                      darkMode ? 'bg-[#2d2d2d] text-[#c586c0]' : 'bg-primary/10 text-primary',
                    )}
                  >
                    {mode === 'login' ? 'sign in' : 'sign up'}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em]',
                      darkMode ? 'bg-[#2d2d2d] text-[#858585]' : 'bg-bg-base text-text-main/45',
                    )}
                  >
                    protected entrance
                  </span>
                </div>
                <h3 className={cn('text-3xl font-bold tracking-tight', darkMode ? 'text-[#f0f0f0]' : 'text-text-main')}>
                  {heading}
                </h3>
                <p className={cn('mt-3 text-sm leading-7', darkMode ? 'text-[#9b9b9b]' : 'text-text-main/55')}>
                  {mode === 'login'
                    ? '登录后进入工作台，继续管理知识库和对话。'
                    : '注册后直接进入首页，开始构建你的知识空间。'}
                </p>
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
                    setError('');
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
                    setError('');
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

              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className={cn('mb-2 block text-xs font-bold uppercase tracking-[0.22em]', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}>
                    用户名
                  </span>
                  <input
                    value={form.username}
                    onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                    required
                    className={cn(
                      'w-full rounded-2xl px-4 py-3 text-sm focus:outline-none',
                      darkMode
                        ? 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                        : 'bg-bg-base/45 border border-border-subtle placeholder:text-text-main/30',
                    )}
                    placeholder="输入用户名"
                  />
                </label>

                {mode === 'register' && (
                  <div className="space-y-4">
                    <label className="block">
                      <span className={cn('mb-2 block text-xs font-bold uppercase tracking-[0.22em]', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}>
                        邮箱
                      </span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                        required
                        className={cn(
                          'w-full rounded-2xl px-4 py-3 text-sm focus:outline-none',
                          darkMode
                            ? 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                            : 'bg-bg-base/45 border border-border-subtle placeholder:text-text-main/30',
                        )}
                        placeholder="用于登录与找回"
                      />
                    </label>
                  </div>
                )}

                <label className="block">
                  <span className={cn('mb-2 block text-xs font-bold uppercase tracking-[0.22em]', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}>
                    密码
                  </span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    required
                    className={cn(
                      'w-full rounded-2xl px-4 py-3 text-sm focus:outline-none',
                      darkMode
                        ? 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                        : 'bg-bg-base/45 border border-border-subtle placeholder:text-text-main/30',
                    )}
                    placeholder={mode === 'login' ? '输入密码' : '创建密码'}
                  />
                </label>

                {mode === 'register' && (
                  <label className="block">
                    <span className={cn('mb-2 block text-xs font-bold uppercase tracking-[0.22em]', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}>
                      确认密码
                    </span>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                      required
                      className={cn(
                        'w-full rounded-2xl px-4 py-3 text-sm focus:outline-none',
                        darkMode
                          ? 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                          : 'bg-bg-base/45 border border-border-subtle placeholder:text-text-main/30',
                      )}
                      placeholder="再输入一次密码"
                    />
                  </label>
                )}

                {error && (
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm',
                      darkMode ? 'bg-red-900/30 text-red-300 border border-red-900/40' : 'bg-red-50 text-red-600 border border-red-100',
                    )}
                  >
                    {error}
                  </div>
                )}

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
                  {submitting ? '处理中...' : mode === 'login' ? '登录并进入' : '注册并开始'}
                  {!submitting && <ArrowRight size={16} />}
                </motion.button>
              </form>

              <div
                className={cn(
                  'mt-6 rounded-3xl p-4',
                  darkMode ? 'bg-[#1e1e1e] border border-[#3c3c3c]' : 'bg-bg-base/60 border border-border-subtle',
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck size={15} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
                  <p className={cn('text-xs font-bold uppercase tracking-[0.22em]', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}>
                    访问说明
                  </p>
                </div>
                <p className={cn('text-sm leading-7', darkMode ? 'text-[#9b9b9b]' : 'text-text-main/55')}>
                  未登录时停留在此页面；登录后进入系统；退出后回到欢迎页。
                </p>
              </div>
            </motion.div>
          </div>
        </RevealSection>
      </main>
    </div>
  );
}
