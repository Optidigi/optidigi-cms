'use client'

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon, CheckIcon } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api, APIError, query } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { StatusBadge } from '../content/status-badge'
import { LogoField } from './logo-field'
import type { ContentLocale } from '../sections'

export type SettingsPart = 'general' | 'navigation' | 'seo'
export type PageLink = { title: string; href: string }
type Values = {
  name: string
  contactEmail: string
  phone: string
  logo: number | null
  logoDark: number | null
  icon: number | null
  navigation: { id?: string | null; label: string; href: string }[]
  seo: { title: string; description: string }
}

export function SiteSettingsForm({
  site,
  part,
  locale,
  document,
  siteName,
  pageLinks = [],
}: {
  site: number
  part: SettingsPart
  locale: ContentLocale
  document?: Values & { id: number; status: string }
  siteName: string
  pageLinks?: PageLink[]
}) {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const [values, setValues] = useState<Values>(
    document ?? { name: siteName, contactEmail: '', phone: '', logo: null, logoDark: null, icon: null, navigation: [], seo: { title: '', description: '' } },
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<'draft' | 'publish'>()
  const localized = part !== 'general'
  // Published and unchanged since: nothing to publish (the page remounts the form after each save).
  const upToDate = document?.status === 'published' && JSON.stringify(values) === JSON.stringify(withoutMeta(document))

  // Each screen sends only its own fields, so neighbouring settings and translations stay intact.
  function fields() {
    if (part === 'general') {
      const { name, contactEmail, phone, logo, logoDark, icon } = values
      return { name, contactEmail: contactEmail || null, phone, logo, logoDark, icon }
    }
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
              <LogoField
                site={site}
                id="logo"
                label={t('logo')}
                description={t('logoDescription')}
                value={values.logo}
                onChange={(logo) => setValues({ ...values, logo })}
                error={errors.logo}
              />
              <LogoField
                site={site}
                id="logoDark"
                label={t('logoDark')}
                description={t('logoDarkDescription')}
                value={values.logoDark}
                onChange={(logoDark) => setValues({ ...values, logoDark })}
                surface="dark"
                error={errors.logoDark}
              />
              <LogoField
                site={site}
                id="icon"
                label={t('siteIcon')}
                description={t('siteIconDescription')}
                value={values.icon}
                onChange={(icon) => setValues({ ...values, icon })}
                shape="square"
                error={errors.icon}
              />
              <Field {...invalid('name')}>
                <FieldLabel htmlFor="name">{t('name')}</FieldLabel>
                <Input id="name" aria-invalid={Boolean(errors.name) || undefined} required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
                <FieldError>{errors.name}</FieldError>
              </Field>
              <Field {...invalid('contactEmail')}>
                <FieldLabel htmlFor="contactEmail">{t('contactEmail')}</FieldLabel>
                <Input id="contactEmail" aria-invalid={Boolean(errors.contactEmail) || undefined} type="email" value={values.contactEmail} onChange={(event) => setValues({ ...values, contactEmail: event.target.value })} />
                <FieldError>{errors.contactEmail}</FieldError>
              </Field>
              <Field {...invalid('phone')}>
                <FieldLabel htmlFor="phone">{t('phone')}</FieldLabel>
                <Input id="phone" aria-invalid={Boolean(errors.phone) || undefined} type="tel" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} />
                <FieldError>{errors.phone}</FieldError>
              </Field>
            </>
          )}
          {part === 'navigation' && (
            <>
              <FieldDescription>{t('linkDestinationHint')}</FieldDescription>
              {values.navigation.map((link, index) => (
                <div key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <Field {...invalid(`navigation.${index}.label`)}>
                    <FieldLabel htmlFor={`nav-label-${index}`}>{t('linkText')}</FieldLabel>
                    <Input id={`nav-label-${index}`} aria-invalid={Boolean(errors[`navigation.${index}.label`]) || undefined} required value={link.label} onChange={(event) => setLink(index, 'label', event.target.value)} />
                    <FieldError>{errors[`navigation.${index}.label`]}</FieldError>
                  </Field>
                  <Field {...invalid(`navigation.${index}.href`)}>
                    <FieldLabel htmlFor={`nav-href-${index}`}>{t('linkDestination')}</FieldLabel>
                    {/* Pick one of the website's pages, or type any path on the website. */}
                    <Combobox
                      items={pageLinks.map(({ href }) => href)}
                      // The selection follows the typed path, so closing the list never restores an older pick.
                      value={pageLinks.some(({ href }) => href === link.href) ? link.href : null}
                      inputValue={link.href}
                      // Base UI clears the input when the list closes without a choice; keep the typed path.
                      onInputValueChange={(value, { reason }) => reason !== 'input-clear' && setLink(index, 'href', value)}
                      onValueChange={(value) => typeof value === 'string' && setLink(index, 'href', value)}
                    >
                      <ComboboxInput id={`nav-href-${index}`} required aria-invalid={Boolean(errors[`navigation.${index}.href`]) || undefined} placeholder="/" className="w-full" />
                      <ComboboxContent>
                        <ComboboxEmpty>{t('noMatchingPages')}</ComboboxEmpty>
                        <ComboboxList>
                          {(href: string) => (
                            <ComboboxItem key={href} value={href}>
                              <span className="truncate">{pageLinks.find((page) => page.href === href)?.title}</span>
                              <span className="ml-auto truncate text-xs text-muted-foreground">{href}</span>
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
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
                <Input id="seo-title" aria-invalid={Boolean(errors['seo.title']) || undefined} value={values.seo.title} onChange={(event) => setValues({ ...values, seo: { ...values.seo, title: event.target.value } })} />
                <FieldError>{errors['seo.title']}</FieldError>
              </Field>
              <Field {...invalid('seo.description')}>
                <FieldLabel htmlFor="seo-description">{t('seoDescription')}</FieldLabel>
                <Textarea id="seo-description" aria-invalid={Boolean(errors['seo.description']) || undefined} value={values.seo.description} onChange={(event) => setValues({ ...values, seo: { ...values.seo, description: event.target.value } })} />
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
        <Button disabled={Boolean(saving) || upToDate} onClick={() => save('publish')}>
          {saving === 'publish' && <Spinner data-icon="inline-start" />}
          {upToDate && !saving && <CheckIcon data-icon="inline-start" />}
          {upToDate ? t('publishedState') : t('publish')}
        </Button>
      </CardFooter>
    </Card>
  )
}

function withoutMeta({ id: _id, status: _status, ...values }: Values & { id: number; status: string }): Values {
  return values
}
