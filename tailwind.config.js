/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    // Custom scrollbar classes
    'custom-scrollbar',
    'sticky-header',
    // Button 3D effect classes
    'btn-3d',
    'btn-press',
    'btn-retro',
    'shadow-3d-sm',
    'shadow-3d-md',
    'shadow-3d-lg',
    'panel-3d',
    // Animation classes
    'takeover-glow',
    'takeover-celebration',
    'takeover-badge',
    'takeover-rocket',
    'takeover-float',
    'takeover-pulse',
  ],
};
