import { cn } from '@/lib/utils'

// A website's logo that follows light and dark mode: its dark-mode logo when it has one, else the
// logo on a light background so a dark logo stays readable.
export function BrandLogo({ name, logo, logoDark, className }: { name: string; logo: string; logoDark?: string | null; className?: string }) {
  const image = cn('w-auto max-w-full object-contain object-left', className)
  /* eslint-disable @next/next/no-img-element -- Payload serves the original upload; SVGs stay as images. */
  return logoDark ? (
    <>
      <img src={logo} alt={name} className={cn(image, 'dark:hidden')} />
      <img src={logoDark} alt={name} className={cn(image, 'hidden dark:block')} />
    </>
  ) : (
    <img src={logo} alt={name} className={cn(image, 'dark:box-content dark:rounded-md dark:bg-white dark:px-1.5 dark:py-1')} />
  )
  /* eslint-enable @next/next/no-img-element */
}
