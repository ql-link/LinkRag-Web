import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, Mail, PenLine, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { Routes } from '@/routes';
import { getProfile, updateProfile } from '@/services/user';
import { uploadAvatar } from '@/services/oss';
import type { UpdateProfileRequest, UserProfileDTO } from '@/types/api';

type EditField = 'nickname' | 'email' | 'phone' | null;

const fieldMeta: Record<
  Exclude<EditField, null>,
  { label: string; placeholder: string; inputMode?: 'email' | 'tel' }
> = {
  nickname: { label: '昵称', placeholder: '请输入昵称' },
  email: { label: '邮箱', placeholder: '请输入邮箱', inputMode: 'email' },
  phone: { label: '手机号', placeholder: '请输入手机号', inputMode: 'tel' },
};

function getInitial(profile: UserProfileDTO | null) {
  return profile?.nickname?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || 'U';
}

function getDisplayName(profile: UserProfileDTO | null) {
  return profile?.nickname || profile?.username || '未设置';
}

function mutedTextClassName(darkMode: boolean) {
  return darkMode ? 'text-[#858585]' : 'text-text-main/50';
}

export default function ProfilePage() {
  const { darkMode } = useTheme();
  const { refreshProfile } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [editField, setEditField] = useState<EditField>(null);
  const [draftValue, setDraftValue] = useState('');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
      addToast('error', '个人信息加载失败');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function handleOpenAdminPage() {
    navigate(Routes.AdminBlogs);
  }

  function openEdit(field: Exclude<EditField, null>) {
    setEditField(field);
    setDraftValue(profile?.[field] ?? '');
    setFormError('');
  }

  function closeEdit() {
    if (submitLoading) {
      return;
    }
    setEditField(null);
    setDraftValue('');
    setFormError('');
  }

  async function handleSave() {
    if (!editField) {
      return;
    }

    const trimmedValue = draftValue.trim();
    const payload: UpdateProfileRequest = {
      [editField]: trimmedValue || undefined,
    };

    setSubmitLoading(true);
    setFormError('');
    try {
      await updateProfile(payload);
      setProfile((prev) => (prev ? { ...prev, [editField]: trimmedValue || null } : prev));
      await refreshProfile();
      addToast('success', '个人信息已更新');
      closeEdit();
    } catch (error) {
      console.error('Failed to update profile:', error);
      setFormError('保存失败，请重试');
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setAvatarLoading(true);
    try {
      const avatarUrl = await uploadAvatar(file);
      await updateProfile({ avatarUrl });
      setProfile((prev) => (prev ? { ...prev, avatarUrl } : prev));
      await refreshProfile();
      addToast('success', '头像已更新');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      addToast('error', '头像上传失败，请重试');
    } finally {
      setAvatarLoading(false);
    }
  }

  function renderEditableRow(
    label: string,
    value: string | null | undefined,
    field: Exclude<EditField, null>,
    icon: ReactNode,
  ) {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 border-b px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:px-6',
          darkMode ? 'border-[#3c3c3c]/70' : 'border-border-subtle/70',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center',
              darkMode ? 'text-[#858585]' : 'text-primary',
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>{label}</p>
            <p
              className={cn(
                'mt-1 truncate text-xs',
                value ? (darkMode ? 'text-[#cccccc]' : 'text-text-main/70') : mutedTextClassName(darkMode),
              )}
            >
              {value || '未设置'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openEdit(field)}
          className={cn(
            'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-colors sm:w-auto',
            darkMode ? 'text-[#cccccc] hover:bg-[#2d2d2d]' : 'text-text-main/60 hover:bg-white/70 hover:text-text-main',
          )}
        >
          <PenLine size={14} />
          修改
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header
        className={cn(
          'flex min-h-16 shrink-0 items-center justify-between gap-4 border-b px-5 py-3 sm:px-8',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/80',
        )}
      >
        <Breadcrumb
          items={[{ label: '首页', path: Routes.Home }, { label: '设置' }, { label: '个人信息' }]}
          darkMode={darkMode}
        />
      </header>

      <main className={cn('min-h-0 flex-1 overflow-y-auto', darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base')}>
        <section className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-2">
            <h1
              className={cn(
                'text-[24px] font-semibold leading-tight sm:text-[27px]',
                darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
              )}
            >
              个人信息
            </h1>
            <p className={cn('text-[13px]', mutedTextClassName(darkMode))}>
              管理账户展示资料、联系方式与内容管理入口。
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 className={cn('animate-spin', mutedTextClassName(darkMode))} size={24} />
            </div>
          ) : (
            <div className="space-y-8">
              <section>
                <div
                  className={cn(
                    'flex flex-col gap-5 border-b px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6',
                    darkMode ? 'border-[#3c3c3c]/70' : 'border-border-subtle/70',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="relative shrink-0">
                      {profile?.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt="用户头像"
                          className="h-20 w-20 rounded-2xl border border-border-subtle object-cover"
                        />
                      ) : (
                        <div
                          className={cn(
                            'flex h-20 w-20 items-center justify-center rounded-2xl border text-3xl font-semibold',
                            darkMode
                              ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#e0e0e0]'
                              : 'border-border-subtle bg-bg-base/70 text-primary',
                          )}
                        >
                          {getInitial(profile)}
                        </div>
                      )}
                      <label
                        className={cn(
                          'absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border text-white transition-colors',
                          darkMode
                            ? 'border-[#3c3c3c] bg-[#094771] hover:bg-[#0d5b8f]'
                            : 'border-white/80 bg-[#7B6B5D] hover:opacity-90',
                          avatarLoading && 'pointer-events-none opacity-70',
                        )}
                        aria-label="上传头像"
                      >
                        {avatarLoading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      </label>
                    </div>

                    <div className="min-w-0">
                      <h2
                        className={cn(
                          'max-w-full truncate text-lg font-bold',
                          darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                        )}
                      >
                        {getDisplayName(profile)}
                      </h2>
                      <p
                        className={cn(
                          'mt-1 max-w-full truncate font-mono text-xs uppercase tracking-[0.14em]',
                          mutedTextClassName(darkMode),
                        )}
                      >
                        @{profile?.username || 'unset'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge darkMode={darkMode} label={profile?.role === 'ADMIN' ? '管理员' : '普通用户'} />
                        <StatusBadge darkMode={darkMode} label={profile?.status === 1 ? '已启用' : '已停用'} />
                      </div>
                    </div>
                  </div>

                  {profile?.role === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={handleOpenAdminPage}
                      className={cn(
                        'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-colors',
                        darkMode
                          ? 'bg-[#1f2937] text-[#c7dff8] hover:bg-[#26364d]'
                          : 'bg-white/70 text-text-main/70 hover:bg-white hover:text-text-main',
                      )}
                    >
                      <ShieldCheck size={15} />
                      后台管理
                    </button>
                  )}
                </div>

                <div className="py-1">
                  <ProfileStaticRow
                    darkMode={darkMode}
                    label="账号ID"
                    value={profile?.username || '未设置'}
                    icon={<UserRound size={16} />}
                  />
                  {renderEditableRow('昵称', profile?.nickname, 'nickname', <UserRound size={16} />)}
                  {renderEditableRow('邮箱', profile?.email, 'email', <Mail size={16} />)}
                  {renderEditableRow('手机号', profile?.phone, 'phone', <Phone size={16} />)}
                  <ProfileStaticRow
                    darkMode={darkMode}
                    label="账户权限"
                    value={profile?.role === 'ADMIN' ? '管理员' : '普通用户'}
                    icon={<ShieldCheck size={16} />}
                  />
                </div>
              </section>
            </div>
          )}
        </section>
      </main>

      {editField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEdit} aria-label="关闭弹窗" />
          <div
            className={cn(
              'relative w-full max-w-[480px] overflow-hidden rounded-2xl border shadow-2xl',
              darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
            )}
          >
            <div
              className={cn(
                'flex items-center justify-between border-b px-6 py-4',
                darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
              )}
            >
              <h3 className={cn('text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                修改{fieldMeta[editField].label}
              </h3>
              <button
                type="button"
                onClick={closeEdit}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  darkMode
                    ? 'text-[#858585] hover:bg-[#2d2d2d] hover:text-[#cccccc]'
                    : 'text-text-main/45 hover:bg-bg-base hover:text-text-main',
                )}
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label className="block">
                <span className={cn('mb-2 block text-xs font-bold', darkMode ? 'text-[#cccccc]' : 'text-text-main/70')}>
                  {fieldMeta[editField].label}
                </span>
                <input
                  type="text"
                  inputMode={fieldMeta[editField].inputMode}
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  className={cn(
                    'h-11 w-full rounded-xl border px-4 text-sm outline-none transition-colors focus:border-primary/50',
                    darkMode
                      ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                      : 'border-border-subtle bg-bg-base/50 text-text-main placeholder:text-text-main/35 focus:bg-white',
                  )}
                  placeholder={fieldMeta[editField].placeholder}
                />
              </label>

              {formError && <p className="text-sm text-error">{formError}</p>}
            </div>

            <div
              className={cn(
                'flex items-center justify-end gap-3 border-t px-6 py-4',
                darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-border-subtle bg-bg-base/30',
              )}
            >
              <button
                type="button"
                onClick={closeEdit}
                className={cn(
                  'h-9 rounded-xl px-4 text-xs font-bold transition-colors',
                  darkMode
                    ? 'text-[#cccccc] hover:bg-[#2d2d2d]'
                    : 'text-text-main/65 hover:bg-white hover:text-text-main',
                )}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitLoading}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-bold text-white transition-colors disabled:opacity-70',
                  darkMode ? 'bg-[#094771] hover:bg-[#0d5b8f]' : 'bg-[#7B6B5D] hover:opacity-90',
                )}
              >
                {submitLoading && <Loader2 className="animate-spin" size={14} />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ darkMode, label }: { darkMode: boolean; label: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-center text-xs font-bold',
        darkMode
          ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc]'
          : 'border-border-subtle bg-bg-base/55 text-text-main/70',
      )}
    >
      {label}
    </div>
  );
}

function ProfileStaticRow({
  darkMode,
  label,
  value,
  icon,
}: {
  darkMode: boolean;
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b px-5 py-4 last:border-b-0 sm:px-6',
        darkMode ? 'border-[#3c3c3c]/70' : 'border-border-subtle/70',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center',
          darkMode ? 'text-[#858585]' : 'text-primary',
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>{label}</p>
        <p className={cn('mt-1 truncate text-xs', darkMode ? 'text-[#cccccc]' : 'text-text-main/70')}>{value}</p>
      </div>
    </div>
  );
}
