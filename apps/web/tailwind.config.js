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
        bg: "var(--bg)",
        surface: "var(--surface)",
        border: "var(--border)",
        ink: {
          DEFAULT: "var(--ink)",
          secondary: "var(--ink-secondary)",
          tertiary: "var(--ink-tertiary)",
        },
        apple: {
          blue: "var(--apple-blue)",
          "blue-hover": "var(--apple-blue-hover)",
          green: "var(--apple-green)",
          red: "var(--apple-red)",
          orange: "var(--apple-orange)",
          purple: "var(--apple-purple)",
        }
      },
      borderRadius: {
        '2xl': "18px",
        '3xl': "24px",
        '4xl': "32px",
        pill: "9999px"
      },
      boxShadow: {
        'apple-sm': "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
        'apple-card': "0 4px 24px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
        'apple-float': "0 12px 36px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.03)",
        'apple-glow': "0 0 24px rgba(0, 113, 227, 0.25)"
      }
    },
  },
  plugins: [],
}

