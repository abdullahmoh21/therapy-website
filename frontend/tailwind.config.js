/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        whiteBg: "#FFEDE8",
        orangeBg: "#E09E7A",
        lightPink: "#E27A82",
        darkPink: "#D16870",
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
      animation: {
        "spin-slow": "spin 3s linear infinite",
        slideUpFade: "slideUpFade 200ms ease-out",
        fadeIn: "fadeIn 150ms ease-in",
      },
      keyframes: {
        slideUpFade: {
          "0%": {
            opacity: "0",
            transform: "translateY(12px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        fadeIn: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
      },
    },
  },
  plugins: [],
};
