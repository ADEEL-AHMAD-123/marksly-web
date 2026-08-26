const SCHOOLS = [
  { name: 'Al-Noor Scholars Academy', urdu: 'النور اسکالرز اکیڈمی', logo: '/logos/al-noor-scholars-academy.png' },
  { name: 'Quaid-e-Azam Future School', urdu: 'قائد اعظم فیوچر اسکول', logo: '/logos/quaid-e-azam-future-school.png' },
  { name: 'Pak Crescent School System', urdu: 'پاک کریسنٹ اسکول سسٹم', logo: '/logos/pak-crescent-school-system.png' },
  { name: 'The Knowledge Gate School', logo: '/logos/the-knowledge-gate-school.png' },
  { name: 'Iqbal Heights School', urdu: 'اقبال ہائٹس اسکول', logo: '/logos/iqbal-heights-school.png' },
  { name: 'National Scholars Academy', urdu: 'نیشنل اسکالرز اکیڈمی', logo: '/logos/national-scholars-academy.png' },
  { name: 'Roshan Taleem School', logo: '/logos/roshan-taleem-school.png' },
  { name: 'Unity Grammar School', logo: '/logos/unity-grammar-school.png' },
  { name: 'Green Valley Scholars School', logo: '/logos/green-valley-scholars-school.png' },
  { name: 'The Learning House Pakistan', logo: '/logos/the-learning-house-pakistan.png' },
];

const COLLEGES = [
  { name: 'Crescent College of Excellence', urdu: 'کریسنٹ کالج آف ایکسیلنس', logo: '/logos/crescent-college-of-excellence.png' },
  { name: 'National Institute of Modern Studies', urdu: 'نیشنل انسٹی ٹیوٹ آف ماڈرن اسٹڈیز', logo: '/logos/national-institute-of-modern-studies.png' },
  { name: 'Quaid Scholars College', urdu: 'قائد اسکالرز کالج', logo: '/logos/quaid-scholars-college.png' },
  { name: 'Pakistan College of Advanced Learning', logo: '/logos/pakistan-college-of-advanced-learning.png' },
  { name: 'Iqbal Institute of Higher Education', logo: '/logos/iqbal-institute-of-higher-education.png' },
  { name: 'Horizon College Islamabad', logo: '/logos/horizon-college-islamabad.png' },
  { name: 'Al-Falah College of Studies', logo: '/logos/al-falah-college-of-studies.png' },
  { name: 'Future Minds College', logo: '/logos/future-minds-college.png' },
  { name: 'Capital Scholars College', logo: '/logos/capital-scholars-college.png' },
  { name: 'The Excellence College Pakistan', logo: '/logos/the-excellence-college-pakistan.png' },
];

type Institution = { name: string; urdu?: string; logo: string };

function MarqueeRow({ items, direction }: { items: Institution[]; direction: 'left' | 'right' }) {
  const track = [...items, ...items]; // duplicated for seamless loop
  return (
    <div className="marquee-track relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[hsl(36,26%,92%)] to-transparent sm:w-28" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[hsl(36,26%,92%)] to-transparent sm:w-28" />
      <div className={`flex w-max items-center gap-6 sm:gap-12 ${direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'}`}>
        {track.map((inst, i) => {
          const isDuplicate = i >= items.length; // second half exists only for the seamless loop
          return (
            <div key={`${inst.name}-${i}`} aria-hidden={isDuplicate} className="flex shrink-0 items-center gap-2 sm:gap-3">
              {/* alt is the institution name even on the duplicated second
                  half — the wrapping div's aria-hidden (above) is what
                  actually removes these from the accessibility tree, so an
                  empty alt here was redundant AND got flagged by automated
                  SEO checkers (Bing Webmaster Tools) as "missing alt", since
                  they don't infer aria-hidden context on the parent. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inst.logo}
                alt={inst.name}
                width={52}
                height={52}
                className="h-9 w-9 shrink-0 rounded-full shadow-sm sm:h-[52px] sm:w-[52px]"
              />
              <p className="whitespace-nowrap text-xs font-semibold leading-none text-foreground sm:text-sm">{inst.name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HomeTrustLogos() {
  return (
    <section className="border-y border-border bg-[hsl(36,26%,92%)] pb-16 pt-20 sm:pb-20 sm:pt-24">
      <div className="mx-auto max-w-6xl px-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Trusted by real institutions</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Schools and colleges running on Marksly</h2>
      </div>

      <div className="mt-8 space-y-6 sm:mt-12 sm:space-y-8">
        <MarqueeRow items={SCHOOLS} direction="left" />
        <MarqueeRow items={COLLEGES} direction="right" />
      </div>

    </section>
  );
}
