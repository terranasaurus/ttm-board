import type { Config } from "tailwindcss";

import baseConfig from "@kan/tailwind-config/web";

export default {
  darkMode: "class",
  content: [...baseConfig.content],
  plugins: [require("@tailwindcss/typography")],
  presets: [baseConfig],
  theme: {
    extend: {
      fontFamily: {
<<<<<<< HEAD
        sans: ["var(--font-montserrat)", ...fontFamily.sans],
        mono: fontFamily.mono,
=======
        sans: ["var(--font-jakarta)"],
>>>>>>> upstream/main
      },
    },
  },
} satisfies Config;
