import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Tajawal", "Cairo", "sans-serif"],
      },
      colors: {
        // اللون الحكومي الهادئ والرصين المعتمد
        gov: {
          50:  "#f0f5fa",
          100: "#e2ecf5",
          200: "#c5d9eb",
          300: "#99bfe0",
          400: "#639dd0",
          500: "#3d80bf",
          600: "#1F4E79", // اللون الرئيسي الحكومي الرصين
          700: "#184064",
          800: "#143350",
          900: "#10283e",
          950: "#0a1827",
        },
        accent: {
          50:  "#fffbeb",
          100: "#fef3c7",
          500: "#d97706",
          600: "#b45309",
          700: "#92400e",
        },
      },
      boxShadow: {
        "card": "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        "card-hover": "0 4px 12px 0 rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
