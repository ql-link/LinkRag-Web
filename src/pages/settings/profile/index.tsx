import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Routes } from '@/routes';
import { getProfile, updateProfile } from '@/services/user';
import { uploadAvatar } from '@/services/oss';
import type { UpdateProfileRequest, UserProfileDTO } from '@/types/api';
import { useTheme } from '@/contexts/ThemeContext';

type EditField = 'nickname' | 'email' | 'phone' | null;

const fieldMeta: Record<Exclude<EditField, null>, { label: string; placeholder: string }> = {
  nickname: { label: '昵称', placeholder: '请输入昵称' },
  email: { label: '邮箱', placeholder: '请输入邮箱' },
  phone: { label: '手机号', placeholder: '请输入手机号' },
};

export default function ProfilePage() {
  const { darkMode } = useTheme();
  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [editField, setEditField] = useState<EditField>(null);
  const [draftValue, setDraftValue] = useState('');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();

  function handleManageBlog() {
    navigate(Routes.Blogs, { state: { adminOpen: true } });
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }

  function openEdit(field: Exclude<EditField, null>) {
    setEditField(field);
    setDraftValue(profile?.[field] ?? '');
    setFormError('');
  }

  function closeEdit() {
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
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setFormError('头像上传失败，请重试');
    } finally {
      setAvatarLoading(false);
    }
  }

  function renderEditableRow(label: string, value: string | null | undefined, field: Exclude<EditField, null>) {
    return (
      <div className="flex items-start gap-4">
        <label className="w-[190px] text-sm font-medium pt-1.5">{label}</label>
        <div className="flex-1 flex items-center gap-4">
          <div
            className={cn(
              'flex-1 rounded-md py-1.5 px-3 text-sm border',
              darkMode ? 'bg-[#2d2d2d] border-[#3c3c3c] text-[#cccccc]' : 'bg-bg-base/50 border-border-subtle',
            )}
          >
            {value || '未设置'}
          </div>
          <button
            onClick={() => openEdit(field)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
              darkMode
                ? 'border-[#3c3c3c] text-[#cccccc] hover:bg-[#3c3c3c]'
                : 'border-border-subtle hover:bg-gray-100',
            )}
          >
            <PenLine size={12} />
            修改
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <header
          className={cn(
            'h-20 px-8 flex items-center shrink-0 backdrop-blur-md border-b',
            darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle',
          )}
        >
          <div className="flex flex-col gap-1">
            <Breadcrumb
              items={[{ label: '首页', path: Routes.Home }, { label: '设置' }, { label: '个人信息' }]}
              darkMode={darkMode}
            />
            <h2 className={cn('text-xl font-medium', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>个人信息</h2>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className={cn('animate-spin', darkMode ? 'text-[#858585]' : 'text-text-main/40')} size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header
        className={cn(
          'h-20 px-8 flex items-center shrink-0 backdrop-blur-md border-b',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle',
        )}
      >
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[{ label: '首页', path: Routes.Home }, { label: '设置' }, { label: '个人信息' }]}
            darkMode={darkMode}
          />
          <h2 className={cn('text-xl font-medium', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>个人信息</h2>
          <p className={cn('text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
            当前页已对齐后端真实支持字段
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className={cn('max-w-3xl w-3/4 mx-auto p-7 space-y-11', darkMode ? 'text-[#cccccc]' : 'text-text-main')}>
          <div className="flex items-start gap-4">
            <label className="w-[190px] text-sm font-medium pt-1.5">用户名</label>
            <div className="flex-1 text-sm pt-1.5">{profile?.username || '未设置'}</div>
          </div>

          {profile?.role === 'ADMIN' && (
            <div className="flex items-start gap-4">
              <label className="w-[190px] text-sm font-medium pt-1.5">内容管理</label>
              <div className="flex-1">
                <button
                  onClick={handleManageBlog}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2',
                    darkMode
                      ? 'border-cyan-500/50 bg-cyan-900/30 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-800/40'
                      : 'border-primary/30 bg-primary/10 text-primary hover:border-primary/50 hover:bg-primary/20',
                  )}
                >
                  管理官方博客
                </button>
              </div>
            </div>
          )}

          {renderEditableRow('昵称', profile?.nickname, 'nickname')}

          {renderEditableRow('邮箱', profile?.email, 'email')}

          {renderEditableRow('手机号', profile?.phone, 'phone')}

          <div className="flex items-start gap-4">
            <label className="w-[190px] text-sm font-medium pt-1.5">头像</label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div
                    className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold',
                      darkMode ? 'bg-[#3c3c3c] text-[#cccccc]' : 'bg-primary/20 text-primary',
                    )}
                  >
                    {profile?.nickname?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <label
                  className={cn(
                    'absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors',
                    darkMode
                      ? 'bg-[#8A7662] text-white hover:bg-[#7B6B5D]'
                      : 'bg-[#7B6B5D] text-white hover:opacity-90',
                    avatarLoading && 'pointer-events-none opacity-70',
                  )}
                >
                  {avatarLoading ? <Loader2 size={12} className="animate-spin" /> : <PenLine size={12} />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
              <span className={cn('text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                上传图片后会先走 OSS，再写回 `avatarUrl`
              </span>
            </div>
          </div>
        </div>
      </div>

      {editField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEdit} />
          <div
            className={cn(
              'relative w-[480px] rounded-xl shadow-2xl overflow-hidden',
              darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white border-border-subtle',
            )}
          >
            <div
              className={cn(
                'flex items-center justify-between px-6 py-4 border-b',
                darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
              )}
            >
              <h3 className={cn('text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                修改{fieldMeta[editField].label}
              </h3>
              <button
                onClick={closeEdit}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  darkMode ? 'hover:bg-[#2d2d2d] text-[#858585]' : 'hover:bg-gray-100',
                )}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className={cn('block mb-2 text-sm', darkMode ? 'text-[#cccccc]' : 'text-text-main')}>
                  {fieldMeta[editField].label}
                </label>
                <input
                  type="text"
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50',
                    darkMode
                      ? 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#e0e0e0]'
                      : 'bg-bg-base/50 border-border-subtle',
                  )}
                  placeholder={fieldMeta[editField].placeholder}
                />
              </div>

              {formError && <p className="text-red-500 text-sm">{formError}</p>}
            </div>

            <div
              className={cn(
                'flex items-center justify-end gap-3 px-6 py-4 border-t',
                darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-border-subtle bg-bg-base/30',
              )}
            >
              <button
                onClick={closeEdit}
                className={cn(
                  'px-5 py-2 rounded-lg text-sm transition-colors',
                  darkMode ? 'text-[#cccccc] hover:bg-[#2d2d2d]' : 'hover:bg-gray-100',
                )}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={submitLoading}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-opacity',
                  darkMode ? 'bg-[#8A7662] text-white hover:bg-[#7B6B5D]' : 'bg-[#7B6B5D] text-white hover:opacity-90',
                  submitLoading && 'opacity-70',
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
