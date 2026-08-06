import { useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link, Navigate, useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Routes } from '@/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';
import { login, register } from '@/services/auth';
import { buildRequiredFieldErrors, validateAuthForm, type AuthFieldKey, type AuthMode } from '@/lib/authValidation';
import { cn } from '@/lib/utils';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { fluidEnterTransition, fluidLift, fluidPress, fluidSpring, fluidSpringQuick } from '@/lib/fluid-motion';

const EMPTY_FORM = { username: '', email: '', password: '', confirmPassword: '' };
const MotionLink = motion.create(Link);

/** 独立认证页：路由决定登录或注册模式，认证请求与校验逻辑保持不变。 */
export default function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const reducedMotion = useReducedMotion();
  const { user, refreshProfile, setUser } = useAuth();
  const { addToast } = useToast();
  const { darkMode } = useTheme();

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthFieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={isDesktop ? Routes.Home : Routes.Chats} replace />;
  }

  function updateField(key: AuthFieldKey, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const nextErrors = { ...previous };
      delete nextErrors[key];
      return nextErrors;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const requiredFieldErrors = buildRequiredFieldErrors(form, mode);
    if (Object.keys(requiredFieldErrors).length > 0) {
      setFieldErrors(requiredFieldErrors);
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
        await login({ account: form.username.trim(), password: form.password });
      } else {
        await register({ username: form.username.trim(), password: form.password, email: form.email.trim() });
      }
      await refreshProfile();
      addToast('success', mode === 'login' ? '登录成功' : '注册成功');
      navigate(isDesktop ? Routes.Home : Routes.Chats, { replace: true });
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
        'relative min-h-screen overflow-x-hidden px-4 py-4 sm:px-6',
        darkMode ? 'bg-[#1f1f1f] text-[#d6d6d6]' : 'bg-[#fbfaf7] text-text-main',
      )}
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className={cn('pointer-events-none fixed inset-0 welcome-dot-grid', darkMode && 'welcome-dot-grid-dark')}
        aria-hidden="true"
      />

      <AuthHeader darkMode={darkMode} />

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full items-center justify-center py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.985, y: reducedMotion ? 0 : 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={fluidEnterTransition(reducedMotion)}
          className="fluid-compositor w-full max-w-[23.5rem]"
        >
          <motion.section
            className={cn(
              'fluid-compositor w-full rounded-[1.75rem] border px-6 py-7 shadow-[0_24px_70px_rgba(65,50,38,0.08)] sm:px-8 sm:py-8',
              darkMode ? 'border-[#363636] bg-[#272727]' : 'border-[#e8e1d8] bg-[#fffefa]',
            )}
          >
            <div className="text-left">
              <h1 className={cn('text-2xl font-semibold tracking-[-0.035em]', darkMode ? 'text-[#f0f0f0]' : '')}>
                {mode === 'login' ? '欢迎回来' : '创建知识空间'}
              </h1>
              <p className={cn('mt-2 text-sm leading-6', darkMode ? 'text-[#8e8e8e]' : 'text-text-main/48')}>
                {mode === 'login' ? '登录后继续使用你的知识空间。' : '创建账号，开始整理和检索资料。'}
              </p>
            </div>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
              <Field
                label="用户名"
                placeholder="输入用户名"
                autoComplete="username"
                value={form.username}
                error={fieldErrors.username}
                onChange={(value) => updateField('username', value)}
                darkMode={darkMode}
              />

              {mode === 'register' && (
                <Field
                  label="邮箱"
                  placeholder="name@example.com"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  error={fieldErrors.email}
                  onChange={(value) => updateField('email', value)}
                  darkMode={darkMode}
                />
              )}

              <Field
                label="密码"
                placeholder="输入密码"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={form.password}
                error={fieldErrors.password}
                onChange={(value) => updateField('password', value)}
                darkMode={darkMode}
              />

              {mode === 'register' && (
                <Field
                  label="确认密码"
                  placeholder="再次输入密码"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  error={fieldErrors.confirmPassword}
                  onChange={(value) => updateField('confirmPassword', value)}
                  darkMode={darkMode}
                />
              )}

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={submitting || reducedMotion ? undefined : fluidLift}
                whileTap={submitting ? undefined : fluidPress}
                transition={fluidSpring}
                className="fluid-compositor mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(123,107,93,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className={cn(!reducedMotion && 'animate-spin')} />}
                {submitting ? '处理中…' : mode === 'login' ? '登录 LinkRag' : '创建账号'}
                {!submitting && <ArrowRight size={15} />}
              </motion.button>
            </form>

            <MotionLink
              to={mode === 'login' ? Routes.Register : Routes.Login}
              whileTap={fluidPress}
              transition={fluidSpringQuick}
              className={cn(
                'fluid-compositor mx-auto mt-5 flex w-fit items-center gap-1.5 text-xs',
                darkMode ? 'text-[#9a9a9a]' : 'text-text-main/52',
              )}
            >
              {mode === 'login' ? '还没有账号？' : '已经有账号？'}
              <span className={cn('font-bold', darkMode ? 'text-[#d4d4d4]' : 'text-primary')}>
                {mode === 'login' ? '注册' : '登录'}
              </span>
            </MotionLink>
          </motion.section>
        </motion.div>
      </main>
    </div>
  );
}

function AuthHeader({ darkMode }: { darkMode: boolean }) {
  return (
    <header className="relative z-30 mx-auto flex h-12 w-full max-w-[68rem] items-center justify-between px-1 sm:px-2">
      <Link to={Routes.Welcome} className="flex items-center gap-2.5">
        <img
          src={darkMode ? '/linkrag-mark-v2-dark.png' : '/linkrag-mark-v2.png'}
          alt="LinkRag"
          className="h-8 w-8 object-contain"
          draggable={false}
        />
        <div>
          <p className={cn('text-sm font-bold tracking-[-0.025em]', darkMode ? 'text-[#ececec]' : '')}>LinkRag</p>
        </div>
      </Link>

      <MotionLink
        to={Routes.Welcome}
        whileTap={fluidPress}
        transition={fluidSpringQuick}
        className={cn(
          'fluid-compositor flex min-h-10 items-center gap-1.5 rounded-full px-2 text-xs font-semibold',
          darkMode ? 'text-[#999]' : 'text-text-main/48',
        )}
      >
        <ArrowLeft size={14} />
        返回首页
      </MotionLink>
    </header>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  error,
  darkMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  darkMode: boolean;
}) {
  return (
    <label className="block text-left">
      <span className={cn('mb-1.5 block text-[11px] font-bold', darkMode ? 'text-[#aaa]' : 'text-text-main/52')}>
        {label}
      </span>
      <div
        className={cn(
          'flex h-12 items-center rounded-xl border px-3.5 focus-within:ring-2 focus-within:ring-primary/15',
          darkMode ? 'bg-[#222] text-[#e4e4e4]' : 'bg-[#fbfaf7] text-text-main',
          error
            ? 'border-error/70'
            : darkMode
              ? 'border-[#3c3c3c] focus-within:border-[#8A7662]'
              : 'border-hairline focus-within:border-primary/55',
        )}
      >
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-sm outline-none',
            darkMode ? 'text-[#e4e4e4] placeholder:text-[#666]' : 'text-text-main placeholder:text-muted-soft',
          )}
        />
      </div>
      {error && <p className="mt-1.5 pl-1 text-xs text-error">{error}</p>}
    </label>
  );
}
