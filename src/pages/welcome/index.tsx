import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Navigate, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  BookOpenText,
  FileCog,
  FolderHeart,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Workflow,
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
  { id: 'intro', label: '概览' },
  { id: 'knowledge', label: '知识库' },
  { id: 'workflow', label: '流程' },
  { id: 'conversation', label: '问答' },
  { id: 'login', label: '登录' },
];

const capabilityCards = [
  {
    icon: FolderHeart,
    eyebrow: '知识库管理',
    title: '按主题组织文档，集中管理',
    description:
      '创建知识库，按项目或主题归类文档。分类清晰，检索才高效。',
  },
  {
    icon: FileCog,
    eyebrow: '文件处理',
    title: '上传文件，实时追踪处理状态',
    description:
      '支持批量上传，页面展示处理进度。文件是否就绪、解析是否完成，一目了然。',
  },
  {
    icon: MessageSquareText,
    eyebrow: '智能问答',
    title: '基于知识库内容，获得准确回答',
    description:
      '对话与知识库关联，回答基于你上传的内容，并标注引用来源。',
  },
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
  const [form, setForm] = useState({
    username: '',
    password: '',
    nickname: '',
    email: '',
  });

  const heading = useMemo(
    () => (mode === 'login' ? '登录' : '注册'),
    [mode],
  );

  if (loading) {
    return (
      <div
        className={cn(
          'min-h-screen flex items-center justify-center',
          darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main',
        )}
      >
        <div className="mono-label !text-xs">loading tolink...</div>
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (mode === 'login') {
        await login({
          username: form.username.trim(),
          password: form.password,
        });
      } else {
        await register({
          username: form.username.trim(),
          password: form.password,
          nickname: form.nickname.trim() || undefined,
          email: form.email.trim() || undefined,
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

      <motion.header
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-30 px-4 pt-4 lg:px-8"
      >
        <div
          className={cn(
            'mx-auto flex max-w-[1240px] items-center justify-between rounded-full px-4 py-3 backdrop-blur-md',
            darkMode ? 'bg-[#252526]/92 border border-[#3c3c3c]' : 'bg-white/82 border border-white/80 shadow-sm',
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-2xl',
                darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'bg-bg-base border border-border-subtle',
              )}
            >
              <Sparkles size={16} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
            </div>
            <div>
              <p className={cn('mono-label mb-1', darkMode ? 'text-[#858585]' : '')}>knowledge workspace</p>
              <h1 className={cn('text-lg font-bold tracking-tight', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                toLink
              </h1>
            </div>
          </div>

          <nav className="hidden items-center gap-6 lg:flex">
            {scrollSections.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  'text-xs font-bold uppercase tracking-[0.22em] transition-colors',
                  darkMode ? 'text-[#858585] hover:text-[#e0e0e0]' : 'text-text-main/45 hover:text-text-main',
                )}
              >
                {item.label}
              </a>
            ))}
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
      </motion.header>

      <main className="relative z-10 mx-auto max-w-[1240px] px-6 pb-24 pt-28 lg:px-8">
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
              上传文档、构建知识库、围绕内容展开问答。toLink 让每份资料都能被检索、被理解、被使用。
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
          className="min-h-[82vh] flex flex-col justify-center border-b border-border-subtle/60 py-20"
        >
          <div className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className={cn('mono-label mb-5', darkMode ? 'text-[#858585]' : '')}>01</p>
              <h3 className={cn('serif-heading text-4xl leading-tight lg:text-6xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                构建知识库，
                <br />
                让文档有序可查
              </h3>
              <p className={cn('mt-6 max-w-[520px] text-base leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}>
                按主题或项目创建知识库，将分散的文档集中管理。分类清晰，检索才高效。
              </p>
            </div>

            <motion.div
              className="grid gap-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
            >
              {capabilityCards.map(({ icon: Icon, eyebrow, title, description }, index) => (
                <motion.article
                  key={title}
                  variants={fadeUpItem}
                  whileHover={{ y: -5 }}
                  className={cn(
                    'art-card card-glow rounded-[30px] p-6 transition-transform duration-500',
                    darkMode ? 'bg-[#2d2d2d] border-[#3c3c3c]' : '',
                    index % 2 === 1 ? 'lg:translate-x-8' : '',
                  )}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-2xl',
                        darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white/75 border border-border-subtle',
                      )}
                    >
                      <Icon size={18} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
                    </div>
                    <p className={cn('mono-label', darkMode ? 'text-[#858585]' : '')}>{eyebrow}</p>
                  </div>
                  <h4 className={cn('text-xl font-bold leading-8', darkMode ? 'text-[#eaeaea]' : 'text-text-main')}>
                    {title}
                  </h4>
                  <p className={cn('mt-3 text-sm leading-7', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/56')}>
                    {description}
                  </p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </RevealSection>

        <RevealSection
          id="workflow"
          className="min-h-[82vh] flex flex-col justify-center border-b border-border-subtle/60 py-20"
        >
          <div className="max-w-[760px]">
            <p className={cn('mono-label mb-5', darkMode ? 'text-[#858585]' : '')}>02</p>
            <h3 className={cn('serif-heading text-4xl leading-tight lg:text-6xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
              文件处理，
              <br />
              状态透明，流程可控
            </h3>
            <p className={cn('mt-6 text-base leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}>
              上传、查看状态、重新解析——每一步都清晰可见，无需猜测文件是否就绪。
            </p>
          </div>

          <motion.div
            className="mt-12 grid gap-5 lg:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div
              variants={fadeUpItem}
              whileHover={{ y: -4 }}
              className={cn(
                'rounded-[32px] p-7 card-glow',
                darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white/76 border border-border-subtle shadow-sm',
              )}
            >
              <div className="mb-4 flex items-center gap-3">
                <Workflow size={20} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
                <h4 className={cn('text-lg font-bold', darkMode ? 'text-[#ececec]' : 'text-text-main')}>
                  支持的操作
                </h4>
              </div>
              <div className="space-y-3">
                {[
                  '查看文件列表与处理状态',
                  '上传文档到指定知识库',
                  '删除文件并刷新视图',
                  '手动触发重新解析',
                ].map((item) => (
                  <div
                    key={item}
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm leading-7',
                      darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#a9a9a9]' : 'bg-bg-base/70 border border-border-subtle text-text-main/65',
                    )}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={fadeUpItem}
              whileHover={{ y: -4 }}
              className={cn(
                'rounded-[32px] p-7 card-glow',
                darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white/76 border border-border-subtle shadow-sm',
              )}
            >
              <div className="mb-4 flex items-center gap-3">
                <BookOpenText size={20} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
                <h4 className={cn('text-lg font-bold', darkMode ? 'text-[#ececec]' : 'text-text-main')}>
                  文件就绪是问答的前提
                </h4>
              </div>
              <p className={cn('text-sm leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/60')}>
                只有文件成功解析入库，后续的检索和问答才有意义。透明的处理流程让你随时掌握进度。
              </p>
            </motion.div>
          </motion.div>
        </RevealSection>

        <RevealSection
          id="conversation"
          className="min-h-[82vh] flex flex-col justify-center border-b border-border-subtle/60 py-20"
        >
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className={cn('mono-label mb-5', darkMode ? 'text-[#858585]' : '')}>03</p>
              <h3 className={cn('serif-heading text-4xl leading-tight lg:text-6xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                知识问答，
                <br />
                基于你的内容，给出有来源的回答
              </h3>
              <p className={cn('mt-6 max-w-[580px] text-base leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}>
                提问时系统检索已上传的文档，结合上下文生成回答，并标注引用来源。
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ y: -4 }}
              className={cn(
                'rounded-[34px] p-7 card-glow',
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
                        <div className={cn('mt-2 h-16 w-px', darkMode ? 'bg-[#3c3c3c]' : 'bg-border-subtle')} />
                      )}
                    </div>
                    <div className="pb-5">
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
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => scrollToLogin('login')}
                  className={cn(
                    'rounded-full px-5 py-3 text-xs font-bold uppercase tracking-[0.22em]',
                    darkMode ? 'bg-[#2d2d2d] text-[#e0e0e0]' : 'bg-white/80 text-text-main border border-border-subtle',
                  )}
                >
                  登录
                </button>
                <button
                  onClick={() => scrollToLogin('register')}
                  className={cn(
                    'rounded-full px-5 py-3 text-xs font-bold uppercase tracking-[0.22em]',
                    darkMode ? 'bg-[#094771] text-white' : 'bg-text-main text-white',
                  )}
                >
                  注册
                </button>
              </div>
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={cn('mb-2 block text-xs font-bold uppercase tracking-[0.22em]', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}>
                        昵称
                      </span>
                      <input
                        value={form.nickname}
                        onChange={(event) => setForm((prev) => ({ ...prev, nickname: event.target.value }))}
                        className={cn(
                          'w-full rounded-2xl px-4 py-3 text-sm focus:outline-none',
                          darkMode
                            ? 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                            : 'bg-bg-base/45 border border-border-subtle placeholder:text-text-main/30',
                        )}
                        placeholder="显示名称"
                      />
                    </label>
                    <label className="block">
                      <span className={cn('mb-2 block text-xs font-bold uppercase tracking-[0.22em]', darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60')}>
                        邮箱
                      </span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                        className={cn(
                          'w-full rounded-2xl px-4 py-3 text-sm focus:outline-none',
                          darkMode
                            ? 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                            : 'bg-bg-base/45 border border-border-subtle placeholder:text-text-main/30',
                        )}
                        placeholder="可选"
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
