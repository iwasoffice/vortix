import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vortix: {
          bg: "#0B0E14",
          panel: "#131826",
          accent: "#5B8CFF",
          success: "#31D0AA",
          danger: "#FF5C5C",
          muted: "#7A8699",
        },
      },
    },
  },
  plugins: [],
};
export default config;
