/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#10b981",
        "primary-dark": "#059669",
        accent: "#047857",
        "background-light": "#ffffff",
        "background-alt": "#f8fafc",
        charcoal: "#1e293b",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
