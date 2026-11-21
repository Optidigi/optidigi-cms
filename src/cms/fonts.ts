import { Atkinson_Hyperlegible_Next, Inter } from 'next/font/google'

// The optional interface fonts. next/font downloads them at build time and serves them from this
// server, so browsers never contact Google; without preloading, only the chosen font is fetched.
export const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', preload: false, display: 'swap' })
export const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-atkinson',
  // Next has no fallback metrics for this font; skip the size-adjusted fallback.
  adjustFontFallback: false,
  preload: false,
  display: 'swap',
})
