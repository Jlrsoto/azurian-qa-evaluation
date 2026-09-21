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
        azurian: {
          50: '#f0f4fa',
          100: '#d9e2f2',
          500: '#1b4d89',
          600: '#153e70',
          700: '#102e54',
          800: '#0c203b',
          900: '#061120',
        },
      },
    },
  },
  plugins: [],
};
export default config;
