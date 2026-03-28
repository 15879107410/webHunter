import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/shared/src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8f9fa",
        primary: "#006953",
        primaryContainer: "#008469",
        surface: "#ffffff",
        surfaceAlt: "#edeeef",
        outline: "#bccac3",
        textPrimary: "#191c1d",
        textMuted: "#55656d",
        warning: "#c76f00",
        danger: "#ba1a1a"
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Inter", "sans-serif"]
      },
      boxShadow: {
        soft: "0 20px 40px rgba(25, 28, 29, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;

