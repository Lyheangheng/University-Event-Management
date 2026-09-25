/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        university: {
          50: "#fdf2f3",
          100: "#fbe5e7",
          200: "#f7ced2",
          600: "#a32235",
          700: "#8b1e2d",
          800: "#741825",
          900: "#5d121c",
        },
      },
      borderRadius: {
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};

