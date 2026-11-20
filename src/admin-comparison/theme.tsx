'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { ThemeProvider, useTheme } from 'next-themes'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ComparisonTheme({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="optidigi-comparison-theme"
    >
      {children}
    </ThemeProvider>
  )
}

export function AppearanceMenu() {
  const { theme, setTheme } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Weergave" />}>
        <Sun className="dark:hidden" />
        <Moon className="hidden dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun /> Licht
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon /> Donker
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor /> Systeem
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
