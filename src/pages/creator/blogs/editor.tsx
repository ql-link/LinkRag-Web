import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  Globe,
  Lock,
  Trash,
  Copy,
  FileText,
  Save,
  LayoutTemplate,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { LiveMarkdownEditor } from '@/components/LiveMarkdownEditor';
import { createBlogCoverThumbnail } from '@/lib/blog-cover-thumbnail';
import {
  createDraft,
  updateMetadata,
  uploadContentMarkdown,
  uploadAsset,
  publishPost,
  unpublishPost,
  deletePost,
  getAdminPostDetail,
  getAssets,
  deleteAsset,
} from '@/services/blog';
import type { BlogPostAdminDetailDTO, BlogAssetDTO } from '@/types/api';
import { Routes as RoutePaths } from '@/routes';

export default function CreatorBlogEditor() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const postId = isNew ? null : parseInt(id || '', 10);
  const blogListPath = pathname.startsWith('/admin') ? RoutePaths.AdminBlogs : RoutePaths.CreatorBlogs;
  const blogEditPath = pathname.startsWith('/admin') ? '/admin/blogs/edit' : '/creator/blogs/edit';

  const isAutoSavingRef = useRef(false);

  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [postDetail, setPostDetail] = useState<BlogPostAdminDetailDTO | null>(null);
  const [formData, setFormData] = useState({ title: '', slug: '', summary: '' });
  const [markdownText, setMarkdownText] = useState('');
  const [assets, setAssets] = useState<BlogAssetDTO[]>([]);

  useEffect(() => {
    if (!isNew && postId) {
      if (isAutoSavingRef.current) {
        isAutoSavingRef.current = false;
        return;
      }
      fetchPostDetail(postId, true);
    }
  }, [isNew, postId]);

  const fetchPostDetail = async (targetId: number, updateForm: boolean = true) => {
    try {
      setLoading(true);
      const res = await getAdminPostDetail(targetId);
      setPostDetail(res);
      if (updateForm) {
        setFormData({
          title: res.title,
          slug: res.slug,
          summary: res.summary || '',
        });
        setMarkdownText(res.contentMarkdown || '');
      }
      const assetsRes = await getAssets(targetId);
      setAssets(assetsRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (!formData.title) {
      alert('文章标题不能为空');
      return;
    }
    try {
      setLoading(true);

      let currentSlug = formData.slug;
      if (!currentSlug) {
        const base = formData.title
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
          .replace(/(^-|-$)/g, '');
        currentSlug = base ? `${base}-${Date.now().toString(36).slice(-4)}` : `post-${Date.now().toString(36)}`;
      }

      const submitData = { ...formData, slug: currentSlug };
      let finalTargetId = postId;

      // 1. Save Metadata
      if (!isNew && finalTargetId) {
        await updateMetadata(finalTargetId, submitData);
      } else {
        const res = await createDraft(submitData);
        finalTargetId = res.id;
      }

      // 2. Save Markdown Text as File
      if (finalTargetId) {
        const file = new File([markdownText], 'content.md', { type: 'text/markdown' });
        await uploadContentMarkdown(finalTargetId, file);
      }

      // Refresh state or navigate
      if (isNew && finalTargetId) {
        isAutoSavingRef.current = true;
        navigate(`${blogEditPath}/${finalTargetId}`, { replace: true });
        await fetchPostDetail(finalTargetId, false);
      } else if (finalTargetId) {
        await fetchPostDetail(finalTargetId, false);
      }

      alert('保存成功！');
    } catch (e) {
      console.error(e);
      alert('保存失败，请查看控制台');
    } finally {
      setLoading(false);
    }
  };

  const handleImportMarkdown = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setMarkdownText(event.target.result as string);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  const autoCreateDraft = async (): Promise<number | null> => {
    try {
      setLoading(true);
      const tempTitle = formData.title || '无标题草稿';
      let currentSlug = formData.slug;
      if (!currentSlug) {
        const base = tempTitle
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
          .replace(/(^-|-$)/g, '');
        currentSlug = base ? `${base}-${Date.now().toString(36).slice(-4)}` : `post-${Date.now().toString(36)}`;
      }

      const submitData = { ...formData, title: tempTitle, slug: currentSlug };
      const res = await createDraft(submitData);

      // Save markdown immediately to prevent data loss
      if (markdownText) {
        const file = new File([markdownText], 'content.md', { type: 'text/markdown' });
        await uploadContentMarkdown(res.id, file);
      }

      isAutoSavingRef.current = true;
      navigate(`${blogEditPath}/${res.id}`, { replace: true });
      setFormData((prev) => ({ ...prev, title: tempTitle, slug: currentSlug }));
      setPostDetail(res);
      return res.id;
    } catch (e) {
      console.error(e);
      alert('自动创建草稿失败，请先手动填写标题并保存。');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let targetId = postDetail?.id || postId;
    if (!targetId) {
      targetId = await autoCreateDraft();
      if (!targetId) return;
    }

    try {
      setLoading(true);
      const thumbnail = await createBlogCoverThumbnail(file);
      await uploadAsset(targetId, 'COVER', thumbnail);
      await fetchPostDetail(targetId, false);
    } catch (error) {
      console.error(error);
      alert('封面压缩或上传失败，请确认图片文件可正常打开。');
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleUploadContentImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let targetId = postDetail?.id || postId;
    if (!targetId) {
      targetId = await autoCreateDraft();
      if (!targetId) return;
    }

    try {
      setLoading(true);
      await uploadAsset(targetId, 'CONTENT_IMAGE', file);
      const assetsRes = await getAssets(targetId);
      setAssets(assetsRes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDeleteAsset = async (assetId: number) => {
    const targetId = postDetail?.id || postId;
    if (!targetId || !window.confirm('确定要删除这个资源吗？删除后将无法恢复。')) return;
    try {
      setLoading(true);
      await deleteAsset(targetId, assetId);
      const assetsRes = await getAssets(targetId);
      setAssets(assetsRes);
      const deletedAsset = assets.find((a) => a.id === assetId);
      if (deletedAsset?.assetType === 'COVER') {
        await fetchPostDetail(targetId);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublishToggle = async () => {
    if (!postDetail) return;
    try {
      setLoading(true);
      if (postDetail.status === 'PUBLISHED') {
        const res = await unpublishPost(postDetail.id);
        setPostDetail(res);
      } else {
        const res = await publishPost(postDetail.id);
        setPostDetail(res);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const targetId = postDetail?.id || postId;
    if (!targetId || !window.confirm('确定要彻底删除这篇文章吗？操作不可撤销。')) return;
    try {
      setLoading(true);
      await deletePost(targetId);
      navigate(blogListPath);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('h-screen flex flex-col font-sans overflow-hidden', 'bg-bg-base text-text-main')}>
      {/* Top Navbar */}
      <header
        className={cn(
          'shrink-0 flex h-16 items-center justify-between border-b border-border-subtle bg-bg-base/90 px-6  z-20 transition-colors',
        )}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(blogListPath)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md bg-surface-soft text-text-main/65 transition-colors hover:bg-surface-card hover:text-primary',
            )}
            title="返回文章列表"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <LayoutTemplate size={16} className="text-primary" />
            <h1 className="mono-label text-text-main/70">{isNew ? '撰写新文章' : '编辑文章'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-md bg-surface-soft px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-main/65 transition-colors hover:bg-surface-card hover:text-text-main',
            )}
            title="导入本地 .md 文件"
          >
            <Upload size={14} />
            导入文档
            <input
              type="file"
              accept=".md,.markdown"
              className="hidden"
              onChange={handleImportMarkdown}
              disabled={loading}
            />
          </label>

          <button
            onClick={() => setShowCoverModal(true)}
            className={cn(
              'flex items-center gap-1.5 rounded-md bg-surface-soft px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-main/65 transition-colors hover:bg-surface-card hover:text-text-main',
            )}
            title="设置文章封面"
          >
            <ImageIcon size={14} />
            封面图
          </button>

          <button
            onClick={() => setShowImagesModal(true)}
            className={cn(
              'flex items-center gap-1.5 rounded-md bg-surface-soft px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-main/65 transition-colors hover:bg-surface-card hover:text-text-main',
            )}
            title="管理文章插图"
          >
            <ImageIcon size={14} />
            正文图
          </button>

          <button
            onClick={handleSaveAll}
            disabled={loading || !formData.title}
            className={cn(
              'flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-soft px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:border-primary/30 hover:bg-surface-card disabled:opacity-50',
            )}
          >
            <Save size={14} />
            {loading ? '保存中...' : '保存修改'}
          </button>

          {postDetail && (
            <div className="flex items-center gap-3 border-l pl-4 border-black/10 dark:border-white/10">
              <span
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider',
                  postDetail.status === 'PUBLISHED'
                    ? 'border border-success/20 text-success dark:text-success'
                    : 'border border-yellow-500/25 text-yellow-700 dark:text-yellow-400',
                )}
              >
                {postDetail.status === 'PUBLISHED' ? <Globe size={10} /> : <Lock size={10} />}
                {postDetail.status === 'PUBLISHED' ? '已发布' : '草稿'}
              </span>
              <button
                onClick={handlePublishToggle}
                disabled={loading || !postDetail.contentObjectKey}
                className={cn(
                  'rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50',
                  postDetail.status === 'PUBLISHED'
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : 'bg-success hover:bg-success/85',
                )}
              >
                {postDetail.status === 'PUBLISHED' ? '下架文章' : '发布文章'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Single-column live Markdown canvas */}
      <main className="flex-1 overflow-y-auto bg-bg-base custom-scrollbar">
        <div className="mx-auto flex w-full max-w-[900px] flex-col px-4 py-8 sm:px-8 md:px-12 md:py-12">
          {/* Meta Data Inputs */}
          <div className="mb-8 space-y-4">
            <input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={cn(
                'w-full text-3xl font-extrabold bg-transparent outline-none placeholder-opacity-40 transition-colors',
                'placeholder:text-text-main/30',
              )}
              placeholder="在此输入文章标题..."
            />
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              rows={2}
              className={cn(
                'w-full text-sm bg-transparent outline-none resize-none opacity-80 leading-relaxed placeholder-opacity-40',
                'placeholder:text-text-main/35',
              )}
              placeholder="撰写一小段简介，吸引读者阅读 (选填)..."
            />
          </div>

          <div className="relative flex min-h-[500px] flex-1 flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 opacity-50 text-xs font-bold uppercase tracking-widest">
                <FileText size={14} />
                <span>Markdown 实时编辑</span>
              </div>
            </div>
            {!markdownText && (
              <button
                type="button"
                onClick={() => setMarkdownText('开始写作...')}
                className="mb-2 min-h-24 w-full rounded-md border border-dashed border-border-subtle text-left text-sm text-muted-soft transition-colors hover:border-primary/35 hover:text-text-secondary"
              >
                点击这里开始写作，内容会在同一列实时渲染
              </button>
            )}
            <LiveMarkdownEditor
              value={markdownText}
              onChange={setMarkdownText}
              docKey={`blog-${postId ?? 'new'}`}
              onSave={handleSaveAll}
            />
          </div>
        </div>
      </main>

      {/* Cover Modal */}
      {showCoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 xl:p-0">
          <div className="absolute inset-0 bg-black/50 " onClick={() => setShowCoverModal(false)} />
          <div
            className={cn(
              'relative w-full max-w-md rounded-2xl  overflow-hidden flex flex-col',
              darkMode ? 'bg-[#1f1f1f]' : 'bg-white',
            )}
          >
            <div className="flex items-center justify-between p-6 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className={darkMode ? 'text-primary' : 'text-primary'} />
                <h2 className="text-lg font-bold">文章封面</h2>
              </div>
              <button
                onClick={() => setShowCoverModal(false)}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-surface-card transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
              <label
                className={cn(
                  'group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 cursor-pointer',
                  darkMode
                    ? 'border-[#3a3a3a] bg-[#1f1f1f] hover:border-primary'
                    : 'border-border-subtle bg-surface-soft hover:border-primary',
                )}
              >
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  className="hidden"
                  onChange={handleUploadCover}
                  disabled={loading}
                />
                {postDetail?.coverAssetId && assets.find((a) => a.id === postDetail.coverAssetId)?.publicUrl ? (
                  <div className="absolute inset-0 rounded-xl overflow-hidden p-1 group/cover">
                    <img
                      src={assets.find((a) => a.id === postDetail.coverAssetId)?.publicUrl}
                      className="w-full h-full object-cover rounded-lg"
                      alt="Cover"
                    />
                    <div className="absolute inset-1 bg-black/50 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center rounded-lg  flex-col gap-2">
                      <Upload size={24} className="text-white" />
                      <span className="text-xs font-bold text-white">点击重新上传替换</span>
                    </div>
                  </div>
                ) : postDetail?.coverAssetId ? (
                  <div className="absolute inset-0 rounded-xl overflow-hidden p-1">
                    <div className="w-full h-full bg-black/5 dark:bg-surface-card rounded-lg flex items-center justify-center flex-col gap-2">
                      <CheckCircle size={32} className="text-success" />
                      <span className="text-sm font-bold text-success">已成功设置封面</span>
                      <span className="text-xs opacity-50 mt-1 hover:underline">点击重新上传替换</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <ImageIcon
                      size={32}
                      className={cn(
                        'mb-3 transition-transform group-hover:scale-110',
                        darkMode ? 'text-[#a6a6a6]' : 'text-text-main/40',
                      )}
                    />
                    <p className="text-sm font-bold">点击上传封面图</p>
                    <p className="text-xs opacity-50 mt-2">推荐尺寸 1200x630 (JPEG, PNG, WebP)</p>
                  </>
                )}
              </label>
              {postDetail && (
                <div className="mt-8 pt-6 border-t border-black/10 dark:border-white/10 flex justify-end">
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-error hover:bg-error/10 transition-colors"
                  >
                    <Trash size={14} /> 彻底删除该文章
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Images Modal */}
      {showImagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 xl:p-0">
          <div className="absolute inset-0 bg-black/50 " onClick={() => setShowImagesModal(false)} />
          <div
            className={cn(
              'relative w-full max-w-lg rounded-2xl  overflow-hidden flex flex-col max-h-[85vh]',
              darkMode ? 'bg-[#1f1f1f]' : 'bg-white',
            )}
          >
            <div className="flex items-center justify-between p-6 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className={darkMode ? 'text-primary' : 'text-primary'} />
                <h2 className="text-lg font-bold">文章内插图</h2>
              </div>
              <button
                onClick={() => setShowImagesModal(false)}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-surface-card transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 md:p-8 flex-1 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs opacity-60">图片上传后点击复制，即可粘贴至正文</p>
                <label
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ',
                    darkMode
                      ? 'bg-primary border-primary text-white hover:bg-primary-active'
                      : 'bg-primary border-primary text-white hover:bg-primary/90',
                  )}
                >
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    className="hidden"
                    onChange={handleUploadContentImage}
                    disabled={loading}
                  />
                  <Upload size={14} />
                  上传新图片
                </label>
              </div>

              {assets.filter((a) => a.assetType === 'CONTENT_IMAGE').length === 0 ? (
                <div
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed py-12',
                    darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]/50' : 'border-border-subtle bg-surface-soft/50',
                  )}
                >
                  <ImageIcon size={24} className="opacity-20 mb-2" />
                  <span className="text-xs font-bold opacity-40 uppercase tracking-widest">还没有插图，快去上传吧</span>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                  {assets
                    .filter((a) => a.assetType === 'CONTENT_IMAGE')
                    .map((asset) => (
                      <div
                        key={asset.id}
                        className={cn(
                          'group flex items-center justify-between gap-3 rounded-xl border p-2.5 transition-colors',
                          darkMode
                            ? 'border-[#3a3a3a] bg-[#1f1f1f] hover:border-[#4a4a4a]'
                            : 'border-border-subtle bg-surface-soft hover:border-border-medium',
                        )}
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black/5 border border-black/5 dark:border-white/5">
                          <img
                            src={asset.publicUrl}
                            alt={asset.originalFilename}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{asset.originalFilename}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => copyToClipboard(`![${asset.originalFilename}](${asset.publicUrl})`)}
                            className={cn(
                              'flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors text-xs font-bold',
                              darkMode
                                ? 'bg-[#3a3a3a] hover:bg-primary hover:text-white'
                                : 'bg-white border hover:bg-primary hover:text-white hover:border-primary',
                            )}
                            title="复制 Markdown 代码"
                          >
                            <Copy size={12} /> 复制代码
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1.5 rounded-md text-error transition-colors hover:bg-error/10"
                            title="删除"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
