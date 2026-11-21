'use client'

import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useState } from 'react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { useI18n } from '../client/i18n-provider'

// A password field with a show/hide button, built from the official InputGroup.
export function PasswordInput(props: Omit<React.ComponentProps<typeof InputGroupInput>, 'type'>) {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  return (
    <InputGroup>
      <InputGroupInput {...props} type={visible ? 'text' : 'password'} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={t(visible ? 'hidePassword' : 'showPassword')}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
