import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/app/PageHeader.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { Icon, type IconName } from '../../components/icons/index.js';

type AgeGroup = 'pregnancy' | '0-6m' | '6-12m' | '1-2y' | '2-5y' | '5-11y' | '11-18y';

interface Resource {
  title: string;
  source: 'NHS' | 'WHO' | 'NSPCC' | 'Gov.uk' | 'ERIC' | 'AAP';
  desc: string;
  url: string;
  icon: IconName;
}

const ageGroups: { id: AgeGroup; label: string; iconName: IconName }[] = [
  { id: 'pregnancy', label: 'Pregnancy', iconName: 'contacts' },
  { id: '0-6m', label: '0–6 months', iconName: 'contacts' },
  { id: '6-12m', label: '6–12 months', iconName: 'tree_structure' },
  { id: '1-2y', label: '1–2 years', iconName: 'puzzle' },
  { id: '2-5y', label: '2–5 years', iconName: 'organization' },
  { id: '5-11y', label: '5–11 years', iconName: 'reading_ebook' },
  { id: '11-18y', label: '11–18 years', iconName: 'graduation_cap' },
];

const resources: Record<AgeGroup, Resource[]> = {
  pregnancy: [
    { title: 'Your antenatal care', source: 'NHS', desc: 'What to expect at your first booking appointment and throughout pregnancy.', url: 'https://www.nhs.uk/pregnancy/your-pregnancy-care/your-antenatal-care/', icon: 'department' },
    { title: 'Foods to avoid in pregnancy', source: 'NHS', desc: 'NHS guidance on which foods and drinks to limit during pregnancy.', url: 'https://www.nhs.uk/pregnancy/keeping-well/foods-to-avoid/', icon: 'biotech' },
    { title: 'Pregnancy and coronavirus', source: 'Gov.uk', desc: 'Latest guidance for pregnant women on COVID-19 vaccination.', url: 'https://www.gov.uk/government/publications/safety-of-covid-19-vaccines-when-given-in-pregnancy/the-safety-of-covid-19-vaccines-when-given-in-pregnancy', icon: 'biohazard' },
    { title: 'Mental health in pregnancy', source: 'NHS', desc: 'Perinatal mental health — signs to look for and where to get help.', url: 'https://www.nhs.uk/nhs-services/mental-health-services/where-to-get-urgent-help-for-mental-health/', icon: 'mind_map' },
  ],
  '0-6m': [
    { title: 'Newborn check: the APGAR score', source: 'NHS', desc: 'What the newborn check measures and what the results mean.', url: 'https://www.nhs.uk/baby/newborn-screening/physical-examination/', icon: 'checkmark' },
    { title: 'Safe sleeping (SIDS)', source: 'NHS', desc: 'Reduce the risk of sudden infant death syndrome with safe sleep guidance.', url: 'https://www.nhs.uk/conditions/sudden-infant-death-syndrome-sids/', icon: 'night_landscape' },
    { title: 'Breastfeeding support', source: 'NHS', desc: 'Positions, latching, common problems, and where to get expert support.', url: 'https://www.nhs.uk/conditions/baby/breastfeeding-and-bottle-feeding/breastfeeding/', icon: 'customer_support' },
    { title: 'Infant immunisation schedule', source: 'NHS', desc: 'UK vaccination schedule from 8 weeks onwards — what jabs and when.', url: 'https://www.nhs.uk/conditions/vaccinations/nhs-vaccinations-and-when-to-have-them/', icon: 'biohazard' },
  ],
  '6-12m': [
    { title: 'Starting solid foods (weaning)', source: 'NHS', desc: 'When and how to introduce solid foods safely, baby-led and spoon-led.', url: 'https://www.nhs.uk/conditions/baby/weaning-and-feeding/babys-first-solid-foods/', icon: 'biotech' },
    { title: 'Your baby\'s development (6–12 months)', source: 'NHS', desc: 'What to expect: sitting, crawling, first words, and social milestones.', url: 'https://www.nhs.uk/conditions/baby/babys-development/', icon: 'rating' },
    { title: '6–8 week baby check', source: 'NHS', desc: 'What the 6–8 week GP check involves and what it looks for.', url: 'https://www.nhs.uk/baby/babys-development/height-weight-and-reviews/baby-reviews/', icon: 'inspection' },
    { title: 'Foods to avoid for babies', source: 'NHS', desc: 'Honey, salt, choking hazards — what not to feed babies under 12 months.', url: 'https://www.nhs.uk/conditions/baby/weaning-and-feeding/foods-to-avoid-giving-babies-and-young-children/', icon: 'disclaimer' },
  ],
  '1-2y': [
    { title: 'Your child\'s 1-year review', source: 'NHS', desc: 'What happens at the 12-month Health Visitor development review.', url: 'https://www.nhs.uk/baby/babys-development/height-weight-and-reviews/baby-reviews/', icon: 'approval' },
    { title: 'MMR vaccine (12–13 months)', source: 'NHS', desc: 'Measles, mumps and rubella vaccination — what to expect.', url: 'https://www.nhs.uk/conditions/vaccinations/mmr-vaccine/', icon: 'biohazard' },
    { title: 'Toddler tantrums', source: 'NHS', desc: 'Why tantrums happen and how to respond calmly and effectively.', url: 'https://www.nhs.uk/baby/babys-development/behaviour/temper-tantrums/', icon: 'negative_dynamic' },
    { title: 'Speech and language milestones (1–2)', source: 'NHS', desc: 'When to expect first words, and what delays might signal.', url: 'https://www.gosh.nhs.uk/conditions-and-treatments/procedures-and-treatments/speech-and-language-development-birth-12-months/', icon: 'comments' },
  ],
  '2-5y': [
    { title: '2-year health review', source: 'NHS', desc: 'The 2–2.5 year development check — what Health Visitors assess.', url: 'https://www.nhs.uk/baby/babys-development/height-weight-and-reviews/baby-reviews/', icon: 'inspection' },
    { title: 'Starting nursery (EYFS guide)', source: 'Gov.uk', desc: 'Early Years Foundation Stage — what your child should learn before 5.', url: 'https://www.gov.uk/early-years-foundation-stage', icon: 'factory' },
    { title: 'Free 15–30 hours childcare', source: 'Gov.uk', desc: 'Apply for free childcare hours for 2–4 year olds in England.', url: 'https://www.gov.uk/help-with-childcare-costs/free-childcare-and-education-for-3-to-4-year-olds', icon: 'currency_exchange' },
    { title: 'Potty training', source: 'NHS', desc: 'Signs of readiness and NHS tips for successful toilet training.', url: 'https://eric.org.uk/potty-training/', icon: 'inspection' },
  ],
  '5-11y': [
    { title: 'School starting age (England)', source: 'Gov.uk', desc: 'When children must start school and how to apply for a place.', url: 'https://www.gov.uk/schools-admissions/school-starting-age', icon: 'calendar' },
    { title: 'Child Mental Health (CAMHS)', source: 'NHS', desc: 'Getting support for children\'s emotional and mental health needs.', url: 'https://www.nhs.uk/mental-health/children-and-young-adults/mental-health-support/', icon: 'mind_map' },
    { title: 'Healthy weight in children', source: 'NHS', desc: 'NHS guidance on nutrition and activity levels for school-age children.', url: 'https://www.nhs.uk/live-well/healthy-weight/childrens-weight/', icon: 'electricity' },
    { title: 'Screen time guidance', source: 'NHS', desc: 'NHS and UK Clinical advice on screens for children aged 5–11.', url: 'https://www.newcastle-hospitals.nhs.uk/resources/screen-time/', icon: 'cell_phone' },
  ],
  '11-18y': [
    { title: 'Teenage mental health', source: 'NHS', desc: 'Signs of depression, anxiety, and eating disorders in teenagers — and where to help.', url: 'https://www.nhs.uk/mental-health/children-and-young-adults/advice-for-parents/worried-about-your-teenager/', icon: 'like' },
    { title: 'RSE: Relationships & sex education', source: 'Gov.uk', desc: 'What is taught in English schools and how to support conversations at home.', url: 'https://www.gov.uk/government/publications/relationships-education-relationships-and-sex-education-rse-and-health-education', icon: 'reading' },
    { title: 'HPV vaccination (12–13 year olds)', source: 'NHS', desc: 'HPV vaccine offered to all young people in Year 8 in England.', url: 'https://www.nhs.uk/conditions/vaccinations/hpv-human-papillomavirus-vaccine/', icon: 'biohazard' },
    { title: 'Childline — support for teens', source: 'NSPCC', desc: 'Free, confidential helpline for children and young people under 19.', url: 'https://www.childline.org.uk', icon: 'phone' },
  ],
};

const sourceColor: Record<string, string> = {
  NHS: 'bg-blue-100 text-blue-700',
  WHO: 'bg-green-100 text-green-700',
  NSPCC: 'bg-purple-100 text-purple-700',
  'Gov.uk': 'bg-surface-light text-text-secondary',
  ERIC: 'bg-orange-100 text-orange-700',
  AAP: 'bg-teal-100 text-teal-700',
};

export const ResourcesPage = () => {
  const { t } = useTranslation();
  const [activeGroup, setActiveGroup] = useState<AgeGroup>('0-6m');
  const current = resources[activeGroup];

  return (
    <PageContainer verticalSpacing="normal">
      <PageHeader
        title={t('nav.resources')}
        subtitle={t('page.resourcesSubtitle')}
        iconName={appAssetIcons.resources}
      />

      {/* Emergency callout */}
      <div className="flex items-start gap-3 rounded-2xl border-2 border-red-100 bg-red-50 p-4">
        <Icon name={uiIcons.alertTriangle} className="h-4 w-4 flex-shrink-0 object-contain mt-0.5 opacity-90" alt="" />
        <div>
          <p className="text-sm font-semibold text-red-700">{t('page.resourcesEmergencyTitle')}</p>
          <p className="text-xs text-red-600 mt-0.5">
            {t('page.resourcesEmergencyBody')}{' '}
            {t('page.resourcesEmergencyFollowup')}
            <a href="tel:111" className="ml-1 underline">{t('page.call111')}</a>
          </p>
        </div>
      </div>

      {/* Age group tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
        {ageGroups.map(({ id, label, iconName }) => (
          <button
            key={id}
            onClick={() => setActiveGroup(id)}
            className={`flex-shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              activeGroup === id
                ? 'border-primary-400 bg-primary-50 text-primary-fg shadow-sm'
                : 'border-border bg-surface text-text-secondary hover:border-border-dark hover:text-text-secondary'
            }`}
            style={{ minHeight: 'unset', padding: '0.375rem 0.875rem' }}
          >
            <Icon name={iconName} className="h-4 w-4 object-contain" alt="" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Resources grid */}
      <div className="grid gap-3 md:grid-cols-2">
        {current.map((r) => (
          <a
            key={r.title}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all"
          >
            <Icon name={r.icon} className="h-8 w-8 flex-shrink-0 object-contain" alt="" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-text-primary group-hover:text-primary-300 transition-colors leading-snug">
                  {r.title}
                </p>
                <Icon name={uiIcons.externalLink} className="h-3.5 w-3.5 flex-shrink-0 object-contain opacity-60 transition-opacity group-hover:opacity-100 mt-0.5" alt="" />
              </div>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">{r.desc}</p>
              <span
                className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${sourceColor[r.source]}`}
              >
                {r.source}
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* Quick contacts */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-4">
          <Icon name={uiIcons.phone} className="h-4 w-4 object-contain opacity-80" alt="" />
          UK Helplines & Services
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { name: 'NHS 111', desc: 'Urgent medical advice', tel: '111', iconName: 'like' as IconName },
              { name: 'NSPCC Helpline', desc: 'Child protection concerns', tel: '08088005000', iconName: 'safe' },
              { name: 'Childline', desc: 'Support for young people', tel: '08001111', iconName: 'contacts' },
              { name: 'Family Lives', desc: 'Parenting support', tel: '08088002222', iconName: 'reading_ebook' },
            ] as const satisfies ReadonlyArray<{ name: string; desc: string; tel: string; iconName: IconName }>
          ).map(({ name, desc, tel, iconName }) => (
            <a
              key={name}
              href={`tel:${tel}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-light px-3 py-2.5 hover:bg-primary-50 hover:border-primary-200 transition-all group"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100">
                <Icon name={iconName} className="h-4 w-4 object-contain opacity-80" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary group-hover:text-primary-300">{name}</p>
                <p className="text-xs text-text-tertiary">{desc}</p>
              </div>
              <Icon name={uiIcons.phone} className="h-3.5 w-3.5 object-contain opacity-50 group-hover:opacity-90 flex-shrink-0" alt="" />
            </a>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-text-tertiary pb-4">
        All external links open NHS.uk, Gov.uk, or trusted third-party websites. Raised does not control external content. Always consult a healthcare professional for personalised advice.
      </p>
    </PageContainer>
  );
};
