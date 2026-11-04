/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        akai: {
          dark: '#121316',
          chassis: '#1a1c22',
          surface: '#22252c',
          panel: '#15171c',
          bezel: '#0d0e12',
          red: '#d91424',
          brightRed: '#ff2a3b',
          crimson: '#8a0d17',
          gold: '#f59e0b',
          blue: '#00d2ff',
          green: '#10b981',
          amber: '#f97316',
          screenBg: '#090b0e',
          screenSurface: '#11151c',
          screenBorder: '#1c222e',
          padDefault: '#323742',
          padBorder: '#1e2129'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'hardware-outer': '0 25px 60px -15px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.1)',
        'bezel-inner': 'inset 0 3px 6px rgba(0,0,0,0.8), inset 0 -1px 2px rgba(255,255,255,0.05)',
        'pad-rest': '0 4px 6px -1px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.4)',
        'pad-active': 'inset 0 2px 4px rgba(0,0,0,0.6), 0 0 16px',
        'knob': '0 8px 16px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.8)',
        'button-tactile': '0 3px 4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -2px 0 rgba(0,0,0,0.4)',
        'screen-glow': 'inset 0 0 30px rgba(0, 160, 255, 0.03), 0 0 1px rgba(255,255,255,0.1)',
      }
    },
  },
  plugins: [],
}
