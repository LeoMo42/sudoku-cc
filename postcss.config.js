// Tailwind 4 split its PostCSS plugin into a separate package
// (`@tailwindcss/postcss`); using `tailwindcss` directly here would
// throw at build time. Plus autoprefixer for vendor-prefix coverage.
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
