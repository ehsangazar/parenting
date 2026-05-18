import { Trans, useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO.js';

const linkClass = 'text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2';

export const PrivacyPolicyPage = () => {
  const { t, i18n } = useTranslation();
  const lastUpdated = new Date().toLocaleDateString(i18n.language === 'fa' ? 'fa-IR' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <SEO
        title={t('legal.privacy.pageTitle')}
        description={t('legal.privacy.introBody')}
        canonical="/privacy"
      />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
            {t('legal.privacy.pageTitle')}
          </h1>
          <p className="mt-2 text-[13px] text-text-secondary">
            {t('legal.common.lastUpdated', { date: lastUpdated })}
          </p>
        </div>

        <div className="space-y-6">
          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border-light">
            <h2 className="text-[18px] font-bold text-text-primary mb-3">{t('legal.privacy.introTitle')}</h2>
            <p className="text-[15px] text-text-primary leading-relaxed">{t('legal.privacy.introBody')}</p>
          </section>

          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border-light">
            <h2 className="text-[18px] font-bold text-text-primary mb-3">{t('legal.privacy.collectTitle')}</h2>
            <p className="text-[15px] text-text-primary leading-relaxed mb-3">{t('legal.privacy.collectIntro')}</p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-1">
              <li>{t('legal.privacy.collectLi1')}</li>
              <li>{t('legal.privacy.collectLi2')}</li>
              <li>{t('legal.privacy.collectLi3')}</li>
              <li>{t('legal.privacy.collectLi4')}</li>
              <li>{t('legal.privacy.collectLi5')}</li>
            </ul>
          </section>

          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border-light">
            <h2 className="text-[18px] font-bold text-text-primary mb-3">{t('legal.privacy.cameraTitle')}</h2>
            <p className="text-[15px] text-text-primary leading-relaxed">{t('legal.privacy.cameraBody')}</p>
          </section>

          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border-light">
            <h2 className="text-[18px] font-bold text-text-primary mb-3">{t('legal.privacy.useTitle')}</h2>
            <p className="text-[15px] text-text-primary leading-relaxed mb-3">{t('legal.privacy.useIntro')}</p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-1">
              <li>{t('legal.privacy.useLi1')}</li>
              <li>{t('legal.privacy.useLi2')}</li>
              <li>{t('legal.privacy.useLi3')}</li>
              <li>{t('legal.privacy.useLi4')}</li>
              <li>{t('legal.privacy.useLi5')}</li>
            </ul>
          </section>

          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border-light">
            <h2 className="text-[18px] font-bold text-text-primary mb-3">{t('legal.privacy.securityTitle')}</h2>
            <p className="text-[15px] text-text-primary leading-relaxed">{t('legal.privacy.securityBody')}</p>
          </section>

          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border-light">
            <h2 className="text-[18px] font-bold text-text-primary mb-3">{t('legal.privacy.rightsTitle')}</h2>
            <p className="text-[15px] text-text-primary leading-relaxed mb-3">{t('legal.privacy.rightsIntro')}</p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-1 mb-4">
              <li>{t('legal.privacy.rightsLi1')}</li>
              <li>{t('legal.privacy.rightsLi2')}</li>
              <li>{t('legal.privacy.rightsLi3')}</li>
              <li>{t('legal.privacy.rightsLi4')}</li>
              <li>{t('legal.privacy.rightsLi5')}</li>
            </ul>
            <p className="text-[15px] text-text-primary leading-relaxed">
              <Trans
                i18nKey="legal.privacy.rightsP2"
                components={{
                  support: (
                    <a
                      href="mailto:support@raised.app?subject=Request%20to%20delete%20my%20account"
                      className={linkClass}
                    />
                  ),
                }}
              />
            </p>
          </section>

          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border-light">
            <h2 className="text-[18px] font-bold text-text-primary mb-3">{t('legal.privacy.contactTitle')}</h2>
            <p className="text-[15px] text-text-primary leading-relaxed">
              <Trans
                i18nKey="legal.privacy.contactBody"
                components={{
                  support: <a href="mailto:support@raised.app" className={linkClass} />,
                }}
              />
            </p>
          </section>
        </div>

      </article>
    </>
  );
};
