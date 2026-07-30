/**
 * Marketing surfaces (auth, legal, blog) are light-only — the flight-mode
 * ground-crew look — regardless of the user's in-app theme. Scoping the
 * :root light tokens onto a wrapper overrides html.dark for everything
 * inside, so shadcn components (Card, Input, Button) render light without
 * touching their code.
 */
export const MARKETING_LIGHT_VARS = {
  "--background": "#FAFAF8",
  "--foreground": "#1a1720",
  "--card": "#ffffff",
  "--card-foreground": "#1a1720",
  "--popover": "#ffffff",
  "--popover-foreground": "#1a1720",
  "--primary": "#5B4BD9",
  "--primary-foreground": "#ffffff",
  "--secondary": "#F5F4F1",
  "--secondary-foreground": "#1a1720",
  "--muted": "#F5F4F1",
  "--muted-foreground": "#625E6D",
  "--accent": "#F5F4F1",
  "--accent-foreground": "#1a1720",
  "--border": "#E8E6E1",
  "--input": "#E8E6E1",
  "--ring": "#5B4BD9",
} as React.CSSProperties;

/** the concept-D sky, condensed for satellite pages */
export const MARKETING_SKY =
  "linear-gradient(180deg, #BFD9EC 0%, #DEE9EF 42%, #F6F5F1 100%)";
