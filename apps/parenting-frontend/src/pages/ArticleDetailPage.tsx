import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppBase } from '../hooks/useAppBase.js';
import ReactMarkdown from 'react-markdown';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { motion } from 'framer-motion';
import { articleApi } from '../lib/articleApi.js';
import { useAuth } from '../state/auth.js';
import { Article } from '../types/Articles.js';
import { LogoBrand } from '../components/ui/LogoBrand.js';
import { SEO } from '../components/SEO.js';
import { LazyImage } from '../components/ui/LazyImage.js';

interface ArticleDetailPageProps {
  variant?: 'public' | 'app' | 'admin';
}

export const ArticleDetailPage = ({ variant = 'public' }: ArticleDetailPageProps) => {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toApp } = useAppBase();
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const res = await articleApi.getPublicArticleBySlug(slug, i18n.language);
        setArticle(res.article);
      } catch (error) {
        console.error('Failed to fetch article:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [slug, i18n.language]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-display font-semibold text-text-primary">{t('articleDetail.notFoundTitle')}</h1>
        <p className="text-text-secondary mt-2 mb-8">{t('articleDetail.notFoundBody')}</p>
        <button type="button" onClick={() => navigate('/articles')} className="btn-duo-green-pill-lg !px-8">
          {t('articleDetail.backToArticles')}
        </button>
      </div>
    );
  }

  const articleJsonLd = article ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': article.title,
    'description': article.excerpt,
    'image': article.coverImage,
    'datePublished': article.createdAt,
    'author': {
      '@type': 'Organization',
      'name': t('articleDetail.editorialName'),
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://raised.info/logo.png'
      }
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Raised',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://raised.info/logo.png'
      }
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `https://raised.info/articles/${article.slug}`
    }
  } : null;

  const breadcrumbJsonLd = article ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': t('common.home'), 'item': 'https://raised.info/' },
      { '@type': 'ListItem', 'position': 2, 'name': t('articles.title'), 'item': 'https://raised.info/articles' },
      { '@type': 'ListItem', 'position': 3, 'name': article.title, 'item': `https://raised.info/articles/${article.slug}` },
    ],
  } : null;

  return (
    <>
      {article && (
        <SEO
          title={article.seoTitle || article.title}
          description={article.excerpt}
          ogImage={article.coverImage}
          ogType="article"
          canonical={`/articles/${article.slug}`}
          structuredData={[articleJsonLd!, breadcrumbJsonLd!]}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6 sm:mb-8">
          <button 
            onClick={() => navigate(variant === 'app' ? '/app/resources' : variant === 'admin' ? '/admin/articles' : '/articles')}
            className="inline-flex items-center gap-2 min-h-[44px] min-w-[44px] rounded-xl px-3 py-2.5 -ml-1 text-text-tertiary hover:bg-surface-light hover:text-primary-600 active:scale-[0.98] transition-all text-sm font-medium touch-manipulation"
            aria-label={
              variant === 'app'
                ? t('articleDetail.ariaBackApp')
                : variant === 'admin'
                  ? t('articleDetail.ariaBackAdmin')
                  : t('articleDetail.ariaBackPublic')
            }
          >
            <Icon name={uiIcons.chevronLeft} className="h-4 w-4 shrink-0" alt="" aria-hidden />
            <span className="whitespace-nowrap">
              {variant === 'app'
                ? t('articleDetail.backToResources')
                : variant === 'admin'
                  ? t('articleDetail.backToAdmin')
                  : t('articleDetail.backToArticles')}
            </span>
          </button>
          
          {user && variant === 'public' && (
            <button 
              onClick={() => navigate(toApp('/app'))}
              className="inline-flex items-center gap-2 min-h-[44px] min-w-[44px] rounded-xl px-3 py-2.5 -ml-1 text-text-tertiary hover:bg-surface-light hover:text-primary-600 active:scale-[0.98] transition-all text-sm font-medium touch-manipulation"
              aria-label={t('articleDetail.ariaHubDashboard')}
            >
              <Icon name={uiIcons.home} className="h-4 w-4 shrink-0" alt="" aria-hidden />
              <span className="whitespace-nowrap">{t('articleDetail.hubDashboard')}</span>
            </button>
          )}
        </div>

        {/* Article Header */}
        <header className="mb-12 max-w-3xl">
          {article.category && (
            <span className="inline-block bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              {t(`categories.${article.category.slug}`, { defaultValue: article.category.name })}
            </span>
          )}
          <h1 className="font-display text-4xl md:text-6xl font-semibold leading-tight text-text-primary mb-6 italic">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-text-tertiary">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-xs">R</div>
              <span className="font-medium text-text-secondary">{t('articleDetail.editorialName')}</span>
            </div>
            <div className="flex items-center gap-2 border-l border-border-light pl-6">
              <Icon name={uiIcons.calendar} className="h-4 w-4" alt="" />
              {new Date(article.createdAt).toLocaleDateString(i18n.language === 'fa' ? 'fa-IR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2 border-l border-border-light pl-6">
              <Icon name={uiIcons.bookOpen} className="h-4 w-4" alt="" />
              {t('articles.minuteRead', { minutes: 6 })}
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {article.coverImage && (
          <div className="mb-16 rounded-[48px] overflow-hidden shadow-2xl border-4 border-border-medium">
            <LazyImage src={article.coverImage} alt={article.title} className="w-full aspect-video object-cover" containerClassName="w-full aspect-video" />
          </div>
        )}

        {/* AI Quick Read */}
        {article.aiSummary && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16 p-10 bg-surface rounded-[40px] border border-primary-100 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6">
              <Icon name={uiIcons.sparkles} className="h-8 w-8 opacity-30" alt="" />
            </div>
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-primary-800 mb-6 italic">
              {t('articleDetail.aiSummaryHeading')}
            </h2>
            <div className="text-text-secondary text-base leading-relaxed space-y-4 max-w-2xl">
              {article.aiSummary.split('\n').filter(b => b.trim()).map((bullet, i) => (
                <p key={i} className="flex items-start gap-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2.5 flex-shrink-0" />
                  {bullet.replace(/^- /, '')}
                </p>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-16 items-start">
          {/* Article Content */}
          <article className="font-body prose prose-primary lg:prose-xl max-w-none prose-headings:font-heading prose-headings:italic prose-p:leading-relaxed prose-p:text-text-secondary/90 prose-blockquote:not-italic prose-blockquote:bg-surface-light/30 prose-blockquote:border-primary-200 prose-blockquote:rounded-2xl">
            <ReactMarkdown 
              components={{
                h1: () => null, // Hide internal H1 titles from markdown
              }}
            >
              {article.content}
            </ReactMarkdown>
            
            {/* Citations */}
            {article.citations && article.citations.length > 0 && (
              <div className="mt-20 pt-8 border-t border-border-light">
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary mb-6 flex items-center gap-2">
                  {t('articleDetail.referencesHeading')}
                </h3>
                <ul className="space-y-4 not-prose">
                  {article.citations.map(citation => (
                    <li key={citation.id} className="text-xs">
                      <a 
                        href={citation.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-text-secondary hover:text-primary-600 transition"
                      >
                        <span className="flex-1 underline underline-offset-4">{citation.label}</span>
                        <Icon name={uiIcons.externalLink} className="h-3 w-3 shrink-0" alt="" />
                        {citation.verified && (
                          <span className="bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Icon name={uiIcons.star} className="h-2.5 w-2.5" alt="" /> {t('articleDetail.peerReviewed')}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>

          {/* Sticky Actions Sidebar */}
          <aside className="space-y-8">
            <div className="sticky top-24 space-y-6">
              {/* Share & Tools */}
              <div className="p-6 bg-surface rounded-3xl border border-border-light shadow-sm">
                <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                  <Icon name={uiIcons.share} className="h-4 w-4" alt="" /> {t('articleDetail.shareThis')}
                </h3>
                <div className="flex gap-2">
                  <button type="button" className="btn-duo-sky flex-1 !min-h-10 !rounded-xl !px-2 !py-2 !text-xs">Twitter</button>
                  <button type="button" className="btn-duo-blue-sm flex-1 !min-h-10 !rounded-xl !px-2 !py-2 !text-xs">LinkedIn</button>
                </div>
              </div>

              {/* Action Buttons */}
              {article.actions && article.actions.length > 0 && (
                <div className="p-6 bg-secondary-50 rounded-3xl border border-secondary-200 shadow-sm">
                  <h3 className="text-sm font-bold text-secondary-800 mb-4">{t('articleDetail.turnInsightIntoAction')}</h3>
                  <div className="space-y-3">
                    {article.actions.map(action => (
                      <button 
                        type="button"
                        key={action.id}
                        className="btn-duo-outline-sm w-full !h-12 !min-h-12 !rounded-2xl !border-secondary-200 !text-secondary-400"
                      >
                        {action.actionType === 'calendar' ? (
                          <Icon name={uiIcons.calendar} className="h-4 w-4" alt="" />
                        ) : (
                          <Icon name={uiIcons.messageSquare} className="h-4 w-4" alt="" />
                        )}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recruitment or App Action Widget */}
              {user ? (
                <div className="p-6 bg-primary-600 rounded-3xl text-white shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-20">
                    <Icon name={uiIcons.book} className="h-32 w-32 opacity-20" alt="" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2 relative z-10">{t('articleDetail.continueLearning')}</h3>
                  <p className="text-[13px] text-primary-100 mb-6 relative z-10">
                    {t('articleDetail.continueLearningBody')}
                  </p>
                  <button type="button" onClick={() => navigate(toApp('/app/learning'))} className="btn-duo-sky relative z-10 w-full !min-h-11 !rounded-2xl !text-sm">
                    <Icon name={uiIcons.book} className="h-4 w-4 brightness-0 invert" alt="" /> {t('articleDetail.openAcademy')}
                  </button>
                </div>
              ) : (
                <div className="p-6 bg-primary-fg rounded-3xl text-white shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-20">
                    <LogoBrand size="compact" className="w-32 h-32" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2 relative z-10">{t('articleDetail.wantMoreTitle')}</h3>
                  <p className="text-[13px] text-white/75 mb-6 relative z-10">{t('articleDetail.wantMoreBody')}</p>
                  <button type="button" onClick={() => navigate('/register')} className="btn-duo-sky relative z-10 w-full !min-h-11 !rounded-2xl !text-sm">
                    {t('articleDetail.tryRaisedFree')}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Related Content Preview */}
      <section className="bg-surface py-20 mt-20 border-t border-border-light">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4">{t('articleDetail.keepReading')}</h2>
          <p className="text-text-secondary mb-12">{t('articleDetail.keepReadingSub')}</p>
          <button onClick={() => navigate('/articles')} className="text-primary-600 font-bold hover:underline flex items-center gap-2 mx-auto">
            {t('articleDetail.viewAllArticles')} <Icon name={uiIcons.chevronRight} className="h-4 w-4" alt="" />
          </button>
        </div>
      </section>

    </>
  );
};
