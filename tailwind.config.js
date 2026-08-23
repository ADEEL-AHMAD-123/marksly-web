/** @type {import('tailwindcss').Config} */

/** Helper: maps a token to an hsl() that supports Tailwind opacity modifiers. */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

module.exports = {
  // Themes are driven by [data-theme="..."]; `dark` is just one of them,
  // so we don't use Tailwind's darkMode class strategy.
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        foreground: token('foreground'),

        card: {
          DEFAULT: token('card'),
          foreground: token('card-foreground'),
        },
        popover: {
          DEFAULT: token('popover'),
          foreground: token('popover-foreground'),
        },
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-foreground'),
          hover: token('primary-hover'),
          soft: token('primary-soft'),
          'soft-foreground': token('primary-soft-foreground'),
        },
        secondary: {
          DEFAULT: token('secondary'),
          foreground: token('secondary-foreground'),
        },
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-foreground'),
        },
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
        },
        success: {
          DEFAULT: token('success'),
          foreground: token('success-foreground'),
          soft: token('success-soft'),
        },
        warning: {
          DEFAULT: token('warning'),
          foreground: token('warning-foreground'),
          soft: token('warning-soft'),
        },
        danger: {
          DEFAULT: token('danger'),
          foreground: token('danger-foreground'),
          soft: token('danger-soft'),
        },
        info: {
          DEFAULT: token('info'),
          foreground: token('info-foreground'),
        },
        border: token('border'),
        input: token('input'),
        ring: token('ring'),

        sidebar: {
          DEFAULT: token('sidebar'),
          foreground: token('sidebar-foreground'),
          muted: token('sidebar-muted'),
          accent: token('sidebar-accent'),
          active: token('sidebar-active'),
          'active-foreground': token('sidebar-active-foreground'),
          border: token('sidebar-border'),
        },

        chart: {
          1: token('chart-1'),
          2: token('chart-2'),
          3: token('chart-3'),
          4: token('chart-4'),
          5: token('chart-5'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 0.25rem)',
        '2xl': 'calc(var(--radius) + 0.5rem)',
      },
      boxShadow: {
        sm: '0 1px 2px 0 hsl(var(--foreground) / 0.04), 0 1px 3px 0 hsl(var(--foreground) / 0.05)',
        DEFAULT: '0 2px 4px -1px hsl(var(--foreground) / 0.06), 0 4px 12px -2px hsl(var(--foreground) / 0.06)',
        md: '0 4px 10px -2px hsl(var(--foreground) / 0.08), 0 8px 24px -4px hsl(var(--foreground) / 0.07)',
        lg: '0 12px 28px -6px hsl(var(--foreground) / 0.12), 0 8px 16px -8px hsl(var(--foreground) / 0.08)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
