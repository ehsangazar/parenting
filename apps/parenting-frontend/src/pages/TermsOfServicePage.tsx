import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO.js';

const linkClass = 'text-primary-600 underline underline-offset-2';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-surface rounded-xl p-6 shadow-sm border border-border">
    <h2 className="text-[18px] font-bold text-text-primary mb-3">{title}</h2>
    <div className="text-[15px] text-text-primary leading-relaxed space-y-3">{children}</div>
  </section>
);

export const TermsOfServicePage = () => {
  const { t, i18n } = useTranslation();
  const lastUpdated = new Date('2026-02-21').toLocaleDateString(i18n.language === 'fa' ? 'fa-IR' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <SEO
        title={t('legal.terms.pageTitle')}
        description={t('legal.terms.lead')}
        canonical="/terms"
      />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
            {t('legal.terms.pageTitle')}
          </h1>
          <p className="mt-2 text-[13px] text-text-secondary">
            {t('legal.common.lastUpdated', { date: lastUpdated })}
          </p>
          <p className="mt-4 text-[15px] text-text-primary leading-relaxed">{t('legal.terms.lead')}</p>
        </div>

        <div className="space-y-6">
          <Section title={t('legal.terms.s1Title')}>
            <p>
              <Trans
                i18nKey="legal.terms.s1p1"
                components={{
                  legal: <a href="mailto:legal@raised.app" className={linkClass} />,
                }}
              />
            </p>
          </Section>

          <Section title={t('legal.terms.s2Title')}>
            <p>{t('legal.terms.s2p1')}</p>
            <p>{t('legal.terms.s2p2')}</p>
          </Section>

          <Section title={t('legal.terms.s3Title')}>
            <p>
              <Trans
                i18nKey="legal.terms.s3p1"
                components={{
                  support: <a href="mailto:support@raised.app" className={linkClass} />,
                }}
              />
            </p>
            <p>{t('legal.terms.s3p2')}</p>
          </Section>

          <Section title={t('legal.terms.s4Title')}>
            <p>{t('legal.terms.s4p1')}</p>
            <p>
              <Trans
                i18nKey="legal.terms.s4p2"
                components={{
                  privacy: <Link to="/privacy" className={linkClass} />,
                }}
              />
            </p>
          </Section>

          <Section title={t('legal.terms.s5Title')}>
            <p>{t('legal.terms.s5intro')}</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>{t('legal.terms.s5li1')}</li>
              <li>{t('legal.terms.s5li2')}</li>
              <li>{t('legal.terms.s5li3')}</li>
              <li>{t('legal.terms.s5li4')}</li>
              <li>{t('legal.terms.s5li5')}</li>
              <li>{t('legal.terms.s5li6')}</li>
              <li>{t('legal.terms.s5li7')}</li>
            </ul>
            <p>{t('legal.terms.s5p2')}</p>
          </Section>

          <Section title={t('legal.terms.s6Title')}>
            <p>
              <Trans i18nKey="legal.terms.s6p1" components={{ strong: <strong /> }} />
            </p>
            <p>{t('legal.terms.s6p2')}</p>
          </Section>

          <Section title={t('legal.terms.s7Title')}>
            <p>{t('legal.terms.s7p1')}</p>
            <p>{t('legal.terms.s7p2')}</p>
          </Section>

          <Section title={t('legal.terms.s8Title')}>
            <p>{t('legal.terms.s8p1')}</p>
          </Section>

          <Section title={t('legal.terms.s9Title')}>
            <p>{t('legal.terms.s9p1')}</p>
          </Section>

          <Section title={t('legal.terms.s10Title')}>
            <p>
              <Trans
                i18nKey="legal.terms.s10p1"
                components={{
                  privacy: <Link to="/privacy" className={linkClass} />,
                }}
              />
            </p>
          </Section>

          <Section title={t('legal.terms.s11Title')}>
            <p>{t('legal.terms.s11p1')}</p>
            <p>{t('legal.terms.s11p2')}</p>
          </Section>

          <Section title={t('legal.terms.s12Title')}>
            <p>{t('legal.terms.s12p1')}</p>
          </Section>

          <Section title={t('legal.terms.s13Title')}>
            <p>{t('legal.terms.s13p1')}</p>
          </Section>

          <Section title={t('legal.terms.s14Title')}>
            <p>
              <Trans
                i18nKey="legal.terms.s14p1"
                components={{
                  legal: <a href="mailto:legal@raised.app" className={linkClass} />,
                }}
              />
            </p>
          </Section>
        </div>

      </article>
    </>
  );
};
