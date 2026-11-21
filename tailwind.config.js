/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        subtle: v('subtle'),
        accent: v('accent'),
        'accent-ink': v('accent-ink'),
        income: v('income'),
        expense: v('expense'),
        warn: v('warn'),
      },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        card: '0 1px 2px rgb(16 24 40 / 0.04), 0 1px 3px rgb(16 24 40 / 0.06)',
        soft: '0 1px 2px rgb(16 24 40 / 0.03), 0 10px 30px -14px rgb(16 24 40 / 0.12)',
        lift: '0 8px 24px -6px rgb(16 24 40 / 0.12), 0 2px 6px rgb(16 24 40 / 0.06)',
        float: '0 12px 32px -8px rgb(0 0 0 / 0.35)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        'pop-in': { from: { opacity: 0, transform: 'scale(.96) translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up .28s ease-out both',
        'fade-in': 'fade-in .2s ease-out both',
        'sheet-up': 'sheet-up .28s cubic-bezier(.2,.8,.2,1) both',
        'pop-in': 'pop-in .2s ease-out both',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};
