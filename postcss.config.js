// Tailwind 4 split its PostCSS plugin into a separate package
// (`@tailwindcss/postcss`); using `tailwindcss` directly here would
// throw at build time. Vendor-prefixing is handled internally by
// Tailwind 4's Lightning CSS pipeline, so no separate autoprefixer
// step is needed (was a no-op double-pass before this PR removed it).
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
