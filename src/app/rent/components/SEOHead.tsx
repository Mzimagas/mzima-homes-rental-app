import { Metadata } from 'next'

interface SEOHeadProps {
  title: string
  description: string
  keywords?: string
  image?: string
  url?: string
  type?: 'website' | 'article'
}

export function generateSEOMetadata({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
}: SEOHeadProps): Metadata {
  const siteName = 'Mzima Homes'
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`

  return {
    title: fullTitle,
    description,
    keywords,
    authors: [{ name: 'Mzima Homes' }],
    creator: 'Mzima Homes',
    publisher: 'Mzima Homes',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type,
      title: fullTitle,
      description,
      siteName,
      url,
      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: image ? [image] : undefined,
    },
    alternates: {
      canonical: url,
    },
  }
}

// Structured data for property listings
export function generatePropertyStructuredData(unit: {
  unit_id: string
  unit_label: string
  property_name: string
  physical_address?: string
  monthly_rent_kes?: number
  deposit_kes?: number
  available_from?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RentAction',
    object: {
      '@type': 'Accommodation',
      name: `${unit.property_name} - ${unit.unit_label}`,
      description: `Rental unit ${unit.unit_label} at ${unit.property_name}`,
      address: unit.physical_address
        ? {
            '@type': 'PostalAddress',
            addressLocality: unit.physical_address,
            addressCountry: 'KE',
          }
        : undefined,
      offers: {
        '@type': 'Offer',
        price: unit.monthly_rent_kes?.toString(),
        priceCurrency: 'KES',
        availability: 'https://schema.org/InStock',
        validFrom: unit.available_from || new Date().toISOString(),
      },
    },
    agent: {
      '@type': 'RealEstateAgent',
      name: 'Mzima Homes',
      url: 'https://mzimahomes.com',
    },
  }
}

// Structured data for property search results
export function generateSearchResultsStructuredData(
  units: Array<{
    unit_id: string
    unit_label: string
    property_name: string
    monthly_rent_kes?: number
  }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: units.length,
    itemListElement: units.map((unit, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Accommodation',
        name: `${unit.property_name} - ${unit.unit_label}`,
        url: `/rent/${unit.unit_id}`,
        offers: {
          '@type': 'Offer',
          price: unit.monthly_rent_kes?.toString(),
          priceCurrency: 'KES',
        },
      },
    })),
  }
}

// Component for injecting structured data
export function StructuredData({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}
