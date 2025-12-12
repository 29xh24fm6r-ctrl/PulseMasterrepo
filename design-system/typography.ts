// Global Design System v3 - Typography
// design-system/typography.ts
// Optimized for light backgrounds and readability

export const typography = {
  // Font families
  fontFamily: {
    display: '"Inter Tight", system-ui, sans-serif',
    heading: '"Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },

  // Font sizes (optimized for hero sections and readability)
  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px - body text
    lg: "1.125rem", // 18px - section headers
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px - hero titles
    "4xl": "2.25rem", // 36px - large hero
    "5xl": "3rem", // 48px - extra large hero
    "6xl": "3.75rem", // 60px - display
  },

  // Font weights
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  letterSpacing: {
    tight: "-0.025em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
  },

  // Typography presets for common use cases
  presets: {
    hero: {
      fontSize: "2.5rem", // 40px (text-4xl)
      fontWeight: 800, // font-extrabold
      lineHeight: 1.2,
      letterSpacing: "-0.025em", // tracking-tight
    },
    heroSubtitle: {
      fontSize: "1.25rem", // 20px
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: "0em",
    },
    sectionHeader: {
      fontSize: "1.25rem", // 20px (text-xl)
      fontWeight: 600, // font-semibold
      lineHeight: 1.4,
      letterSpacing: "-0.01em",
    },
    body: {
      fontSize: "1rem", // 16px (text-md)
      fontWeight: 400,
      lineHeight: 1.75, // leading-relaxed
      letterSpacing: "0em",
    },
    microcopy: {
      fontSize: "0.875rem", // 14px (text-sm)
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: "0em",
    },
    stat: {
      fontSize: "1.875rem", // 30px
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "-0.02em",
    },
  },
} as const;
