const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://marksly.pk/#organization',
      name: 'Marksly',
      // A same-named but entirely unrelated school-management company
      // (marksly.in) operates in India — this alternateName/
      // disambiguatingDescription pair exists specifically so Google's
      // knowledge graph and AI Overviews have an explicit machine-readable
      // signal to tell the two apart by name AND geography, rather than
      // silently merging or preferring whichever has more existing
      // authority when someone searches the bare word "marksly".
      alternateName: 'Marksly Pakistan',
      disambiguatingDescription:
        'Marksly (marksly.pk) is a Pakistan-based school and campus management platform. It is not affiliated with any other similarly-named product, including marksly.in.',
      url: 'https://marksly.pk',
      logo: 'https://marksly.pk/logo-full.svg',
      email: 'support@marksly.pk',
      // Disambiguation signal for Google — Marksly is a Pakistan-based
      // company/product, distinct from any similarly-named site elsewhere
      // (e.g. marksly.in), which otherwise risks getting blended together
      // in AI Overviews/knowledge panels purely on name similarity.
      areaServed: { '@type': 'Country', name: 'Pakistan' },
      address: { '@type': 'PostalAddress', addressCountry: 'PK' },
      sameAs: ['https://wa.me/923175496466'],
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Marksly',
      alternateName: 'Marksly Pakistan',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'All-in-one school and campus management software for academies, schools, colleges and universities in Pakistan — students, attendance, fees, exams, timetable, ID cards and parent messaging.',
      disambiguatingDescription:
        'Marksly Pakistan (marksly.pk) — not affiliated with any other similarly-named school-management product, including marksly.in.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'PKR', description: 'Free plan for up to 50 students' },
      url: 'https://marksly.pk',
      areaServed: { '@type': 'Country', name: 'Pakistan' },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://marksly.pk/#website',
      url: 'https://marksly.pk',
      name: 'Marksly',
      publisher: { '@id': 'https://marksly.pk/#organization' },
    },
  ],
};

export function HomeJsonLd() {
  return (
    // eslint-disable-next-line react/no-danger
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
  );
}
