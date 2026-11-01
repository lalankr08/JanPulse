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
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        brand: "var(--brand)",
        "brand-soft": "var(--brand-soft)",
        accent: "var(--accent)",
        verdict: {
          supported: {
            bg: "#E6F0E9",
            text: "#2B5C42"
          },
          contradicted: {
            bg: "#F7E4E0",
            text: "#8E3326"
          },
          partly: {
            bg: "#F6ECD3",
            text: "#7A5413"
          },
          unverified: {
            bg: "#E9EDF2",
            text: "#455064"
          }
        }
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        pill: "var(--r-pill)"
      },
      fontFamily: {
        serif: ["var(--font-head)"],
        sans: ["var(--font-body)"]
      }
    },
  },
  plugins: [],
}

