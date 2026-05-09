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
  { id: 'knowledge', label: '流程' },
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

const workflowSlides = [
  {
    id: 'knowledge',
    step: '01',
    title: (
      <>
        构建知识库，
        <br />
        让文档有序可查
      </>
    ),
    description: '按主题或项目创建知识库，将分散的文档集中管理。分类清晰，检索才高效。',
    kind: 'capabilities',
  },
  {
    id: 'files',
    step: '02',
    title: (
      <>
        文件处理，
        <br />
        状态透明，流程可控
      </>
    ),
    description: '上传、查看状态、重新解析——每一步都清晰可见，无需猜测文件是否就绪。',
    kind: 'operations',
  },
  {
    id: 'conversation',
    step: '03',
    title: (
      <>
        知识问答，
        <br />
        基于你的内容，给出有来源的回答
      </>
    ),
    description: '提问时系统检索已上传的文档，结合上下文生成回答，并标注引用来源。',
    kind: 'timeline',
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
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
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
                'pointer-events-auto mx-auto flex max-w-[1240px] items-center justify-between rounded-full px-4 py-3 backdrop-blur-xl shadow-lg transition-shadow',
                darkMode
                  ? 'bg-[#252526]/95 border border-[#3c3c3c] shadow-black/25'
                  : 'bg-white/92 border border-white/90 shadow-text-main/10',
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
                <Link
                  to={Routes.Blogs}
                  className={cn(
                    'text-xs font-bold uppercase tracking-[0.22em] transition-colors',
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
          className="min-h-[88vh] flex flex-col justify-center border-b border-border-subtle/60 py-16"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className={cn('mono-label mb-2', darkMode ? 'text-[#858585]' : '')}>workflow</p>
              <h3 className={cn('text-xl font-bold tracking-tight', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                三步了解 toLink
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
                    <motion.div
                      className="grid gap-4"
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                    >
                      {capabilityCards.map(({ icon: Icon, eyebrow, title, description }, index) => (
                        <motion.article
                          key={title}
                          variants={fadeUpItem}
                          whileHover={{ y: -5 }}
                          className={cn(
                            'art-card card-glow rounded-[28px] p-5 transition-transform duration-500',
                            darkMode ? 'bg-[#2d2d2d] border-[#3c3c3c]' : '',
                            index % 2 === 1 ? 'lg:translate-x-6' : '',
                          )}
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <div
                              className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-2xl',
                                darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white/75 border border-border-subtle',
                              )}
                            >
                              <Icon size={17} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
                            </div>
                            <p className={cn('mono-label', darkMode ? 'text-[#858585]' : '')}>{eyebrow}</p>
                          </div>
                          <h4 className={cn('text-lg font-bold leading-7', darkMode ? 'text-[#eaeaea]' : 'text-text-main')}>
                            {title}
                          </h4>
                          <p className={cn('mt-2 text-sm leading-7', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/56')}>
                            {description}
                          </p>
                        </motion.article>
                      ))}
                    </motion.div>
                  )}

                  {activeWorkflowSlide.kind === 'operations' && (
                    <div className="grid gap-5 lg:grid-cols-2">
                      <motion.div
                        whileHover={{ y: -4 }}
                        className={cn(
                          'rounded-[30px] p-6 card-glow',
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
                        whileHover={{ y: -4 }}
                        className={cn(
                          'rounded-[30px] p-6 card-glow',
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
                    </div>
                  )}

                  {activeWorkflowSlide.kind === 'timeline' && (
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
                onClick={() => setActiveFlowIndex(index)}
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
