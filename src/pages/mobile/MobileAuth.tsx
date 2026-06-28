import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navigate, useNavigate } from 'react-router';
import { Loader2, Lock, Mail, User } from 'lucide-react';
import { Routes } from '@/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';
import { login, register } from '@/services/auth';
import { buildRequiredFieldErrors, validateAuthForm, type AuthFieldKey, type AuthMode } from '@/lib/authValidation';
import { cn } from '@/lib/utils';

const EMPTY_FORM = { username: '', email: '', password: '', confirmPassword: '' };

/**
 * 移动端（<1024px）登录/注册页，替代超长欢迎落地页。
 * 复用 services/auth 的 login/register 与共享校验；成功后直接进入对话。
 */
export default function MobileAuth() {
  const navigate = useNavigate();
  const { user, refreshProfile, setUser } = useAuth();
  const { addToast } = useToast();
  const { darkMode } = useTheme();

  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthFieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={Routes.Chats} replace />;
  }

  function switchMode(next: AuthMode) {
    if (next === mode) return;
    setMode(next);
    setFieldErrors({});
  }

  function updateField(key: AuthFieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
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
      navigate(Routes.Chats, { replace: true });
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
        'flex min-h-screen flex-col justify-center px-6 py-10',
        darkMode ? 'bg-[#1f1f1f] text-[#d6d6d6]' : 'bg-bg-base text-text-main',
      )}
      style={{
        paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto min-h-[588px] w-full max-w-sm">
        {/* Brand */}
        <div className="mb-9 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center">
            <img
              src={darkMode ? '/linkrag-mark-v2-dark.png' : '/linkrag-mark-v2.png'}
              alt="LinkRag"
              className="h-14 w-14 object-contain"
              draggable={false}
            />
          </div>
          <h1 className="serif-heading text-3xl text-text-main">LinkRag</h1>
          <p className="mt-2 text-sm text-text-tertiary">让知识可问可答</p>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-surface-soft p-1">
          {(['login', 'register'] as AuthMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => switchMode(item)}
              className={cn(
                'h-10 rounded-lg text-sm font-bold transition-colors',
                mode === item ? 'bg-canvas text-ink shadow-sm' : 'text-text-tertiary',
              )}
            >
              {item === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Field
            icon={<User size={16} />}
            placeholder="用户名"
            autoComplete="username"
            value={form.username}
            error={fieldErrors.username}
            onChange={(value) => updateField('username', value)}
          />

          <AnimatePresence initial={false}>
            {mode === 'register' && (
              <motion.div
                key="register-email"
                initial={{ height: 0, opacity: 0, y: -6 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <Field
                  icon={<Mail size={16} />}
                  placeholder="邮箱"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  error={fieldErrors.email}
                  onChange={(value) => updateField('email', value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Field
            icon={<Lock size={16} />}
            placeholder="密码"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={form.password}
            error={fieldErrors.password}
            onChange={(value) => updateField('password', value)}
          />

          <AnimatePresence initial={false}>
            {mode === 'register' && (
              <motion.div
                key="register-confirm-password"
                initial={{ height: 0, opacity: 0, y: -6 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <Field
                  icon={<Lock size={16} />}
                  placeholder="确认密码"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  error={fieldErrors.confirmPassword}
                  onChange={(value) => updateField('confirmPassword', value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white transition-colors hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-tertiary">
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="ml-1 font-bold text-primary"
          >
            {mode === 'login' ? '立即注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({
  icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  error,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          'flex h-12 items-center gap-2 rounded-xl border bg-canvas px-3 transition-colors focus-within:border-primary/50',
          error ? 'border-error/60' : 'border-hairline',
        )}
      >
        <span className="text-muted">{icon}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm text-text-main outline-none placeholder:text-muted-soft"
        />
      </div>
      {error && <p className="mt-1.5 pl-1 text-xs text-error">{error}</p>}
    </div>
  );
}
