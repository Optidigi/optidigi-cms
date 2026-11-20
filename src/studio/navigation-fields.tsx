'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

type Entry = { id: number; label: string; href: string }
export function NavigationFields({ initial }: { initial: { label: string; href: string }[] }) {
  const [items, setItems] = useState<Entry[]>(initial.map((item, id) => ({ ...item, id })))
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">Navigatielinks</legend>
      {items.map((item) => (
        <div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]" key={item.id}>
          <div className="grid gap-1">
            <Label htmlFor={'label-' + item.id}>Linktekst</Label>
            <Input
              name="navigationLabel"
              id={'label-' + item.id}
              defaultValue={item.label}
              required
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={'href-' + item.id}>Pad</Label>
            <Input
              name="navigationHref"
              id={'href-' + item.id}
              defaultValue={item.href}
              placeholder="/contact"
              required
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setItems((previous) => previous.filter(({ id }) => id !== item.id))}
          >
            Verwijderen
          </Button>
        </div>
      ))}
      <Button
        type="button"
        className="justify-self-start"
        variant="outline"
        size="sm"
        onClick={() =>
          setItems((previous) => [
            ...previous,
            { id: (previous.at(-1)?.id ?? -1) + 1, label: '', href: '' },
          ])
        }
      >
        Link toevoegen
      </Button>
    </fieldset>
  )
}
