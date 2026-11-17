import type { Config } from "tailwindcss";

/**
 * Design tokens. A calm, cool workspace with one pine accent; priority and
 * status signals always pair colour with icon and text (never colour alone).
 *
 * Colours are CSS variables (see globals.css) so the same class names work in
 * both light and dark themes. `brand` is the filled-surface accent (buttons,
 * user bubbles); `pine-600` stays the accent for text and icons, which needs a
 * lighter value in dark mode than a filled button with white text does.
 */
const rgb = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: rgb("--paper"),
        surface: rgb("--surface"),
        ink: { DEFAULT: rgb("--ink"), soft: rgb("--ink-soft"), muted: rgb("--ink-muted"), faint: rgb("--ink-faint") },
        line: { DEFAULT: rgb("--line"), strong: rgb("--line-strong") },
        pine: {
          50: rgb("--pine-50"),
          100: rgb("--pine-100"),
          200: rgb("--pine-200"),
          500: rgb("--pine-500"),
          600: rgb("--pine-600"),
          700: rgb("--pine-700"),
          800: rgb("--pine-800"),
        },
        brand: { DEFAULT: rgb("--brand"), hover: rgb("--brand-hover") },
        danger: { DEFAULT: rgb("--danger"), hover: rgb("--danger-hover") },
        overlay: rgb("--overlay"),
        critical: { bg: rgb("--critical-bg"), fg: rgb("--critical-fg"), line: rgb("--critical-line") },
        high: { bg: rgb("--high-bg"), fg: rgb("--high-fg"), line: rgb("--high-line") },
        medium: { bg: rgb("--medium-bg"), fg: rgb("--medium-fg"), line: rgb("--medium-line") },
        low: { bg: rgb("--low-bg"), fg: rgb("--low-fg"), line: rgb("--low-line") },
        positive: { bg: rgb("--positive-bg"), fg: rgb("--positive-fg") },
        verve: {
          bg: rgb("--v-bg"),
          surface: rgb("--v-surface"),
          soft: rgb("--v-soft"),
          sunken: rgb("--v-sunken"),
          ink: rgb("--v-ink"),
          muted: rgb("--v-muted"),
          subtle: rgb("--v-subtle"),
          line: rgb("--v-line"),
          forest: rgb("--v-forest"),
          lime: rgb("--v-lime"),
          onForest: rgb("--v-on-forest"),
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: { DEFAULT: "6px", md: "8px", lg: "10px", xl: "14px" },
      boxShadow: {
        card: "0 1px 0 rgba(0,0,0,0.06)",
        pop: "0 12px 32px -8px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.12)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "rise-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        "fill-bar": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "rise-in": "rise-in 220ms cubic-bezier(.2,.8,.2,1)",
        "fill-bar": "fill-bar 600ms cubic-bezier(.2,.8,.2,1) both",
        marquee: "marquee 26s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
