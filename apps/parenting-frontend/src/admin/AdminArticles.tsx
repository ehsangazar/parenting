import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { articleApi } from '../lib/articleApi.js';
import { Article, ArticleCategory } from '../types/Articles.js';
import { toast } from 'sonner';
import { clsx } from 'clsx';

export const AdminArticles = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [articlesRes, categoriesRes] = await Promise.all([
        articleApi.getAdminArticles({ limit: LIMIT, offset: page * LIMIT }),
        articleApi.getCategories()
      ]);
      setArticles(articlesRes.articles);
      setTotal(articlesRes.total);
      setCategories(categoriesRes);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = () => {
    setEditingArticle({
      title: '',
      slug: '',
      content: '',
      published: false,
      actions: [],
      media: [],
    });
    setIsEditing(true);
  };

  const handleEdit = (article: Article) => {
    setEditingArticle({
      ...article,
      actions: article.actions || [],
      media: article.media || [],
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      await articleApi.deleteArticle(id);
      toast.success('Article deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete article');
    }
  };

  const togglePublished = async (article: Article) => {
    try {
      await articleApi.updateArticle(article.id, { published: !article.published });
      toast.success(`Article ${!article.published ? 'published' : 'moved to drafts'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await articleApi.createCategory({ name: newCategoryName, slug: newCategoryName.toLowerCase().replace(/\s+/g, '-') });
      toast.success('Category created');
      setNewCategoryName('');
      fetchData();
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  const addAction = () => {
    setEditingArticle(prev => ({
      ...prev,
      actions: [...(prev?.actions || []), { label: '', actionType: 'link', url: '', position: (prev?.actions?.length || 0) }]
    }));
  };

  const removeAction = (index: number) => {
    setEditingArticle(prev => ({
      ...prev,
      actions: prev?.actions?.filter((_, i) => i !== index)
    }));
  };

  const addMedia = () => {
    setEditingArticle(prev => ({
      ...prev,
      media: [...(prev?.media || []), { type: 'video', s3Key: '', position: (prev?.media?.length || 0) }]
    }));
  };

  const removeMedia = (index: number) => {
    setEditingArticle(prev => ({
      ...prev,
      media: prev?.media?.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;

    try {
      const data = { ...editingArticle };
      if (!data.categoryId) delete data.categoryId;
      
      if (editingArticle.id) {
        await articleApi.updateArticle(editingArticle.id, data);
        toast.success('Article updated');
      } else {
        await articleApi.createArticle(data);
        toast.success('Article created');
      }
      setIsEditing(false);
      setEditingArticle(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save article');
    }
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           article.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'published' ? article.published : !article.published);
      const matchesCategory = categoryFilter === 'all' || article.categoryId === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [articles, searchQuery, statusFilter, categoryFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-brand-blue/40 bg-brand-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-blue">
            Editorial Workspace
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Content Center</h1>
            {!loading && (
              <span className="mt-1 inline-flex items-center rounded-md bg-brand-blue/10 px-2 py-1 text-xs font-bold text-brand-blue ring-1 ring-inset ring-brand-blue/20">
                {total} Articles
              </span>
            )}
          </div>
          <p className="text-text-secondary font-medium italic">Manage news, articles, and educational resources</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const result = await articleApi.translateAll('fa');
                toast.success(`Queued ${result.queued} article(s) for FA translation`);
              } catch {
                toast.error('Translation queue failed');
              }
            }}
            className="btn-duo-outline-sm !px-4 !text-xs"
          >
            <Icon name={uiIcons.globe} className="h-4 w-4" alt="" /> Translate All (FA)
          </button>
          <button
            onClick={handleCreate}
            className="btn-duo-blue-sm !px-5"
          >
            <Icon name={uiIcons.plus} className="h-5 w-5" alt="" /> Create New Article
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Icon name={uiIcons.search} className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" alt="" />
          <input 
            type="text" 
            placeholder="Search by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-surface-light border-none rounded-xl text-sm focus:ring-2 focus:ring-border-focus transition-all outline-none font-medium"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
            className="bg-surface-light border-none rounded-xl px-4 py-2.5 text-sm font-bold text-text-secondary focus:ring-2 focus:ring-border-focus outline-none appearance-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>

          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-surface-light border-none rounded-xl px-4 py-2.5 text-sm font-bold text-text-secondary focus:ring-2 focus:ring-border-focus outline-none appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <button 
            onClick={() => setIsManagingCategories(true)}
            className="p-2.5 bg-surface border border-border rounded-xl text-text-tertiary hover:text-brand-blue hover:border-brand-blue/25 transition-all shadow-sm"
            title="Manage Categories"
          >
            <Icon name={uiIcons.filter} className="h-5 w-5" alt="" />
          </button>
        </div>
      </div>

      {/* Articles List */}
      <div className="bg-surface rounded-[32px] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-light/50 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Article Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence mode='popLayout'>
                {filteredArticles.map((article) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={article.id} 
                    className="group hover:bg-surface-light transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center text-text-tertiary shrink-0 border border-border shadow-sm">
                          <Icon name={uiIcons.fileText} className="h-5 w-5" alt="" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text-primary truncate line-clamp-1">{article.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-text-tertiary font-bold uppercase mt-1">
                            <Icon name={uiIcons.link} className="h-3 w-3" alt="" /> /{article.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 bg-surface-light rounded-full text-[10px] font-black uppercase text-text-secondary border border-border">
                        {article.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => togglePublished(article)}
                          className={clsx(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border transition-all",
                            article.published 
                              ? "bg-success/10 text-success border-success/30 hover:bg-success/15" 
                              : "bg-surface-light text-text-tertiary border-border hover:bg-surface-warm"
                          )}
                        >
                          {article.published ? (
                            <Icon name={uiIcons.check} className="h-3 w-3" alt="" />
                          ) : (
                            <Icon name={uiIcons.pencil} className="h-3 w-3" alt="" />
                          )}
                          {article.published ? 'Published' : 'Draft'}
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <a
                          href={`/articles/${article.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-text-tertiary hover:text-brand-blue hover:bg-brand-blue/10 rounded-xl transition border border-border hover:border-brand-blue/25 shadow-sm bg-surface"
                          title="Preview"
                        >
                          <Icon name={uiIcons.eye} className="h-5 w-5" alt="" />
                        </a>
                        <button
                          onClick={() => handleEdit(article)}
                          className="p-2 text-text-tertiary hover:text-brand-blue hover:bg-brand-blue/10 rounded-xl transition border border-border hover:border-brand-blue/25 shadow-sm bg-surface"
                          title="Edit"
                        >
                          <Icon name={uiIcons.pencil} className="h-5 w-5" alt="" />
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="p-2 text-text-tertiary hover:text-error hover:bg-error/10 rounded-xl transition border border-border hover:border-red-100 shadow-sm bg-surface"
                          title="Delete"
                        >
                          <Icon name={uiIcons.trash} className="h-5 w-5" alt="" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {filteredArticles.length === 0 && !loading && (
            <div className="text-center py-24 bg-surface-light/50">
              <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-border shadow-sm text-text-dimmed">
                <Icon name={uiIcons.fileText} className="h-10 w-10" alt="" />
              </div>
              <h3 className="text-xl font-bold text-text-primary">No articles found</h3>
              <p className="text-text-secondary font-medium mt-1">Adjust your filters or start fresh</p>
              <button 
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); }}
                className="mt-6 px-6 py-2 bg-surface border border-border rounded-xl text-sm font-bold text-brand-blue hover:bg-surface-light transition-colors shadow-sm"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="px-8 py-5 bg-surface-light/50 border-t border-border flex items-center justify-between">
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">
              Showing {page * LIMIT + 1}-{Math.min((page + 1) * LIMIT, total)} of {total} Articles
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-text-secondary hover:bg-surface-light disabled:opacity-50 transition-all shadow-sm"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(total / LIMIT) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={clsx(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      page === i 
                        ? "bg-brand-blue text-white shadow-lg shadow-md" 
                        : "bg-surface text-text-secondary hover:bg-surface-light border border-border"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={(page + 1) * LIMIT >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-text-secondary hover:bg-surface-light disabled:opacity-50 transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit/Create Drawer Overlay */}
      <AnimatePresence>
        {isEditing && editingArticle && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-surface-light w-full max-w-4xl h-full shadow-2xl flex flex-col border-l border-border"
            >
              <div className="sticky top-0 z-10 px-6 py-5 md:px-8 border-b border-border flex justify-between items-start bg-surface/95 backdrop-blur-md">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-text-primary tracking-tight">
                    {editingArticle.id ? 'Refine Article' : 'Compose Article'}
                  </h2>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">Content Editor</p>
                    <span className={clsx(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-full border",
                      editingArticle.published
                        ? "text-success bg-success/10 border-emerald-200"
                        : "text-amber-700 bg-amber-50 border-amber-200"
                    )}>
                      {editingArticle.published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-surface-light rounded-full transition border border-border text-text-secondary shrink-0"
                >
                  <Icon name={uiIcons.close} className="h-6 w-6" alt="" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-6 rounded-3xl border border-border bg-surface p-5 md:p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-text-secondary">Core Details</h3>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Article Title</label>
                      <input
                        type="text"
                        required
                        value={editingArticle.title}
                        onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                        className="w-full px-5 py-3.5 rounded-2xl bg-surface-light border-none focus:ring-2 focus:ring-border-focus transition-all font-bold text-text-primary"
                        placeholder="E.g. Surviving the First Trimester"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">URL Slug</label>
                        <input
                          type="text"
                          required
                          value={editingArticle.slug}
                          onChange={(e) => setEditingArticle({ ...editingArticle, slug: e.target.value })}
                          className="w-full px-5 py-3.5 rounded-2xl bg-surface-light border-none focus:ring-2 focus:ring-border-focus transition-all font-bold text-text-secondary text-sm"
                          placeholder="surviving-first-trimester"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Cover Image (S3 Key)</label>
                        <input
                          type="text"
                          value={editingArticle.coverImage || ''}
                          onChange={(e) => setEditingArticle({ ...editingArticle, coverImage: e.target.value })}
                          className="w-full px-5 py-3.5 rounded-2xl bg-surface-light border-none focus:ring-2 focus:ring-border-focus transition-all font-bold text-text-secondary text-sm"
                          placeholder="articles/banner.jpg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 rounded-3xl border border-border bg-surface p-5 md:p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-text-secondary">Classification & Visibility</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Classification</label>
                        <select
                          value={editingArticle.categoryId || ''}
                          onChange={(e) => setEditingArticle({ ...editingArticle, categoryId: e.target.value })}
                          className="w-full px-5 py-3.5 rounded-2xl bg-surface-light border-none focus:ring-2 focus:ring-border-focus transition-all font-bold text-text-secondary text-sm appearance-none"
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <optgroup key={cat.id} label={cat.name}>
                              <option value={cat.id}>{cat.name} (Main)</option>
                              {cat.children?.map(child => (
                                <option key={child.id} value={child.id}>{child.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-brand-blue/10 border border-brand-blue/25 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-brand-blue">Visibility Status</p>
                        <p className="text-[10px] font-medium text-brand-blue">Toggle whether this article is public</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editingArticle.published}
                          onChange={(e) => setEditingArticle({ ...editingArticle, published: e.target.checked })}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-surface-warm peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-text-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-dark after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-6 rounded-3xl border border-border bg-surface p-5 md:p-6 shadow-sm xl:col-span-2">
                    <h3 className="text-sm font-bold text-text-secondary">Search & Metadata</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">SEO Title</label>
                        <input
                          type="text"
                          value={editingArticle.seoTitle || ''}
                          onChange={(e) => setEditingArticle({ ...editingArticle, seoTitle: e.target.value })}
                          className="w-full px-5 py-3.5 rounded-2xl bg-surface-light border-none focus:ring-2 focus:ring-border-focus transition-all font-bold text-text-secondary text-sm"
                          placeholder="Custom search title..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">SEO Keywords</label>
                        <input
                          type="text"
                          value={editingArticle.seoKeywords || ''}
                          onChange={(e) => setEditingArticle({ ...editingArticle, seoKeywords: e.target.value })}
                          className="w-full px-5 py-3.5 rounded-2xl bg-surface-light border-none focus:ring-2 focus:ring-border-focus transition-all font-bold text-text-secondary text-sm"
                          placeholder="parenting, health, baby..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">SEO Description</label>
                      <textarea
                        value={editingArticle.seoDescription || ''}
                        onChange={(e) => setEditingArticle({ ...editingArticle, seoDescription: e.target.value })}
                        className="w-full px-5 py-3.5 rounded-2xl bg-surface-light border-none focus:ring-2 focus:ring-border-focus transition-all font-medium text-text-secondary h-[60px] resize-none text-xs"
                        placeholder="Snippet for search engine results..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Public Excerpt</label>
                      <textarea
                        value={editingArticle.excerpt || ''}
                        onChange={(e) => setEditingArticle({ ...editingArticle, excerpt: e.target.value })}
                        className="w-full px-5 py-3.5 rounded-2xl bg-surface-light border-none focus:ring-2 focus:ring-border-focus transition-all font-medium text-text-secondary h-[60px] resize-none"
                        placeholder="A short summary for list views..."
                      />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-brand-blue uppercase tracking-widest ml-1">Embedded Media (Video/Image/Audio)</label>
                        <button type="button" onClick={addMedia} className="text-[10px] font-black uppercase text-brand-blue hover:text-brand-blue">+ Add Media</button>
                      </div>
                      <div className="space-y-3">
                        {editingArticle.media?.map((m, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-surface-light p-3 rounded-2xl border border-border">
                            <select 
                              value={m.type}
                              onChange={(e) => {
                                const newMedia = [...(editingArticle.media || [])];
                                newMedia[idx].type = e.target.value as 'video' | 'image' | 'audio';
                                setEditingArticle({ ...editingArticle, media: newMedia });
                              }}
                              className="bg-surface border-none rounded-xl px-3 py-2 text-xs font-bold text-text-secondary outline-none"
                            >
                              <option value="video">Video</option>
                              <option value="image">Image</option>
                              <option value="audio">Audio</option>
                            </select>
                            <input 
                              type="text" 
                              value={m.s3Key}
                              onChange={(e) => {
                                const newMedia = [...(editingArticle.media || [])];
                                newMedia[idx].s3Key = e.target.value;
                                setEditingArticle({ ...editingArticle, media: newMedia });
                              }}
                              placeholder="S3 Key or URL"
                              className="flex-1 bg-surface border-none rounded-xl px-4 py-2 text-xs font-medium outline-none"
                            />
                            <button type="button" onClick={() => removeMedia(idx)} className="text-error400 hover:text-error px-2 transition-colors"><Icon name={uiIcons.trash} className="h-4 w-4" alt="" /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-success uppercase tracking-widest ml-1">Interactive Actions</label>
                        <button type="button" onClick={addAction} className="text-[10px] font-black uppercase text-success hover:text-success">+ Add Action</button>
                      </div>
                      <div className="space-y-3">
                        {editingArticle.actions?.map((a, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-surface-light p-3 rounded-2xl border border-border">
                            <input 
                              type="text" 
                              value={a.label}
                              onChange={(e) => {
                                const newActions = [...(editingArticle.actions || [])];
                                newActions[idx].label = e.target.value;
                                setEditingArticle({ ...editingArticle, actions: newActions });
                              }}
                              placeholder="Button Label"
                              className="flex-1 bg-surface border-none rounded-xl px-4 py-2 text-xs font-medium outline-none"
                            />
                            <select 
                              value={a.actionType}
                              onChange={(e) => {
                                const newActions = [...(editingArticle.actions || [])];
                                newActions[idx].actionType = e.target.value as 'link' | 'calendar' | 'milestone';
                                setEditingArticle({ ...editingArticle, actions: newActions });
                              }}
                              className="bg-surface border-none rounded-xl px-3 py-2 text-xs font-bold text-text-secondary outline-none"
                            >
                              <option value="link">Link</option>
                              <option value="calendar">Calendar</option>
                              <option value="milestone">Milestone</option>
                            </select>
                            <input 
                              type="text" 
                              value={a.url || ''}
                              onChange={(e) => {
                                const newActions = [...(editingArticle.actions || [])];
                                newActions[idx].url = e.target.value;
                                setEditingArticle({ ...editingArticle, actions: newActions });
                              }}
                              placeholder="URL / ID"
                              className="flex-1 bg-surface border-none rounded-xl px-4 py-2 text-xs font-medium outline-none"
                            />
                            <button type="button" onClick={() => removeAction(idx)} className="text-error400 hover:text-error px-2 transition-colors"><Icon name={uiIcons.trash} className="h-4 w-4" alt="" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Meta Insights (AI Summaries)</label>
                        <textarea
                          value={editingArticle.aiSummary || ''}
                          onChange={(e) => setEditingArticle({ ...editingArticle, aiSummary: e.target.value })}
                          className="w-full px-5 py-3.5 rounded-2xl bg-surface-light border-none focus:ring-2 focus:ring-border-focus transition-all font-medium text-text-secondary h-[80px] resize-none text-xs"
                          placeholder="• Bulleted key takeaways..."
                        />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-3xl border border-border bg-surface p-5 md:p-6 shadow-sm">
                  {editingArticle.coverImage && (
                    <div className="relative aspect-video max-h-[200px] w-full bg-surface-light rounded-[28px] overflow-hidden border border-border group">
                      <img 
                        src={editingArticle.coverImage.startsWith('http') ? editingArticle.coverImage : `https://raised-assets.s3.amazonaws.com/${editingArticle.coverImage}`} 
                        alt="Cover Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x400?text=Invalid+Image+Path';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-bold text-xs uppercase tracking-widest">Cover Image Preview</p>
                      </div>
                    </div>
                  )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Article Body (Markdown Supported)</label>
                        <span className="text-[10px] font-bold text-brand-blue flex items-center gap-1 cursor-help">
                          <Icon name={uiIcons.fileText} className="h-3 w-3" alt="" /> Markdown Tips
                        </span>
                      </div>
                      <textarea
                        required
                        value={editingArticle.content || ''}
                        onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                        className="w-full px-6 py-5 rounded-[28px] bg-surface-light border border-border focus:ring-2 focus:ring-border-focus transition-all font-mono text-sm text-text-primary min-h-[420px]"
                        placeholder="# Your epic story starts here..."
                      />
                    </div>
                  </div>
                </form>

              <div className="sticky bottom-0 z-10 px-6 py-4 md:px-8 border-t border-border bg-surface/95 backdrop-blur-md flex justify-between items-center gap-4">
                <div className="flex items-center gap-3 text-text-tertiary italic text-xs font-medium">
                  <Icon name={uiIcons.calendar} className="h-4 w-4" alt="" /> 
                  {editingArticle.id ? `Last modified today` : 'Unsaved draft'}
                </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn-duo-ghost-sm !px-5 !py-3 !font-semibold !normal-case !tracking-normal hover:!text-text-primary"
                    >
                      Discard Changes
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        if (!editingArticle) return;
                        setEditingArticle({ ...editingArticle, published: true });
                        setTimeout(() => handleSave(e as React.FormEvent), 0);
                      }}
                      className="btn-duo-outline-sm !border-emerald-200 !px-5 !py-3 !font-semibold !text-success hover:!bg-success/10 !normal-case !tracking-normal"
                    >
                      Save & Publish
                    </button>
                    <button
                      onClick={handleSave}
                      className="btn-duo-blue-sm !px-7 !py-3"
                    >
                      <Icon name={uiIcons.check} className="h-5 w-5" alt="" /> Save Changes
                    </button>
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Management Modal */}
      <AnimatePresence>
        {isManagingCategories && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl border border-border"
            >
              <div className="p-8 border-b border-border flex justify-between items-center bg-surface-light/50">
                <div>
                  <h2 className="text-2xl font-black text-text-primary tracking-tight">Manage Classifications</h2>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">Categories Directory</p>
                </div>
                <button 
                  onClick={() => setIsManagingCategories(false)}
                  className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-surface-light rounded-full transition border border-border text-text-secondary"
                >
                  <Icon name={uiIcons.close} className="h-6 w-6" alt="" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">New Category Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-5 py-3.5 rounded-2xl bg-surface-light border-none focus:ring-2 focus:ring-border-focus transition-all font-bold text-text-primary"
                      placeholder="E.g. Newborn Care"
                    />
                    <button 
                      onClick={handleCreateCategory}
                      className="btn-duo-blue !min-h-[52px] !rounded-2xl !px-6 !py-3.5"
                    >
                      <Icon name={uiIcons.plus} className="h-5 w-5" alt="" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Existing Categories</label>
                  <div className="grid gap-2">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-4 bg-surface-light rounded-2xl border border-border group">
                        <span className="font-bold text-text-secondary capitalize">{cat.name}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <code className="text-[10px] bg-surface px-2 py-1 rounded-lg border border-border text-text-tertiary">/{cat.slug}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-8 border-t border-border bg-surface-light/50 flex justify-end">
                <button 
                  onClick={() => setIsManagingCategories(false)}
                  className="btn-duo-surface-pill !rounded-2xl !px-8 !py-3"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
