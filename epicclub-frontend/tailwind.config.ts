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
        epic: {
          cyan: '#2DC5D9',
          'cyan-btn': '#38C9D8',
          navy: '#173B47',
          'navy-light': '#245262',
          muted: '#66858F',
          border: '#CFE8ED',
          bg: '#F5FBFD',
          white: '#FFFFFF',
          mint: '#45CBB4',
          orange: '#F49A67',
          coral: '#F18368',
          purple: '#7F91FF',
        },
        primary: {
          DEFAULT: '#2DC5D9',
          50:  '#F0FAFC',
          100: '#DBF4F8',
          200: '#B8EBF2',
          300: '#8AE0EB',
          400: '#52D2E2',
          500: '#2DC5D9',
          600: '#1BA4B6',
          700: '#198393',
          800: '#1B6976',
          900: '#1B5762',
        },
        secondary: {
          DEFAULT: '#7F91FF',
          50:  '#F4F6FF',
          100: '#E9ECFF',
          200: '#D5DAFF',
          300: '#B4BCFF',
          400: '#949EFF',
          500: '#7F91FF',
          600: '#6372FA',
          700: '#4F5BE7',
          800: '#414BC5',
          900: '#373FA0',
        },
        accent: {
          DEFAULT: '#38C9D8',
          50:  '#EBFBFC',
          100: '#CEF6F9',
          200: '#A1EDF4',
          300: '#64DFEC',
          400: '#38C9D8',
          500: '#1AB0BF',
          600: '#148E9D',
          700: '#16717E',
          800: '#185B65',
          900: '#184C55',
        },
        background: '#F5FBFD',
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#F0F8FA',
          3: '#E4F2F5',
        },
        'text-primary': '#173B47',
        'text-secondary': '#66858F',
        success: '#45CBB4',
        warning: '#F49A67',
        error: '#F18368',
        border: '#CFE8ED',
      },
      fontFamily: {
        sans: ['Cairo', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        cairo: ['Cairo', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
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
