import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['var(--font-poppins)', 'sans-serif'],
      },
      colors: {
        primary: {
          main: '#FF7A1A',
          hover: '#E66A1B',
          light: '#FFF2E9',
        },
        surface: {
          white: '#FFFFFF',
          background: '#F5F6FA',
        },
        text: {
          primary: '#1A1A1A',
          secondary: '#666666',
          disabled: '#A3A3A3',
        },
        border: {
          light: '#E0E0E0',
          focus: '#FF7F27',
        },
        success: '#34A853',
        warning: '#FABE19',
        error: '#C44843',
        overlay: 'rgba(0,0,0,0.5)',
        placeholder: '#C4C4C4',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0px 2px 4px rgba(0, 0, 0, 0.05)',
        md: '0px 4px 12px rgba(0, 0, 0, 0.08)',
      },
      fontSize: {
        h1: ['32px', { lineHeight: '1.3', fontWeight: '600' }],
        h2: ['24px', { lineHeight: '1.3', fontWeight: '500' }],
        h3: ['18px', { lineHeight: '1.4', fontWeight: '500' }],
        'body-lg': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        button: ['16px', { lineHeight: '1', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};

export default config;
