import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#080910',
          surface: '#0E1018',
          elevated: '#141722',
        },
        border: '#1E2235',
        fire: '#FF5F2D',
        growth: '#10E8AA',
        danger: '#FF3B4E',
        info: '#4D9DFF',
        text: {
          primary: '#DCE0FF',
          muted: '#616880',
        },
        agent: {
          investor: '#FF8C42',
          customer: '#10E8AA',
          competitor: '#FF3B4E',
          journalist: '#4D9DFF',
          employee: '#9BA8C4',
          system: '#616880',
        },
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        scanline: 'scanline 8s linear infinite',
      },
      keyframes: {
        blink: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        scanline: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100vh)' } },
      },
    },
  },
  plugins: [],
}

export default config
