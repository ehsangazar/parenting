import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams , Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { articleApi } from '../lib/articleApi.js';
import { Article, ArticleCategory } from '../types/Articles.js';
import { PublicSiteHeader } from '../components/PublicSiteHeader.js';
import { PublicFooter } from '../components/PublicFooter.js';
import { SEO } from '../components/SEO.js';
import { LazyImage } from '../components/ui/LazyImage.js';

export const ArticleListPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 6;

  const selectedCategoryId = searchParams.get('category');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesRes = await articleApi.getCategories();
        setCategories(categoriesRes);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, [i18n.language]);

  useEffect(() => {
    const fetchInitialArticles = async () => {
      setLoading(true);
      setOffset(0);
      try {
        const articlesRes = await articleApi.getPublicArticles({
          categoryId: selectedCategoryId || undefined,
          limit: LIMIT,
          offset: 0
        });
        setArticles(articlesRes.articles);
        setTotal(articlesRes.total);
      } catch (error) {
        console.error('Failed to fetch articles:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialArticles();
  }, [selectedCategoryId, i18n.language]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    
    const nextOffset = offset + LIMIT;
    setLoadingMore(true);
    try {
      const articlesRes = await articleApi.getPublicArticles({ 
        categoryId: selectedCategoryId || undefined,
        limit: LIMIT,
        offset: nextOffset
      });
      setArticles(prev => [...prev, ...articlesRes.articles]);
      setOffset(nextOffset);
    } catch (error) {
      console.error('Failed to load more articles:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCategoryClick = (id: string | null) => {
    if (id) {
      setSearchParams({ category: id });
    } else {
      setSearchParams({});
    }
  };

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);
  const pageTitle = activeCategory
    ? t('articleList.seoTitleWithCategory', { category: activeCategory.name })
    : t('articleList.seoTitleDefault');
  const pageDescription = activeCategory
    ? t('articleList.seoDescriptionCategory', { category: activeCategory.name })
    : t('articleList.seoDescriptionDefault');
  const dateLocale = i18n.language === 'fa' ? 'fa-IR' : 'en-GB';

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <SEO 
        title={pageTitle}
        description={pageDescription}
        canonical={selectedCategoryId ? `/articles?category=${selectedCategoryId}` : '/articles'}
      />
      <PublicSiteHeader />

      {/* Hero Section */}
      <section className="bg-surface border-b border-border-light py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl font-semibold leading-tight text-text-primary md:text-5xl">
              {t('articleList.heroTitleBefore')}{' '}
              <span className="text-primary-600">{t('articleList.heroTitleHighlight')}</span>
              {t('articleList.heroTitleAfter')}
            </h1>
            <p className="mt-4 text-lg text-text-secondary leading-relaxed">
              {t('articleList.heroSubtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-24">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-tertiary mb-6">
                <Icon name={uiIcons.filter} className="h-4 w-4" alt="" /> {t('articleList.categoriesHeading')}
              </h2>
              <div className="space-y-1">
                <button
                  onClick={() => handleCategoryClick(null)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    !selectedCategoryId ? 'bg-primary-100 text-primary-700 shadow-sm' : 'text-text-secondary hover:bg-primary-50'
                  }`}
                >
                  {t('articleList.allArticles')}
                </button>
                {categories.map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <button
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        selectedCategoryId === cat.id ? 'bg-primary-100 text-primary-700 shadow-sm' : 'text-text-secondary hover:bg-primary-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                    {cat.children && cat.children.length > 0 && selectedCategoryId && (cat.id === selectedCategoryId || cat.children.some(child => child.id === selectedCategoryId)) && (
                      <div className="ml-4 pl-2 border-l border-primary-100 space-y-1 overflow-hidden">
                        {cat.children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => handleCategoryClick(child.id)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              selectedCategoryId === child.id ? 'text-primary-600' : 'text-text-tertiary hover:text-primary-500'
                            }`}
                          >
                            {child.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Article Grid */}
          <div className="flex-1">
            {!loading && articles.length > 0 && (
              <div className="mb-6 flex items-center justify-between border-b border-border-light pb-4">
                <span className="text-sm font-medium text-text-tertiary">
                  {t('articleList.showingCount', { shown: articles.length, total })}
                </span>
              </div>
            )}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-surface rounded-3xl h-80 border border-border-light shadow-sm" />
                ))}
              </div>
            ) : articles.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {articles.map((article, index) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group cursor-pointer bg-surface rounded-3xl border border-border-light shadow-sm overflow-hidden hover:shadow-xl hover:border-primary-200 transition-all duration-300 flex flex-col"
                      onClick={() => navigate(`/articles/${article.slug}`)}
                    >
                      <div className="aspect-video bg-primary-50 relative overflow-hidden">
                        {article.coverImage ? (
                          <LazyImage src={article.coverImage} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" containerClassName="w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon name={uiIcons.bookOpen} className="h-12 w-12 opacity-40" alt="" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4">
                          <span className="bg-surface-light/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary-700 shadow-sm">
                            {article.category?.name || t('articleList.categoryFallback')}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <h3 className="font-display text-xl font-semibold text-text-primary group-hover:text-primary-600 transition-colors">
                          {article.title}
                        </h3>
                        <p className="mt-3 text-sm text-text-secondary leading-relaxed line-clamp-3">
                          {article.excerpt}
                        </p>
                        <div className="mt-auto pt-6 flex items-center justify-between">
                          <span className="text-xs text-text-tertiary flex items-center gap-1">
                             {new Date(article.createdAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-primary-600 text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            {t('articles.readMore')} <Icon name={uiIcons.chevronRight} className="h-4 w-4" alt="" />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {total > articles.length && (
                  <div className="mt-12 text-center">
                    <button 
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="btn-duo-outline-pill-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? t('articleList.loadingMore') : t('articleList.loadMore')}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-border-light">
                <Icon name={uiIcons.bookOpen} className="mx-auto mb-4 h-12 w-12 opacity-50" alt="" />
                <h3 className="text-lg font-semibold text-text-primary">{t('articles.noArticles')}</h3>
                <p className="text-text-secondary mt-2">{t('articleList.emptyHint')}</p>
                <button onClick={() => handleCategoryClick(null)} className="mt-6 text-primary-600 font-bold hover:underline">
                  {t('articleList.viewAllArticles')}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
