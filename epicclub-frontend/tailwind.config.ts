import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A5F',
          50:  '#E8EFF7',
          100: '#C5D6EA',
          200: '#9FBCDA',
          300: '#79A2CA',
          400: '#5388BB',
          500: '#1E3A5F',
          600: '#193250',
          700: '#142941',
          800: '#0F1F32',
          900: '#0A1623',
        },
        secondary: {
          DEFAULT: '#7C3AED',
          50:  '#F5EEFF',
          100: '#E5D0FD',
          200: '#C9A1FB',
          300: '#AD72F9',
          400: '#9143F7',
          500: '#7C3AED',
          600: '#6A2FCC',
          700: '#5824AB',
          800: '#46198A',
          900: '#340E69',
        },
        accent: {
          DEFAULT: '#06B6D4',
          50:  '#E0F8FD',
          100: '#B3EFF9',
          200: '#80E3F5',
          300: '#4DD8F1',
          400: '#26CBED',
          500: '#06B6D4',
          600: '#059BB5',
          700: '#047F96',
          800: '#036377',
          900: '#024757',
        },
        background: '#0F172A',
        surface: {
          DEFAULT: '#1E293B',
          2: '#334155',
          3: '#475569',
        },
        'text-primary': '#F1F5F9',
        'text-secondary': '#94A3B8',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        border: '#334155',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glow:        '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-blue': '0 0 20px rgba(30, 58, 95, 0.5)',
        card:        '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover':'0 8px 40px rgba(0, 0, 0, 0.6)',
      },
      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'gradient-hero':    'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
        'gradient-primary': 'linear-gradient(135deg, #1E3A5F, #7C3AED)',
        'gradient-accent':  'linear-gradient(135deg, #7C3AED, #06B6D4)',
        'gradient-card':    'linear-gradient(145deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
      },
      animation: {
        'fade-in':      'fadeIn 0.3s ease-out',
        'slide-up':     'slideUp 0.4s ease-out',
        'slide-in':     'slideIn 0.3s ease-out',
        'scale-in':     'scaleIn 0.15s ease-out',
        'pulse-slow':   'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow-pulse':   'glowPulse 2s ease-in-out infinite',
        'spin-slow':    'spin 3s linear infinite',
        'bounce-soft':  'bounceSoft 1s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92) translateY(-4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(124,58,237,0.3)' },
          '50%':      { boxShadow: '0 0 30px rgba(124,58,237,0.6)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
