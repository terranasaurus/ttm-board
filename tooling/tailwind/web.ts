import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import scrollbar from "tailwind-scrollbar";

export default {
  content: ["./src/**/*.tsx"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-montserrat), Montserrat"],
      },
      fontSize: {
        sm: "0.8rem",
      },
      boxShadow: {
        "3xl-dark": "0px 16px 70px rgba(0, 0, 0, 0.5)",
        "3xl-light":
          "rgba(0, 0, 0, 0.12) 0px 4px 30px, rgba(0, 0, 0, 0.04) 0px 3px 17px, rgba(0, 0, 0, 0.04) 0px 2px 8px, rgba(0, 0, 0, 0.04) 0px 1px 1px",
      },
      animation: {
        "border-spin": "border-spin 4s linear infinite",
        "fade-down": "fade-down 0.5s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        scroll: "scroll 40s linear infinite",
      },

      keyframes: {
        "border-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "fade-down": {
          "0%": {
            opacity: "0",
            transform: "translateY(-20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
        scroll: {
          "0%": {
            transform: "translateX(0)",
          },
          "100%": {
            transform: "translateX(calc(-50% - 1.5rem))",
          },
        },
      },
      // TTM brand: green #134c00, orange #ff7900, gold #ffb000.
      // The light/dark scales keep Kan's names so every component picks up
      // the brand without per-file changes; dark mode uses the website's
      // deep greens (#092100 / #0a2a00) instead of neutral greys.
      colors: {
        ttm: {
          green: "#134c00",
          "green-deep": "#0a2a00",
          orange: "#ff7900",
          "orange-hover": "#e66a00",
          gold: "#ffb000",
          "gold-light": "#ffc340",
          gray: "#b3b3b3",
          "warm-gray": "#f6f6f6",
        },
        "dark-50": "#071a00",
        "dark-100": "#0b2203",
        "dark-200": "#102b07",
        "dark-300": "#14330b",
        "dark-400": "#1a3c10",
        "dark-500": "#204616",
        "dark-600": "#2a5320",
        "dark-700": "#3c6733",
        "dark-800": "#64835c",
        "dark-900": "#7f9a78",
        "dark-950": "#c2cfbe",
        "dark-1000": "#f1f5ef",
        "light-50": "#fdfdfc",
        "light-100": "#f6f6f6",
        "light-200": "#f1f3f0",
        "light-300": "#eaf0e8",
        "light-400": "#e3e9e0",
        "light-500": "#dae1d7",
        "light-600": "#cfd8cb",
        "light-700": "#b3b3b3",
        "light-800": "#8b9487",
        "light-900": "#717c6d",
        "light-950": "#4a4a4a",
        "light-1000": "#0a2a00",
      },
      screens: {
        "2xl": "1600px",
      },
    },
  },
  plugins: [forms, scrollbar],
} satisfies Config;
