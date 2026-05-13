const tokens = {
  colors: {
    "surface": "#fbf9fa",
    "surface-dim": "#dbd9db",
    "surface-bright": "#fbf9fa",
    "surface-container-lowest": "#ffffff",
    "surface-container-low": "#f5f3f4",
    "surface-container": "#efedef",
    "surface-container-high": "#e9e8e9",
    "surface-container-highest": "#e4e2e3",
    "on-surface": "#1b1c1d",
    "on-surface-variant": "#43474c",
    "inverse-surface": "#303032",
    "inverse-on-surface": "#f2f0f2",
    "outline": "#74777d",
    "outline-variant": "#c4c6cd",
    "surface-tint": "#4e6073",
    "primary": "#162839",
    "on-primary": "#ffffff",
    "primary-container": "#2c3e50",
    "on-primary-container": "#96a9be",
    "inverse-primary": "#b5c8df",
    "secondary": "#a43a3d",
    "on-secondary": "#ffffff",
    "secondary-container": "#ff7f7f",
    "on-secondary-container": "#74161e",
    "tertiary": "#362308",
    "on-tertiary": "#ffffff",
    "tertiary-container": "#4e381c",
    "on-tertiary-container": "#c1a17d",
    "error": "#ba1a1a",
    "on-error": "#ffffff",
    "error-container": "#ffdad6",
    "on-error-container": "#93000a",
    "primary-fixed": "#d1e4fb",
    "primary-fixed-dim": "#b5c8df",
    "on-primary-fixed": "#091d2e",
    "on-primary-fixed-variant": "#36485b",
    "secondary-fixed": "#ffdad8",
    "secondary-fixed-dim": "#ffb3b1",
    "on-secondary-fixed": "#410007",
    "on-secondary-fixed-variant": "#842228",
    "tertiary-fixed": "#ffddb7",
    "tertiary-fixed-dim": "#e3c19b",
    "on-tertiary-fixed": "#291802",
    "on-tertiary-fixed-variant": "#5a4225",
    "background": "#fbf9fa",
    "on-background": "#1b1c1d",
    "surface-variant": "#e4e2e3"
  },
  borderRadius: {
    DEFAULT: "0.25rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px"
  },
  spacing: {
    "grid-columns": "4",
    gutter: "20px",
    margin: "24px",
    "section-gap": "48px",
    "thumb-zone-height": "33%"
  },
  fontFamily: {
    "display-lg": ["Assistant"],
    "headline-md": ["Assistant"],
    "body-lg": ["Assistant"],
    "body-md": ["Assistant"],
    "label-bold": ["Assistant"],
    "caption": ["Assistant"]
  },
  fontSize: {
    "display-lg": ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "300" }],
    "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "700" }],
    "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
    "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
    "label-bold": ["14px", { lineHeight: "1.2", fontWeight: "700" }],
    "caption": ["12px", { lineHeight: "1.4", letterSpacing: "0.05em", fontWeight: "400" }]
  }
};

module.exports = {
  darkMode: "class",
  theme: {
    extend: tokens
  }
};
