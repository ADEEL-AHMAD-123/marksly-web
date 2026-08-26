import type { MetadataRoute } from 'next';

// Next.js auto-generates /manifest.webmanifest from this file and (once
// linked via metadata.manifest in layout.tsx) serves it with the correct
// content-type. Mainly an "add to home screen" / PWA-adjacent signal — icons
// reuse the same app/icon.svg and app/apple-icon.png Next already picks up
// automatically for favicon/apple-touch-icon, so there's nothing new to
// design here, just declaring them for the manifest spec.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Marksly — School & Campus Management Software',
    short_name: 'Marksly',
    description:
      'Marksly is the complete school management platform for academies, schools, colleges and universities.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF8F3',
    theme_color: '#1F3357',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
