/** @type {import('tailwindcss').Config} */
const { COLORS } = require("./src/constants/theme");

module.exports = {
  // This tells Tailwind exactly where your screens are
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: COLORS,
    },
    fontFamily: {
      m: ["Montserrat_400Regular"],
      "m-med": ["Montserrat_500Medium"],
      "m-semi": ["Montserrat_600SemiBold"],
      "m-bold": ["Montserrat_700Bold"],
      "m-extra": ["Montserrat_800ExtraBold"],
    },
  },
  plugins: [],
};
