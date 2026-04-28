import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Navigate, useNavigate } from 'react-router';
import {
  ArrowDown,
  ArrowRight,
  BookOpenText,
  Database,
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
    eyebrow: 'Knowledge Space',
    title: '先把资料放进一个清楚的地方',
    description:
      '你可以按主题或项目建立知识库，把常用文档慢慢收进来，之后查找和问答都会轻松很多。',
  },
  {
    icon: FileCog,
    eyebrow: 'File Pipeline',
    title: '上传文件这件事，会变得简单很多',
    description:
      '支持把资料上传进系统，也能看到处理状态。你不需要猜文件有没有进来，页面会把过程展示给你。',
  },
  {
    icon: MessageSquareText,
    eyebrow: 'Conversation',
    title: '当资料准备好之后，就可以开始问问题了',
    description:
      '对话会和知识库关联在一起，所以你的提问不是空聊，而是围绕已经整理好的内容展开。',
  },
];

const timeline = [
  {
    title: '先建一个知识库',
    description: '给资料一个归属，后面整理起来会顺很多。',
  },
  {
    title: '再把文件放进来',
    description: 'PDF、文档、笔记都可以慢慢补进来。',
  },
  {
    title: '然后开始提问',
    description: '围绕这些资料去问，得到的回答会更贴近你的内容。',
  },
  {
    title: '把它用成自己的工作台',
    description: '资料越完整，它就越像一个真正懂你内容的小助手。',
  },
];

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
    () => (mode === 'login' ? '回到你的知识工作台' : '开始搭建你的知识空间'),
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

      <header className="fixed inset-x-0 top-0 z-30 px-4 pt-4 lg:px-8">
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
      </header>

      <main className="relative z-10 mx-auto max-w-[1240px] px-6 pb-24 pt-28 lg:px-8">
        <RevealSection
          id="intro"
          className="min-h-[88vh] flex flex-col justify-center border-b border-border-subtle/60 py-20"
        >
          <div className="max-w-[820px]">
            <p className={cn('mono-label mb-6', darkMode ? 'text-[#858585]' : '')}>document intelligence entrance</p>
            <h2 className={cn('serif-heading text-5xl leading-[1.02] lg:text-8xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
              欢迎来到这里，
              <br />
              把你的资料慢慢整理成知识
            </h2>
            <p className={cn('mt-8 max-w-[700px] text-lg leading-9', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/60')}>
              这里适合放下文档、整理内容、再围绕资料开始提问。往下看一看，你会更清楚这个空间可以怎么陪你一起工作。
            </p>
          </div>

          <div className="mt-14 flex flex-wrap gap-4">
            <button
              onClick={() => scrollToLogin('login')}
              className={cn(
                'flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-[0.22em] transition-opacity',
                darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-text-main text-white hover:opacity-90',
              )}
            >
              立即登录
              <ArrowRight size={16} />
            </button>
            <a
              href="#knowledge"
              className={cn(
                'flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-[0.22em]',
                darkMode ? 'bg-[#2d2d2d] text-[#e0e0e0] border border-[#3c3c3c]' : 'bg-white/70 text-text-main border border-border-subtle',
              )}
            >
              继续向下看
              <ArrowDown size={16} />
            </a>
          </div>
        </RevealSection>

        <RevealSection
          id="knowledge"
          className="min-h-[82vh] flex flex-col justify-center border-b border-border-subtle/60 py-20"
        >
          <div className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className={cn('mono-label mb-5', darkMode ? 'text-[#858585]' : '')}>chapter one</p>
              <h3 className={cn('serif-heading text-4xl leading-tight lg:text-6xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                先把内容放好，
                <br />
                心里就会踏实很多
              </h3>
              <p className={cn('mt-6 max-w-[520px] text-base leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}>
                很多人开始用这类工具时，最怕的不是功能不够，而是资料太散。先建立几个知识库，把内容归到合适的位置，后面会轻松很多。
              </p>
            </div>

            <div className="grid gap-4">
              {capabilityCards.map(({ icon: Icon, eyebrow, title, description }, index) => (
                <article
                  key={title}
                  className={cn(
                    'art-card rounded-[30px] p-6 transition-transform duration-500',
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
                </article>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection
          id="workflow"
          className="min-h-[82vh] flex flex-col justify-center border-b border-border-subtle/60 py-20"
        >
          <div className="max-w-[760px]">
            <p className={cn('mono-label mb-5', darkMode ? 'text-[#858585]' : '')}>chapter two</p>
            <h3 className={cn('serif-heading text-4xl leading-tight lg:text-6xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
              把文件放进来以后，
              <br />
              事情就开始动起来了
            </h3>
            <p className={cn('mt-6 text-base leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}>
              上传、查看状态、重新处理，这些动作都很具体，也很让人安心。你能清楚地知道资料有没有进入系统，而不是只能等一个结果。
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <div
              className={cn(
                'rounded-[32px] p-7',
                darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white/76 border border-border-subtle shadow-sm',
              )}
            >
              <div className="mb-4 flex items-center gap-3">
                <Workflow size={20} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
                <h4 className={cn('text-lg font-bold', darkMode ? 'text-[#ececec]' : 'text-text-main')}>
                  现在你可以做这些事
                </h4>
              </div>
              <div className="space-y-3">
                {[
                  '数据集详情中查看文件列表',
                  '上传文件到指定知识库',
                  '删除文件并刷新状态',
                  '手动触发解析动作',
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
            </div>

            <div
              className={cn(
                'rounded-[32px] p-7',
                darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white/76 border border-border-subtle shadow-sm',
              )}
            >
              <div className="mb-4 flex items-center gap-3">
                <BookOpenText size={20} className={darkMode ? 'text-[#c586c0]' : 'text-primary'} />
                <h4 className={cn('text-lg font-bold', darkMode ? 'text-[#ececec]' : 'text-text-main')}>
                  为什么这一步很重要
                </h4>
              </div>
              <p className={cn('text-sm leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/60')}>
                因为只要资料真正进来了，后面的整理、检索和问答才有意义。对使用者来说，这一步顺不顺，几乎决定了整个体验舒不舒服。
              </p>
            </div>
          </div>
        </RevealSection>

        <RevealSection
          id="conversation"
          className="min-h-[82vh] flex flex-col justify-center border-b border-border-subtle/60 py-20"
        >
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className={cn('mono-label mb-5', darkMode ? 'text-[#858585]' : '')}>chapter three</p>
              <h3 className={cn('serif-heading text-4xl leading-tight lg:text-6xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                当资料慢慢积累起来，
                <br />
                对话才会越来越有用
              </h3>
              <p className={cn('mt-6 max-w-[580px] text-base leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}>
                你不需要一次就把所有东西准备完。很多时候，只要先放进几份常用资料，再从几个问题开始，这个空间就会慢慢变得顺手起来。
              </p>
            </div>

            <div
              className={cn(
                'rounded-[34px] p-7',
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
            </div>
          </div>
        </RevealSection>

        <RevealSection id="login" className="min-h-[92vh] flex items-center py-24">
          <div ref={loginRef} className="grid w-full items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="pt-4">
              <p className={cn('mono-label mb-5', darkMode ? 'text-[#858585]' : '')}>final chapter</p>
              <h3 className={cn('serif-heading text-4xl leading-tight lg:text-6xl', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                如果你想开始，
                <br />
                就从这里进去看看
              </h3>
              <p className={cn('mt-6 max-w-[480px] text-base leading-8', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}>
                你可以直接登录，也可以先注册一个账号。后面进入的就是知识库、文件和对话工作台，所有内容都会从那里开始展开。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => scrollToLogin('login')}
                  className={cn(
                    'rounded-full px-5 py-3 text-xs font-bold uppercase tracking-[0.22em]',
                    darkMode ? 'bg-[#2d2d2d] text-[#e0e0e0]' : 'bg-white/80 text-text-main border border-border-subtle',
                  )}
                >
                  切到登录
                </button>
                <button
                  onClick={() => scrollToLogin('register')}
                  className={cn(
                    'rounded-full px-5 py-3 text-xs font-bold uppercase tracking-[0.22em]',
                    darkMode ? 'bg-[#094771] text-white' : 'bg-text-main text-white',
                  )}
                >
                  切到注册
                </button>
              </div>
            </div>

            <div
              className={cn(
                'rounded-[34px] p-7 shadow-xl lg:p-8',
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
                    ? '登录后就会进入工作台，继续整理资料或开始提问。'
                    : '注册完成后会直接进入首页，从那里开始使用。'}
                </p>
              </div>

              <div
                className={cn(
                  'mb-6 grid grid-cols-2 gap-2 rounded-2xl p-1',
                  darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base/70',
                )}
              >
                <button
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
                </button>
                <button
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
                </button>
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

                <button
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
                </button>
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
                    进入逻辑
                  </p>
                </div>
                <p className={cn('text-sm leading-7', darkMode ? 'text-[#9b9b9b]' : 'text-text-main/55')}>
                  没登录时会先停留在这里；登录后进入系统；退出时也会回到这个欢迎页。
                </p>
              </div>
            </div>
          </div>
        </RevealSection>
      </main>
    </div>
  );
}
