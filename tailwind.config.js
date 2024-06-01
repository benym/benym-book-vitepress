/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./docs/src/.vitepress/**/*.{vue,js}", "./docs/**/*.md"],
  theme: {
    extend: {
      colors: {
        VPLight: "#3451b2",
        VPDark: "#a8b1ff",
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
