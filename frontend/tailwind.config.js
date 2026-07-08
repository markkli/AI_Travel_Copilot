/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        forest: {
          50:  "#eef5f0",
          100: "#d5e8db",
          200: "#a8d1b5",
          300: "#72b48a",
          400: "#449964",
          500: "#277946",
          600: "#1c5f37",
          700: "#17492b",
          800: "#13391f",
          900: "#0D1F17",
          950: "#06100b",
        },
        gold: {
          300: "#EDCF72",
          400: "#DEB840",
          500: "#C9A028",
          600: "#9E7C18",
          700: "#7A5C10",
        },
        cream: {
          50:  "#FDFCFA",
          100: "#F9F6F0",
          200: "#F0EBE3",
          300: "#E5DDD1",
          400: "#D6CCBF",
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', "Georgia", "Times New Roman", "serif"],
        sans:  ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in":  "fadeIn 0.4s ease-out both",
        "slide-up": "slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "shimmer":  "shimmer 1.8s linear infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
