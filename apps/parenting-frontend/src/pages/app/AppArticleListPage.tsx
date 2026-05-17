import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppBase } from '../../hooks/useAppBase.js';
import { motion } from 'framer-motion';
import { articleApi } from '../../lib/articleApi.js';
import { Article, ArticleCategory } from '../../types/Articles.js';
import { useAppContext } from '../../components/app/AppContext.js';
import { PageHeader } from '../../components/app/PageHeader.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { useAuth } from '../../state/auth.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { Icon } from '../../components/icons/index.js';
import { LazyImage } from '../../components/ui/LazyImage.js';

export const AppArticleListPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toApp } = useAppBase();
  const { activeFamily } = useAppContext();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const locale = i18n.language;
        const [articlesRes, categoriesRes] = await Promise.all([
          articleApi.getPublicArticles({
            categoryId: selectedCategoryId || undefined,
            limit: ITEMS_PER_PAGE,
            offset: (currentPage - 1) * ITEMS_PER_PAGE,
            locale,
          }),
          articleApi.getCategories({ locale }),
        ]);
        setArticles(articlesRes.articles);
        setTotalArticles(articlesRes.total);
        setCategories(categoriesRes);
      } catch (error) {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedCategoryId, currentPage, i18n.language]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(toApp('/app/chat'), { state: { prefillQuestion: `Can you find me articles or information about: ${searchTerm}` } });
    }
  };

  const totalPages = Math.ceil(totalArticles / ITEMS_PER_PAGE);

  const children = useMemo(() => activeFamily?.children ?? [], [activeFamily]);

  const getPersonalizationBadge = (article: Article) => {
    if (!children.length || !article.category) return null;

    const catSlug = article.category.slug;
    
    for (const child of children) {
      if (!child.birthday) continue;
      
      const birthDate = new Date(child.birthday);
      const ageMonths = Math.floor((new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      
      let relevant = false;
      if (catSlug === 'infants' && ageMonths < 12) relevant = true;
      else if (catSlug === 'toddlers' && ageMonths >= 12 && ageMonths < 36) relevant = true;
      else if (catSlug === 'preschoolers' && ageMonths >= 36 && ageMonths < 60) relevant = true;
      else if (catSlug === 'primary-school' && ageMonths >= 60 && ageMonths < 132) relevant = true;
      else if (catSlug === 'adolescence' && ageMonths >= 132) relevant = true;

      if (relevant) {
        return {
          label: t('page.articleRelevantFor', { name: child.name }),
          color: 'bg-primary-100 text-primary-fg'
        };
      }
    }
    return null;
  };

  return (
    <PageContainer verticalSpacing="normal" contentSpacing="none">
      <PageHeader
        title={t('nav.resources')}
        subtitle={t('page.articlesHubSubtitle')}
        iconName={appAssetIcons.resources}
        className="!mb-1"
      />

      {/* Search Bar */}
      <div className="pt-1 mb-4">
        <form onSubmit={handleSearchSubmit} className="relative group max-w-2xl">
          <div className="absolute inset-y-0 start-5 flex items-center pointer-events-none">
            <Icon name={uiIcons.search} className="w-5 h-5 object-contain opacity-50 transition-opacity group-focus-within:opacity-90" alt="" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('page.articlesSearchPlaceholder')}
            className="w-full bg-surface border border-border-light rounded-[24px] py-4 ps-14 pe-36 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all shadow-sm group-hover:shadow-md"
          />
          <button
            type="submit"
            className="absolute end-2 top-2 bottom-2 bg-primary-600 text-white px-6 rounded-2xl text-sm font-bold hover:bg-primary-700 transition-all shadow-sm"
          >
            {t('page.articlesAskAi')}
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-6">
        {/* Compact Category Filters */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => {
              setSelectedCategoryId(null);
              setCurrentPage(1);
            }}
            className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border ${
              !selectedCategoryId 
                ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-200' 
                : 'bg-surface border-border-light text-text-secondary hover:border-primary-200'
            }`}
          >
            {t('resourcesPage.allResources')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategoryId(cat.id);
                setCurrentPage(1);
              }}
              className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border ${
                selectedCategoryId === cat.id 
                  ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-200' 
                  : 'bg-surface border-border-light text-text-secondary hover:border-primary-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Article Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-surface rounded-[32px] h-80 border border-border-light" />
              ))}
            </div>
          ) : articles.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article, index) => {
                  const badge = getPersonalizationBadge(article);
                  return (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group cursor-pointer bg-surface rounded-[32px] border border-border-light shadow-sm overflow-hidden hover:shadow-xl hover:border-primary-200 hover:-translate-y-1 transition-all duration-300 flex flex-col"
                      onClick={() =>
                        navigate(toApp(`/app/resources/${article.slug}`))
                      }
                    >
                      {/* Article Image */}
                      {article.coverImage && (
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <LazyImage
                            src={article.coverImage}
                            alt={article.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            containerClassName="w-full h-full"
                          />
                          <div className="absolute top-4 left-4">
                            <span className="bg-surface-light/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                              {article.category ? t(`categories.${article.category.slug}`, { defaultValue: article.category.name }) : t('resourcesPage.resource')}
                            </span>
                          </div>
                          {badge && (
                            <div className="absolute top-4 right-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm opacity-90 ${badge.color}`}>
                                <Icon name={uiIcons.sparkles} className="w-3 h-3 object-contain" alt="" /> {badge.label}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-6 flex flex-col flex-1">
                        {!article.coverImage && (
                          <div className="flex justify-between items-start mb-4">
                            <span className="bg-surface-warm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                              {article.category ? t(`categories.${article.category.slug}`, { defaultValue: article.category.name }) : t('resourcesPage.resource')}
                            </span>
                            {badge && (
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${badge.color}`}>
                                <Icon name={uiIcons.sparkles} className="w-3 h-3 object-contain" alt="" /> {badge.label}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <h3 className="font-display text-lg font-bold text-text-primary group-hover:text-primary-400 transition-colors line-clamp-2 mb-2">
                          {article.title}
                        </h3>
                        <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 mb-6">
                          {article.excerpt}
                        </p>
                        
                        <div className="mt-auto pt-4 flex items-center justify-between border-t border-border-light/50">
                          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
                            <Icon name={uiIcons.bookOpen} className="w-3 h-3 object-contain" alt="" /> {t('resourcesPage.minRead', { min: 6 })}
                          </span>
                          <div className="flex items-center gap-1 text-xs font-bold text-primary-700 group-hover:gap-2 transition-all">
                            {t('resourcesPage.readGuide')} <Icon name={uiIcons.chevronRight} className="w-4 h-4 object-contain inline" alt="" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex rtl:flex-row-reverse items-center justify-center gap-4 mt-12 pb-12">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-3 rounded-2xl bg-surface border border-border-light text-text-secondary hover:border-primary-200 hover:text-primary-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <Icon name={uiIcons.chevronLeft} className="w-5 h-5 object-contain" alt="" />
                  </button>
                  
                  <div className="text-sm font-bold text-text-secondary bg-surface px-6 py-2.5 rounded-2xl border border-border-light shadow-sm">
                    {t('resourcesPage.pageOf', { current: currentPage, total: totalPages })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-3 rounded-2xl bg-surface border border-border-light text-text-secondary hover:border-primary-200 hover:text-primary-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <Icon name={uiIcons.chevronRight} className="w-5 h-5 object-contain" alt="" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-surface rounded-[32px] border border-dashed border-border-light">
              <Icon name={uiIcons.bookOpen} className="mx-auto mb-4 h-12 w-12 object-contain opacity-40" alt="" />
              <h3 className="text-lg font-bold text-text-primary">{t('resourcesPage.noResourcesFound')}</h3>
              <p className="text-text-secondary mt-2">{t('resourcesPage.noResourcesFoundDesc')}</p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
