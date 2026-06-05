/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        seedling: {
          50: "#E8F5E9",
          100: "#C8E6C9",
          200: "#A5D6A7",
          300: "#81C784",
          400: "#66BB6A",
          500: "#43A047",
          600: "#2E7D32",
          700: "#1B5E20",
          800: "#145216",
          900: "#0D3B0F",
        },
      },
    },
  },
  plugins: [],
};
