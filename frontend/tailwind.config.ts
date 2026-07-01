import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // DEX theme — white/light
        "dex-bg":        "#F8F9FB",       // page background
        "dex-surface":   "#FFFFFF",        // card / panel background
        "dex-surface-2": "#F3F4F6",        // subtle hover / secondary surface
        "dex-border":    "#E5E7EB",        // borders & dividers
        "dex-text":      "#111827",        // primary text
        "dex-muted":     "#6B7280",        // secondary/muted text
        "dex-pink":      "#7C3AED",        // primary accent (violet)
        "dex-pink-light":"#EDE9FE",        // light accent bg
        "dex-purple":    "#5B21B6",        // darker accent
        "dex-blue":      "#2563EB",        // info / link
        "dex-green":     "#059669",        // success
        "dex-red":       "#DC2626",        // error/danger
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      animation: {
        "spin-slow":    "spin 3s linear infinite",
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":      "fadeIn 0.2s ease-out",
        "slide-down":   "slideDown 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideDown: {
          "0%":   { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        "card":  "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-md": "0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)",
        "card-lg": "0 8px 24px 0 rgb(0 0 0 / 0.10), 0 4px 8px -2px rgb(0 0 0 / 0.06)",
        "dropdown": "0 10px 40px 0 rgb(0 0 0 / 0.12), 0 2px 8px -2px rgb(0 0 0 / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
