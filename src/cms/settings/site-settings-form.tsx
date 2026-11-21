'use client'

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api, APIError, query } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { StatusBadge } from '../content/status-badge'
import type { ContentLocale } from '../sections'

export type SettingsPart = 'general' | 'navigation' | 'seo'
type Values = {
  name: string
  contactEmail: string
  phone: string
  navigation: { id?: string | null; label: string; href: string }[]
  seo: { title: string; description: string }
}

export function SiteSettingsForm({
  site,
  part,
  locale,
  document,
  siteName,
}: {
  site: number
  part: SettingsPart
  locale: ContentLocale
  document?: Values & { id: number; status: string }
  siteName: string
}) {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const [values, setValues] = useState<Values>(
    document ?? { name: siteName, contactEmail: '', phone: '', navigation: [], seo: { title: '', description: '' } },
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<'draft' | 'publish'>()
  const localized = part !== 'general'

  // Each screen sends only its own fields, so neighbouring settings and translations stay intact.
  function fields() {
    if (part === 'general') return { name: values.name, contactEmail: values.contactEmail || null, phone: values.phone }
    if (part === 'navigation') return { navigation: values.navigation }
    return { seo: values.seo }
  }

  async function save(intent: 'draft' | 'publish') {
    setSaving(intent)
    setErrors({})
    const params = query({
      depth: 0,
      locale,
      draft: intent === 'draft' ? true : undefined,
    })
    const data = { ...fields(), _status: intent === 'publish' ? 'published' : 'draft' }
    try {
      await api(document ? `site-settings/${document.id}${params}` : `site-settings${params}`, {
        method: document ? 'PATCH' : 'POST',
        json: document ? data : { name: values.name, tenant: site, ...data },
      })
      toast.success(intent === 'publish' ? t('publishedToast') : t('saved'))
      router.refresh()
    } catch (error) {
      if (error instanceof APIError) setErrors(error.fields)
      toast.error(t('saveFailed'))
    }
    setSaving(undefined)
  }

  function setLink(index: number, key: 'label' | 'href', value: string) {
    setValues((current) => ({
      ...current,
      navigation: current.navigation.map((link, i) => (i === index ? { ...link, [key]: value } : link)),
    }))
  }

  function move(index: number, offset: number) {
    setValues((current) => {
      const navigation = [...current.navigation]
      const [link] = navigation.splice(index, 1)
      navigation.splice(index + offset, 0, link)
      return { ...current, navigation }
    })
  }

  const invalid = (key: string) => (errors[key] ? { 'data-invalid': true } : {})

  return (
    <Card>
      <CardContent>
        <FieldGroup>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {document ? <StatusBadge status={document.status} t={t} /> : <span />}
            {localized && (
              <ToggleGroup
                variant="outline"
                aria-label={t('documentTranslation')}
                value={[locale]}
                onValueChange={(value) => value[0] && router.push(`${pathname}?locale=${value[0]}`)}
              >
                <ToggleGroupItem value="nl">{t('dutch')}</ToggleGroupItem>
                <ToggleGroupItem value="en">{t('english')}</ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
          {part === 'general' && (
            <>
              <Field {...invalid('name')}>
                <FieldLabel htmlFor="name">{t('name')}</FieldLabel>
                <Input id="name" required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
                <FieldError>{errors.name}</FieldError>
              </Field>
              <Field {...invalid('contactEmail')}>
                <FieldLabel htmlFor="contactEmail">{t('contactEmail')}</FieldLabel>
                <Input id="contactEmail" type="email" value={values.contactEmail} onChange={(event) => setValues({ ...values, contactEmail: event.target.value })} />
                <FieldError>{errors.contactEmail}</FieldError>
              </Field>
              <Field {...invalid('phone')}>
                <FieldLabel htmlFor="phone">{t('phone')}</FieldLabel>
                <Input id="phone" type="tel" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} />
                <FieldError>{errors.phone}</FieldError>
              </Field>
            </>
          )}
          {part === 'navigation' && (
            <>
              {values.navigation.map((link, index) => (
                <div key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <Field {...invalid(`navigation.${index}.label`)}>
                    <FieldLabel htmlFor={`nav-label-${index}`}>{t('linkText')}</FieldLabel>
                    <Input id={`nav-label-${index}`} required value={link.label} onChange={(event) => setLink(index, 'label', event.target.value)} />
                    <FieldError>{errors[`navigation.${index}.label`]}</FieldError>
                  </Field>
                  <Field {...invalid(`navigation.${index}.href`)}>
                    <FieldLabel htmlFor={`nav-href-${index}`}>{t('linkDestination')}</FieldLabel>
                    <Input id={`nav-href-${index}`} required placeholder="/" value={link.href} onChange={(event) => setLink(index, 'href', event.target.value)} />
                    <FieldError>{errors[`navigation.${index}.href`]}</FieldError>
                  </Field>
                  <ButtonGroup>
                    <Button type="button" variant="outline" size="icon" aria-label={`${t('moveUp')}: ${link.label}`} disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUpIcon />
                    </Button>
                    <Button type="button" variant="outline" size="icon" aria-label={`${t('moveDown')}: ${link.label}`} disabled={index === values.navigation.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`${t('removeLinkRow')}: ${link.label}`}
                      onClick={() => setValues({ ...values, navigation: values.navigation.filter((_, i) => i !== index) })}
                    >
                      <Trash2Icon />
                    </Button>
                  </ButtonGroup>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => setValues({ ...values, navigation: [...values.navigation, { label: '', href: '/' }] })}
              >
                <PlusIcon data-icon="inline-start" />
                {t('addLink')}
              </Button>
            </>
          )}
          {part === 'seo' && (
            <>
              <Field {...invalid('seo.title')}>
                <FieldLabel htmlFor="seo-title">{t('seoTitle')}</FieldLabel>
                <Input id="seo-title" value={values.seo.title} onChange={(event) => setValues({ ...values, seo: { ...values.seo, title: event.target.value } })} />
                <FieldError>{errors['seo.title']}</FieldError>
              </Field>
              <Field {...invalid('seo.description')}>
                <FieldLabel htmlFor="seo-description">{t('seoDescription')}</FieldLabel>
                <Textarea id="seo-description" value={values.seo.description} onChange={(event) => setValues({ ...values, seo: { ...values.seo, description: event.target.value } })} />
                <FieldError>{errors['seo.description']}</FieldError>
              </Field>
            </>
          )}
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" disabled={Boolean(saving)} onClick={() => save('draft')}>
          {saving === 'draft' && <Spinner data-icon="inline-start" />}
          {t('saveDraft')}
        </Button>
        <Button disabled={Boolean(saving)} onClick={() => save('publish')}>
          {saving === 'publish' && <Spinner data-icon="inline-start" />}
          {t('publish')}
        </Button>
      </CardFooter>
    </Card>
  )
}
