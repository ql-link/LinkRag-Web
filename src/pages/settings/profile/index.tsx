import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, Mail, PenLine, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useAuth } from '@/contexts/AuthContext';
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

export default function ProfilePage() {
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
      <div className="flex flex-col gap-3 border-b border-border-subtle px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center text-muted">{icon}</div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">{label}</p>
            <p className={cn('mt-1 truncate text-xs', value ? 'text-text-secondary' : 'text-muted')}>
              {value || '未设置'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openEdit(field)}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-soft hover:text-ink sm:w-auto"
        >
          <PenLine size={14} />
          修改
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border-subtle px-5 py-3 sm:px-8">
        <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '设置' }, { label: '个人信息' }]} />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-canvas">
        <section className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-2">
            <h1 className="text-[24px] font-semibold leading-tight text-ink sm:text-[27px]">个人信息</h1>
            <p className="text-[13px] text-muted">管理账户展示资料、联系方式与内容管理入口。</p>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 className="animate-spin text-muted" size={24} />
            </div>
          ) : (
            <div className="space-y-8">
              <section>
                <div className="flex flex-col gap-5 border-b border-border-subtle px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="relative shrink-0">
                      {profile?.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt="用户头像"
                          className="h-20 w-20 rounded-2xl border border-hairline object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-hairline bg-surface-soft text-3xl font-semibold text-primary">
                          {getInitial(profile)}
                        </div>
                      )}
                      <label
                        className={cn(
                          'absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-active',
                          avatarLoading && 'pointer-events-none opacity-70',
                        )}
                        aria-label="上传头像"
                      >
                        {avatarLoading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      </label>
                    </div>

                    <div className="min-w-0">
                      <h2 className="max-w-full truncate text-lg font-bold text-ink">{getDisplayName(profile)}</h2>
                      <p className="mt-1 max-w-full truncate font-mono text-xs uppercase tracking-[0.14em] text-muted">
                        @{profile?.username || 'unset'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge label={profile?.role === 'ADMIN' ? '管理员' : '普通用户'} />
                        <StatusBadge label={profile?.status === 1 ? '已启用' : '已停用'} />
                      </div>
                    </div>
                  </div>

                  {profile?.role === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={handleOpenAdminPage}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-hairline bg-canvas px-4 text-xs font-bold text-text-secondary transition-colors hover:border-primary/30 hover:text-ink"
                    >
                      <ShieldCheck size={15} />
                      后台管理
                    </button>
                  )}
                </div>

                <div className="py-1">
                  <ProfileStaticRow
                    label="账号ID"
                    value={profile?.username || '未设置'}
                    icon={<UserRound size={16} />}
                  />
                  {renderEditableRow('昵称', profile?.nickname, 'nickname', <UserRound size={16} />)}
                  {renderEditableRow('邮箱', profile?.email, 'email', <Mail size={16} />)}
                  {renderEditableRow('手机号', profile?.phone, 'phone', <Phone size={16} />)}
                  <ProfileStaticRow
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
          <button className="absolute inset-0 bg-black/50 " onClick={closeEdit} aria-label="关闭弹窗" />
          <div className="relative w-full max-w-[480px] overflow-hidden rounded-2xl border border-hairline bg-bg-card-solid (--)]">
            <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
              <h3 className="text-base font-bold text-ink">修改{fieldMeta[editField].label}</h3>
              <button
                type="button"
                onClick={closeEdit}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-soft hover:text-ink"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-text-secondary">{fieldMeta[editField].label}</span>
                <input
                  type="text"
                  inputMode={fieldMeta[editField].inputMode}
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  className="h-11 w-full rounded-xl border border-hairline bg-bg-card-solid px-4 text-sm text-text-main outline-none transition-colors placeholder:text-muted-soft focus:border-primary/40"
                  placeholder={fieldMeta[editField].placeholder}
                />
              </label>

              {formError && <p className="text-sm text-error">{formError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border-subtle bg-surface-soft px-6 py-4">
              <button
                type="button"
                onClick={closeEdit}
                className="h-9 rounded-xl px-4 text-xs font-bold text-text-secondary transition-colors hover:bg-bg-card-solid hover:text-ink"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitLoading}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-white transition-colors hover:bg-primary-active disabled:opacity-70"
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

function StatusBadge({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-soft px-3 py-2 text-center text-xs font-bold text-text-secondary">
      {label}
    </div>
  );
}

function ProfileStaticRow({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4 last:border-b-0 sm:px-6">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center text-muted">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">{label}</p>
        <p className="mt-1 truncate text-xs text-text-secondary">{value}</p>
      </div>
    </div>
  );
}
