import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F8FB",
        surface: {
          DEFAULT: "#FFFFFF",
          sunken: "#EEF0F6",
        },
        border: "#DDE1EA",
        ink: {
          DEFAULT: "#262B3A",
          muted: "#6B7280",
        },
        accent: {
          primary: "#8FAADC",
          "primary-hover": "#7D9BCF",
          success: "#A7D8C5",
          warning: "#F2C98E",
          danger: "#E8A9A3",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
