import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO.js';

const linkClass = 'text-primary-600 underline underline-offset-2';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-surface rounded-xl p-6 shadow-sm border border-border-light">
    <h2 className="text-lg font-semibold text-text-primary mb-3">{title}</h2>
    <div className="text-text-secondary leading-relaxed space-y-3">{children}</div>
  </section>
);

const CookieRow = ({
  name,
  purpose,
  duration,
  essential,
  essentialLabel,
  analyticsLabel,
}: {
  name: string;
  purpose: string;
  duration: string;
  essential: boolean;
  essentialLabel: string;
  analyticsLabel: string;
}) => (
  <tr className="border-t border-border-light">
    <td className="py-3 pr-4 text-sm font-medium text-text-primary align-top">{name}</td>
    <td className="py-3 pr-4 text-sm text-text-secondary align-top">{purpose}</td>
    <td className="py-3 pr-4 text-sm text-text-secondary align-top">{duration}</td>
    <td className="py-3 text-sm align-top">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          essential ? 'bg-primary-100 text-primary-700' : 'bg-secondary-100 text-secondary-700'
        }`}
      >
        {essential ? essentialLabel : analyticsLabel}
      </span>
    </td>
  </tr>
);

export const CookiePolicyPage = () => {
  const { t, i18n } = useTranslation();
  const lastUpdated = new Date('2026-02-21').toLocaleDateString(i18n.language === 'fa' ? 'fa-IR' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleManagePreferences = () => {
    localStorage.removeItem('cookie_consent');
    window.location.reload();
  };

  const essential = t('legal.cookies.typeEssential');
  const analytics = t('legal.cookies.typeAnalytics');

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={t('legal.cookies.pageTitle')}
        description={t('legal.cookies.whatP1')}
        canonical="/cookies"
      />
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm font-medium text-text-secondary hover:text-primary-600 transition-colors flex items-center gap-1.5"
          >
            <span aria-hidden>←</span> {t('legal.common.backToHome')}
          </Link>
          <span className="text-xs text-text-tertiary">{t('legal.common.brand')}</span>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
            {t('legal.cookies.pageTitle')}
          </h1>
          <p className="mt-2 text-sm text-text-tertiary">
            {t('legal.common.lastUpdated', { date: lastUpdated })}
          </p>
        </div>

        <div className="space-y-6">
          <Section title={t('legal.cookies.whatTitle')}>
            <p>{t('legal.cookies.whatP1')}</p>
            <p>{t('legal.cookies.whatP2')}</p>
          </Section>

          <Section title={t('legal.cookies.weUseTitle')}>
            <p>{t('legal.cookies.weUseIntro')}</p>

            <div className="mt-4 rounded-xl border border-border-light overflow-hidden">
              <div className="bg-surface-light px-4 py-3 border-b border-border-light">
                <h3 className="text-sm font-bold text-text-primary">🔒 {t('legal.cookies.essentialHeading')}</h3>
                <p className="text-xs text-text-tertiary mt-0.5">{t('legal.cookies.essentialSub')}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left px-4">
                  <thead>
                    <tr className="border-t border-border-light">
                      <th className="py-2 pl-4 pr-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">
                        {t('legal.cookies.tableName')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">
                        {t('legal.cookies.tablePurpose')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">
                        {t('legal.cookies.tableDuration')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">
                        {t('legal.cookies.tableType')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="pl-4">
                    <CookieRow
                      name="auth_token"
                      purpose={t('legal.cookies.rowAuthTokenPurpose')}
                      duration={t('legal.cookies.duration30Days')}
                      essential
                      essentialLabel={essential}
                      analyticsLabel={analytics}
                    />
                    <CookieRow
                      name="active_family_id"
                      purpose={t('legal.cookies.rowFamilyPurpose')}
                      duration={t('legal.cookies.durationSession')}
                      essential
                      essentialLabel={essential}
                      analyticsLabel={analytics}
                    />
                    <CookieRow
                      name="cookie_consent"
                      purpose={t('legal.cookies.rowConsentPurpose')}
                      duration={t('legal.cookies.duration1Year')}
                      essential
                      essentialLabel={essential}
                      analyticsLabel={analytics}
                    />
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border-light overflow-hidden">
              <div className="bg-surface-light px-4 py-3 border-b border-border-light">
                <h3 className="text-sm font-bold text-text-primary">📊 {t('legal.cookies.analyticsHeading')}</h3>
                <p className="text-xs text-text-tertiary mt-0.5">{t('legal.cookies.analyticsSub')}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-t border-border-light">
                      <th className="py-2 pl-4 pr-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">
                        {t('legal.cookies.tableName')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">
                        {t('legal.cookies.tablePurpose')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">
                        {t('legal.cookies.tableDuration')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">
                        {t('legal.cookies.tableType')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <CookieRow
                      name="_ga"
                      purpose={t('legal.cookies.rowGaPurpose')}
                      duration={t('legal.cookies.duration2Years')}
                      essential={false}
                      essentialLabel={essential}
                      analyticsLabel={analytics}
                    />
                    <CookieRow
                      name="_ga_*"
                      purpose={t('legal.cookies.rowGaSessionPurpose')}
                      duration={t('legal.cookies.duration2Years')}
                      essential={false}
                      essentialLabel={essential}
                      analyticsLabel={analytics}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          <Section title={t('legal.cookies.choicesTitle')}>
            <p>{t('legal.cookies.choicesP1')}</p>
            <button
              type="button"
              onClick={handleManagePreferences}
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary-300 bg-primary-50 px-5 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
            >
              {t('legal.cookies.managePreferences')}
            </button>
            <p className="mt-3">
              <Trans
                i18nKey="legal.cookies.choicesP2"
                components={{
                  about: (
                    <a
                      href="https://www.aboutcookies.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    />
                  ),
                }}
              />
            </p>
            <p>{t('legal.cookies.choicesP3')}</p>
          </Section>

          <Section title={t('legal.cookies.thirdPartyTitle')}>
            <p>{t('legal.cookies.thirdPartyP1')}</p>
          </Section>

          <Section title={t('legal.cookies.changesTitle')}>
            <p>{t('legal.cookies.changesP1')}</p>
          </Section>

          <Section title={t('legal.cookies.contactTitle')}>
            <p>
              <Trans
                i18nKey="legal.cookies.contactP1"
                components={{
                  privacy: <a href="mailto:privacy@raised.app" className={linkClass} />,
                }}
              />
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-border-light text-center">
          <Link to="/" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            ← {t('legal.common.backToHome')}
          </Link>
        </div>
      </article>
    </div>
  );
};
