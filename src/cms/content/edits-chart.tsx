'use client'

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { useI18n } from '../client/i18n-provider'

// Saves per day as bars, with shadcn's Chart. Days are `YYYY-MM-DD` in the server's time zone.
export function EditsChart({ days }: { days: { date: string; edits: number }[] }) {
  const { t, language } = useI18n()
  const config = { edits: { label: t('edits'), color: 'var(--primary)' } } satisfies ChartConfig
  const format = (value: string, options: Intl.DateTimeFormatOptions) =>
    new Date(value + 'T12:00:00').toLocaleDateString(language, options)
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart accessibilityLayer data={days} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value: string) => format(value, { day: 'numeric', month: 'short' })}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelFormatter={(value) => format(String(value), { weekday: 'short', day: 'numeric', month: 'long' })} />}
        />
        <Bar dataKey="edits" fill="var(--color-edits)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
