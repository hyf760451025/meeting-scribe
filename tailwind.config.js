/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'scribe': {
          bg: '#0f0f0f',
          surface: '#1a1a1a',
          border: '#2a2a2a',
          accent: '#6366f1',
          text: '#e4e4e7',
          muted: '#71717a',
        }
      },
      animation: {
        'wave-1': 'wave 1.2s ease-in-out infinite',
        'wave-2': 'wave 1.2s ease-in-out infinite 0.1s',
        'wave-3': 'wave 1.2s ease-in-out infinite 0.2s',
        'wave-4': 'wave 1.2s ease-in-out infinite 0.3s',
        'wave-5': 'wave 1.2s ease-in-out infinite 0.4s',
        'wave-6': 'wave 1.2s ease-in-out infinite 0.5s',
        'wave-7': 'wave 1.2s ease-in-out infinite 0.6s',
        'wave-8': 'wave 1.2s ease-in-out infinite 0.7s',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
