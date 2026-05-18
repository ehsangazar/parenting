import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { SEO } from '../components/SEO.js';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-surface rounded-xl p-6 shadow-sm border border-border">
    <h2 className="text-[18px] font-bold text-text-primary mb-3">{title}</h2>
    <div className="text-[15px] text-text-primary leading-relaxed space-y-3">{children}</div>
  </section>
);

const PriorityCard = ({
  iconName,
  title,
  body,
  color,
}: {
  iconName: IconName;
  title: string;
  body: string;
  color: string;
}) => (
  <div className={`flex gap-4 rounded-xl border p-4 ${color}`}>
    <div className="flex-shrink-0">
      <Icon name={iconName} className="h-5 w-5" alt="" />
    </div>
    <div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-sm mt-0.5 opacity-90">{body}</p>
    </div>
  </div>
);

export const SafeguardingPage = () => {
  const { t, i18n } = useTranslation();

  const lastUpdated = new Date('2026-02-21').toLocaleDateString(
    i18n.language === 'fa' ? 'fa-IR' : 'en-GB',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const RESOURCES = [
    { href: 'https://www.nspcc.org.uk', label: 'NSPCC', descKey: 'resourceNSPCCDesc', phone: '0808 800 5000' },
    { href: 'https://www.childline.org.uk', label: 'Childline', descKey: 'resourceChildlineDesc', phone: '0800 1111' },
    { href: 'https://www.ceop.police.uk', label: 'CEOP', descKey: 'resourceCEOPDesc', phone: null },
    { href: 'https://www.gov.uk/report-child-abuse', label: 'UK Government', descKey: 'resourceGovDesc', phone: null },
  ] as const;

  return (
    <>
      <SEO
        title={t('safeguarding.title')}
        description={t('safeguarding.intro')}
        canonical="/safeguarding"
      />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100">
              <Icon name={uiIcons.shield} className="h-6 w-6" alt="" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
                {t('safeguarding.title')}
              </h1>
              <p className="text-[13px] text-text-secondary mt-1">
                {t('safeguarding.lastUpdated', { date: lastUpdated })}
              </p>
            </div>
          </div>
          <p className="text-[15px] text-text-primary leading-relaxed max-w-2xl">
            {t('safeguarding.intro')}
          </p>
        </div>

        <div className="mb-6 rounded-2xl border-2 border-error/30 bg-error/5 p-5">
          <div className="flex items-start gap-3">
            <Icon name={uiIcons.alertTriangle} className="h-5 w-5 text-error flex-shrink-0 mt-0.5" alt="" />
            <div>
              <p className="font-bold text-error text-[15px]">{t('safeguarding.emergencyTitle')}</p>
              <p className="text-[14px] text-text-primary mt-1 leading-relaxed">{t('safeguarding.emergencyBody')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Section title={t('safeguarding.commitmentTitle')}>
            <p>{t('safeguarding.commitmentP1')}</p>
            <p>{t('safeguarding.commitmentP2')}</p>
          </Section>

          <Section title={t('safeguarding.scopeTitle')}>
            <div className="grid sm:grid-cols-2 gap-3">
              <PriorityCard
                iconName={uiIcons.users}
                title={t('safeguarding.scopeCard1Title')}
                body={t('safeguarding.scopeCard1Body')}
                color="border-primary-200 bg-primary-50 text-primary-800"
              />
              <PriorityCard
                iconName={uiIcons.eye}
                title={t('safeguarding.scopeCard2Title')}
                body={t('safeguarding.scopeCard2Body')}
                color="border-secondary-200 bg-secondary-50 text-secondary-800"
              />
              <PriorityCard
                iconName={uiIcons.shield}
                title={t('safeguarding.scopeCard3Title')}
                body={t('safeguarding.scopeCard3Body')}
                color="border-primary-200 bg-primary-50 text-primary-800"
              />
              <PriorityCard
                iconName={uiIcons.fileText}
                title={t('safeguarding.scopeCard4Title')}
                body={t('safeguarding.scopeCard4Body')}
                color="border-secondary-200 bg-secondary-50 text-secondary-800"
              />
            </div>
          </Section>

          <Section title={t('safeguarding.dslTitle')}>
            <p>
              {t('safeguarding.dslP1')}{' '}
              <a href="mailto:safeguarding@raised.app" className="text-primary-600 underline underline-offset-2">
                safeguarding@raised.app
              </a>
            </p>
            <p>{t('safeguarding.dslP2')}</p>
          </Section>

          <Section title={t('safeguarding.measuresTitle')}>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li><strong>{t('safeguarding.measureAgeGatingLabel')}</strong> {t('safeguarding.measureAgeGating')}</li>
              <li><strong>{t('safeguarding.measureDataMinLabel')}</strong> {t('safeguarding.measureDataMin')}</li>
              <li><strong>{t('safeguarding.measureAccessLabel')}</strong> {t('safeguarding.measureAccess')}</li>
              <li><strong>{t('safeguarding.measureModerationLabel')}</strong> {t('safeguarding.measureModeration')}</li>
              <li><strong>{t('safeguarding.measureAILabel')}</strong> {t('safeguarding.measureAI')}</li>
              <li><strong>{t('safeguarding.measureNoAdsLabel')}</strong> {t('safeguarding.measureNoAds')}</li>
            </ul>
          </Section>

          <Section title={t('safeguarding.reportTitle')}>
            <p>{t('safeguarding.reportIntro')}</p>
            <ol className="list-decimal list-inside space-y-2 ml-1">
              <li>
                {t('safeguarding.reportStep1Pre')} <strong>{t('safeguarding.reportStep1Bold')}</strong> {t('safeguarding.reportStep1Post')}
              </li>
              <li>
                {t('safeguarding.reportStep2Pre')}{' '}
                <a href="mailto:safeguarding@raised.app" className="text-primary-600 underline underline-offset-2">
                  safeguarding@raised.app
                </a>
              </li>
              <li>
                {t('safeguarding.reportStep3Pre')}{' '}
                <a
                  href="https://www.iwf.org.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 underline underline-offset-2"
                >
                  {t('safeguarding.reportStep3IWF')}
                </a>
              </li>
            </ol>
            <p>{t('safeguarding.reportOutro')}</p>
          </Section>

          <Section title={t('safeguarding.resourcesTitle')}>
            <div className="space-y-3">
              {RESOURCES.map((r) => (
                <div key={r.label} className="flex items-center justify-between rounded-xl border border-border-light px-4 py-3">
                  <div>
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary-600 text-sm"
                    >
                      {r.label}
                    </a>
                    <p className="text-[13px] text-text-secondary mt-1">{t(`safeguarding.${r.descKey}`)}</p>
                  </div>
                  {r.phone && (
                    <a
                      href={`tel:${r.phone.replace(/\s/g, '')}`}
                      className="flex items-center gap-1.5 text-sm font-semibold text-primary-700"
                    >
                      <Icon name={uiIcons.phone} className="h-3.5 w-3.5" alt="" />
                      {r.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section title={t('safeguarding.policyReviewTitle')}>
            <p>{t('safeguarding.policyReviewBody')}</p>
          </Section>
        </div>
      </article>
    </>
  );
};
