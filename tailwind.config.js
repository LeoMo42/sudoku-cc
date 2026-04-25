/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // #125 — replace system-ui defaults with self-hosted variable fonts.
      // 'sans' applies to body + most UI by default. 'mono' is opt-in via
      // `font-mono` for numerical surfaces (cells, timer, day badge).
      // The fallback chain keeps system-ui for the brief window before the
      // variable font finishes loading; @fontsource-variable ships with
      // font-display: swap so this is the FOUT, not FOIT.
      fontFamily: {
        sans: [
          'Manrope Variable',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
        mono: [
          'JetBrains Mono Variable',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}
