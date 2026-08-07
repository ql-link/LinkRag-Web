import { useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Loader2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';
import { login } from '@/services/auth';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { fluidEnterTransition, fluidPress, fluidSpring } from '@/lib/fluid-motion';
import linkRagLogoCreamUrl from '@/assets/brand/linkrag-logo-cream.png';
import linkRagLogoInkUrl from '@/assets/brand/linkrag-logo-ink.png';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { admin, refreshAdmin } = useAdminAuth();
  const { addToast } = useToast();
  const { darkMode } = useTheme();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (admin) return <Navigate to={Routes.AdminUsers} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account.trim() || !password) {
      addToast('error', '请输入管理员账号和密码');
      return;
    }

    setSubmitting(true);
    try {
      await login({ account: account.trim(), password }, 'admin');
      await refreshAdmin();
      addToast('success', '管理端登录成功');
      navigate(Routes.AdminUsers, { replace: true });
    } catch (error) {
      if (error instanceof Error && error.message === '当前账号没有管理权限') {
        addToast('error', error.message, 5000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden px-4 py-6 font-sans sm:px-6',
        darkMode ? 'bg-[#171717] text-[#f2f2f2]' : 'bg-[#f3f0ea] text-[#181715]',
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 opacity-70',
          darkMode
            ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(210,135,107,0.12),transparent_42%)]'
            : 'bg-[radial-gradient(circle_at_50%_0%,rgba(204,120,92,0.12),transparent_45%)]',
        )}
      />

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <motion.section
          initial={{ opacity: 0, y: reducedMotion ? 0 : 14, scale: reducedMotion ? 1 : 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={fluidEnterTransition(reducedMotion)}
          className={cn(
            'w-full max-w-[420px] overflow-hidden rounded-2xl border shadow-[0_24px_80px_rgba(20,20,19,0.12)]',
            darkMode ? 'border-[#383838] bg-[#222]' : 'border-[#ddd6cb] bg-[#fffdf9]',
          )}
        >
          <div className={cn('border-b px-7 py-6', darkMode ? 'border-[#383838]' : 'border-[#e8e1d8]')}>
            <div className="flex items-center justify-between gap-4">
              <img
                src={darkMode ? linkRagLogoCreamUrl : linkRagLogoInkUrl}
                alt="LinkRag"
                className="h-7 w-auto"
                draggable={false}
              />
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em]',
                  darkMode ? 'bg-white/[0.06] text-[#aaa]' : 'bg-[#eee8df] text-[#6f675e]',
                )}
              >
                <ShieldCheck size={12} /> Admin
              </span>
            </div>
          </div>

          <div className="px-7 py-8 sm:px-9">
            <h1 className="text-2xl font-semibold tracking-[-0.035em]">管理控制台</h1>
            <p className={cn('mt-2 text-sm leading-6', darkMode ? 'text-[#999]' : 'text-[#746d64]')}>
              仅限已授权的管理员账号访问。
            </p>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
              <AdminField
                label="管理员账号"
                value={account}
                onChange={setAccount}
                autoComplete="username"
                icon={<UserRound size={16} />}
                darkMode={darkMode}
              />
              <AdminField
                label="密码"
                value={password}
                onChange={setPassword}
                type="password"
                autoComplete="current-password"
                icon={<LockKeyhole size={16} />}
                darkMode={darkMode}
              />

              <motion.button
                type="submit"
                disabled={submitting}
                whileTap={submitting ? undefined : fluidPress}
                transition={fluidSpring}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(123,107,93,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className={cn(!reducedMotion && 'animate-spin')} />}
                {submitting ? '正在验证…' : '登录管理端'}
              </motion.button>
            </form>

            <p className={cn('mt-6 text-center text-[11px] leading-5', darkMode ? 'text-[#737373]' : 'text-[#968e84]')}>
              管理端不提供账号注册，请联系系统负责人开通权限。
            </p>
          </div>
        </motion.section>
      </main>
    </div>
  );
}

function AdminField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  icon,
  darkMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete: string;
  icon: ReactNode;
  darkMode: boolean;
}) {
  return (
    <label className="block">
      <span className={cn('mb-1.5 block text-[11px] font-bold', darkMode ? 'text-[#aaa]' : 'text-[#696159]')}>
        {label}
      </span>
      <span
        className={cn(
          'flex h-12 items-center gap-3 rounded-xl border px-3.5 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10',
          darkMode ? 'border-[#3c3c3c] bg-[#1b1b1b] text-[#e5e5e5]' : 'border-[#ddd6cb] bg-white text-[#181715]',
        )}
      >
        <span className={darkMode ? 'text-[#777]' : 'text-[#9a9187]'}>{icon}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-soft"
        />
      </span>
    </label>
  );
}
