import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: [
          "'Inter Variable'",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "'SF Pro Text'",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
        // Editorial title face — used ONLY on page/object titles + the login
        // wordmark. Everything numeric stays sans/mono.
        display: ["Fraunces", "'Iowan Old Style'", "Palatino", "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        // Named steps that collapse the 13-size sprawl into one scale.
        overline: [
          "0.6875rem",
          { lineHeight: "1rem", letterSpacing: "0.08em", fontWeight: "600" },
        ],
        table: ["0.8125rem", { lineHeight: "1.25rem" }],
        // Weight is set by explicit font-* classes at each call site so it never
        // fights the embedded weight.
        display: ["1.625rem", { lineHeight: "2.125rem", letterSpacing: "-0.02em" }],
        money: ["2rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          border: "hsl(var(--sidebar-border))",
        },
        success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          strong: "hsl(var(--warning-strong))",
        },
        info: { DEFAULT: "hsl(var(--info))", foreground: "hsl(var(--info-foreground))" },
        violet: { DEFAULT: "hsl(var(--violet))", foreground: "hsl(var(--violet-foreground))" },
        overlay: "hsl(var(--overlay))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)",
        elevated:
          "0 12px 32px -8px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.06)",
        // Lit top-edge + soft drop for pressable primary buttons.
        pressable:
          "inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 1px 2px rgba(15, 23, 42, 0.24)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "modal-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
        "slide-up": "slide-up 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "modal-in": "modal-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
