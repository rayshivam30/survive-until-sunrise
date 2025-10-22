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
        'terminal-green': '#00ff00',
        'terminal-amber': '#ffbf00',
        'terminal-red': '#ff0000',
        'terminal-bg': '#000000',
        'terminal-gray': '#333333',
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
      },
      animation: {
        'glitch': 'glitch 0.3s infinite',
        'pulse-slow': 'pulse 2s infinite',
        'typing': 'typing 2s steps(40, end)',
      },
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        typing: {
          'from': { width: '0' },
          'to': { width: '100%' },
        },
      },
      boxShadow: {
        'terminal': '0 0 10px #00ff00',
        'terminal-red': '0 0 10px #ff0000',
        'terminal-amber': '0 0 10px #ffbf00',
      },
    },
  },
  plugins: [],
}