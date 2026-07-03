import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f0f13",
        surface: "#1a1a24",
        "surface-2": "#23233a",
        accent: "#6c63ff",
        "accent-hover": "#5a52e0",
      },
    },
  },
  plugins: [],
};
export default config;
