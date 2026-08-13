import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background:  "var(--background)",
        foreground:  "var(--foreground)",

        card: {
          DEFAULT:    "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT:    "var(--popover)",
          foreground: "var(--popover-foreground)",
        },

        primary: {
          DEFAULT:    "var(--primary)",
          foreground: "var(--primary-foreground)",
          light:      "var(--primary-light)",
          dark:       "var(--primary-dark)",
          hover:      "var(--brand-hover)",
          muted:      "var(--brand-muted)",
        },

        secondary: {
          DEFAULT:    "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT:    "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT:    "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT:    "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },

        border: "var(--border)",
        input:  "var(--input)",
        ring:   "var(--ring)",

        sidebar: {
          DEFAULT:    "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          border:     "var(--sidebar-border)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        xs:  "var(--shadow-xs)",
        sm:  "var(--shadow-sm)",
        md:  "var(--shadow-md)",
        lg:  "var(--shadow-lg)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
      },
      keyframes: {
        "auth-fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "auth-fade-down": {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "mascot-bob": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "mascot-blink": {
          "0%, 92%, 100%": { transform: "scaleY(1)" },
          "96%": { transform: "scaleY(0.1)" },
        },
        "mascot-wave": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(20deg)" },
          "75%": { transform: "rotate(-10deg)" },
        },
        "dotgrid-drift": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "22px 22px" },
        },
      },
      animation: {
        "auth-fade-up": "auth-fade-up 0.6s ease-out forwards",
        "auth-fade-down": "auth-fade-down 0.5s ease-out forwards",
        "mascot-bob": "mascot-bob 3s ease-in-out infinite",
        "mascot-blink": "mascot-blink 4s ease-in-out infinite",
        "mascot-wave": "mascot-wave 1.8s ease-in-out infinite",
        "dotgrid-drift": "dotgrid-drift 6s linear infinite alternate",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
