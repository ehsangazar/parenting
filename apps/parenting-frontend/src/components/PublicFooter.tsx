import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogoBrand } from './ui/LogoBrand.js';
import { useLocalePath } from '../hooks/useLocalePath.js';

export const PublicFooter = () => {
  const { t } = useTranslation();
  const { localePath, homeHref } = useLocalePath();

  return (
    <footer className="border-t border-border-light bg-background py-12">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <LogoBrand tagline={t('home.footer.tagline')} size="compact" href={homeHref} />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-secondary">
              {t('home.footer.description')}
            </p>
            <p className="mt-1.5 text-xs text-text-dimmed">{t('home.footer.guidelines')}</p>
          </div>

          <nav aria-label="Product links">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary">{t('home.footer.productHeading')}</p>
            <ul className="space-y-2 text-sm">
              <li><Link to={localePath('/features')} className="text-text-secondary transition-colors hover:text-primary-400">{t('home.nav.features')}</Link></li>
              <li><Link to={localePath('/articles')} className="text-text-secondary transition-colors hover:text-primary-400">{t('home.nav.articles')}</Link></li>
              <li><Link to={localePath('/survey')} className="text-text-secondary transition-colors hover:text-primary-400">{t('home.footer.survey')}</Link></li>
              <li><Link to={localePath('/mission')} className="text-text-secondary transition-colors hover:text-primary-400">{t('home.nav.mission')}</Link></li>
              <li><Link to={localePath('/about')} className="text-text-secondary transition-colors hover:text-primary-400">{t('home.nav.about')}</Link></li>
            </ul>
          </nav>

          <nav aria-label="Legal links">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary">{t('home.footer.legalHeading')}</p>
            <ul className="space-y-2 text-sm">
              <li><Link to={localePath('/privacy')} className="text-text-secondary transition-colors hover:text-primary-400">{t('home.footer.privacyPolicy')}</Link></li>
              <li><Link to={localePath('/terms')} className="text-text-secondary transition-colors hover:text-primary-400">{t('home.footer.termsOfService')}</Link></li>
              <li><Link to={localePath('/cookies')} className="text-text-secondary transition-colors hover:text-primary-400">{t('home.footer.cookiePolicy')}</Link></li>
              <li><Link to={localePath('/safeguarding')} className="text-text-secondary transition-colors hover:text-primary-400">{t('home.footer.safeguarding')}</Link></li>
            </ul>
          </nav>

          <nav aria-label="Support links">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary">{t('home.footer.supportHeading')}</p>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:support@raised.app" className="text-text-secondary transition-colors hover:text-primary-400">{t('home.footer.contactUs')}</a></li>
              <li><Link to={localePath('/login')} className="text-text-secondary transition-colors hover:text-primary-400">{t('home.nav.signIn')}</Link></li>
              <li><Link to={localePath('/register')} className="text-text-secondary transition-colors hover:text-primary-400">{t('home.nav.getStarted')}</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border-light pt-6 text-xs text-text-dimmed sm:flex-row sm:items-center sm:justify-between">
          <span>{t('home.footer.copyright', { year: new Date().getFullYear() })}</span>
          <div className="flex items-center gap-5">
            <Link to={localePath('/privacy')} className="transition-colors hover:text-primary-400">{t('home.footer.privacyLink')}</Link>
            <Link to={localePath('/terms')} className="transition-colors hover:text-primary-400">{t('home.footer.termsLink')}</Link>
            <Link to={localePath('/cookies')} className="transition-colors hover:text-primary-400">{t('home.footer.cookiesLink')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
