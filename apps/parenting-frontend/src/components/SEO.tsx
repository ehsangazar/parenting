import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  twitterCard?: string;
  structuredData?: object | object[];
  children?: React.ReactNode;
}

const DEFAULT_TITLE = 'Raised — The trusted parenting adviser for your whole family';
const DEFAULT_DESCRIPTION = 'Evidence-based parenting answers that actually fit your kid. Smarter than ChatGPT for parenting. Built by parents, reviewed by experts, private by default.';
const SITE_URL = 'https://raised.info';
const DEFAULT_OG_IMAGE = '/og-image.jpg';

export const SEO = ({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage,
  twitterCard = 'summary_large_image',
  structuredData,
  children,
}: SEOProps) => {
  const seoTitle = title ? `${title} | Raised` : DEFAULT_TITLE;
  const seoDescription = description || DEFAULT_DESCRIPTION;
  const seoCanonical = canonical ? `${SITE_URL}${canonical}` : undefined;
  const seoOgImage = ogImage ? (ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`) : `${SITE_URL}${DEFAULT_OG_IMAGE}`;

  return (
    <Helmet>
      {/* Base */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      {seoCanonical && <link rel="canonical" href={seoCanonical} />}

      {/* Open Graph */}
      <meta property="og:site_name" content="Raised" />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoOgImage} />
      {seoCanonical && <meta property="og:url" content={seoCanonical} />}
      <meta property="og:locale" content="en_GB" />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoOgImage} />

      {structuredData && (
        Array.isArray(structuredData)
          ? structuredData.map((schema, i) => (
              <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
            ))
          : <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      )}

      {children}
    </Helmet>
  );
};
