/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 'ruby' key kept so every existing ruby-* class re-themes to green at once
        ruby: {
          50:  '#eef7f2',
          100: '#d6ece0',
          200: '#aedcc3',
          300: '#7cc4a1',
          400: '#46a67c',
          500: '#1f8a60',
          600: '#16654a', // EMERALD — buttons, links, icon accents
          700: '#124f3a',
          800: '#0e3b2e', // FOREST — PRIMARY BRAND
          900: '#0a2a21',
          950: '#051912',
        },
        brass: {
          DEFAULT: '#c8a24b',
          light:   '#e2c77e',
          dark:    '#a8842f',
        },
        glass: {
          white: 'rgba(255,255,255,0.72)',
          muted: 'rgba(255,255,255,0.42)',
          border: 'rgba(255,255,255,0.55)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(14, 59, 46, 0.08)',
        'glass-lg': '0 16px 64px 0 rgba(14, 59, 46, 0.12)',
        'glass-ruby': '0 8px 32px 0 rgba(22, 101, 74, 0.18)',
        'ruby-glow': '0 0 32px rgba(22, 101, 74, 0.30), 0 4px 16px rgba(22, 101, 74, 0.18)',
        'tile-active': '0 0 0 2px rgba(22,101,74,0.30), 0 20px 60px rgba(14,59,46,0.14)',
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
        'pulse-ruby': 'pulseRuby 2.4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseRuby: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(22,101,74,0.28), 0 0 60px rgba(22,101,74,0.10)' },
          '50%':      { boxShadow: '0 0 40px rgba(22,101,74,0.45), 0 0 80px rgba(22,101,74,0.22)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        fadeInUp: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(24px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.94)' },
          to:   { opacity: 1, transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'mesh-light': `
          radial-gradient(at 20% 20%, rgba(22,101,74,0.07) 0%, transparent 50%),
          radial-gradient(at 80% 10%, rgba(200,162,75,0.05) 0%, transparent 40%),
          radial-gradient(at 60% 80%, rgba(14,59,46,0.04) 0%, transparent 40%)
        `,
        'shimmer-gradient': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
      },
    },
  },
  plugins: [],
};
