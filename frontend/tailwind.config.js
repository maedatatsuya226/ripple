/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#0b0b14",
        neonBlue: "#00d2ff",
        neonPurple: "#b026ff",
        neonPink: "#ff007f",
        glass: "rgba(255, 255, 255, 0.05)",
        glassHover: "rgba(255, 255, 255, 0.1)",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-dark': 'radial-gradient(circle at 50% 50%, rgba(11, 11, 20, 1) 0%, rgba(5, 5, 10, 1) 100%)',
      },
      fontFamily: {
        sans: ['"Inter"', '"Outfit"', '"Noto Sans JP"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
