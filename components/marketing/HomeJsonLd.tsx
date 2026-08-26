const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://marksly.pk/#organization',
      name: 'Marksly',
      url: 'https://marksly.pk',
      logo: 'https://marksly.pk/logo-full.svg',
      email: 'support@marksly.pk',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Marksly',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'All-in-one school and campus management software for academies, schools, colleges and universities — students, attendance, fees, exams, timetable, ID cards and parent messaging.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'PKR', description: 'Free plan for up to 50 students' },
      url: 'https://marksly.pk',
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
