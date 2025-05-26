/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        whiteBg: "#FFEDE8",
        orangeBg: "#E09E7A",
        lightPink: "#E27A82",
        orangeButton: "#C88B6E",
        headingColor: "#181A1E",
        textColor: "#262626",
        textOnOrange: "#1E1E1E",
        orangeText: "#C45E3E",
        buttonTextBlack: "#313131",
        orangeHeader: "#BD704C",
        lightOrange: "#e0c3b8",
      },
      boxShadow: {
        panelShadow: "rgba(17, 12, 46, 0.15) 0px 48px 100px 0px;",
      },
    },
  },
  plugins: [],
};
