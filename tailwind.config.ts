import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#ff0033",
          50: "#fff1f3",
          100: "#ffe1e4",
          200: "#ffbec5",
          300: "#ff8c9a",
          400: "#ff4f6a",
          500: "#ff0033",
          600: "#db002e",
          700: "#b70029",
          800: "#930023",
          900: "#6f001c"
        }
      }
    }
  },
  plugins: []
};

export default config;
