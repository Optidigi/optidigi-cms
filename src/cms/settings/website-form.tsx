'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import type { Tenant } from '@/payload-types'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { useSave } from '../client/use-save'

// The website as the form edits it: Payload's fields, with empty values as empty strings.
type Paths = { [K in keyof NonNullable<Tenant['previewPaths']>]-?: string }
type Optional = NonNullable<Tenant['sections']>[number]
type Website = Pick<Tenant, 'id' | 'name' | 'slug' | 'siteOrigin'> & { sections: Optional[]; previewPaths: Paths; refreshUrl: string }

export function WebsiteForm({ website }: { website?: Website }) {
  const { t } = useI18n()
  const router = useRouter()
  const [values, setValues] = useState({ name: website?.name ?? '', slug: website?.slug ?? '', siteOrigin: website?.siteOrigin ?? 'https://' })
  const [sections, setSections] = useState<Optional[]>(website?.sections ?? [])
  const [paths, setPaths] = useState<Paths>(website?.previewPaths ?? { pages: '', articles: '', projects: '' })
  const [refreshUrl, setRefreshUrl] = useState(website?.refreshUrl ?? '')
  const [refreshSecret, setRefreshSecret] = useState('')
  const { errors, saving, save: run, invalid, ariaInvalid } = useSave()

  async function save(event: React.FormEvent) {
    event.preventDefault()
    // The slug field is Payload's native slug field; leaving it empty generates it from the name.
    const json = {
      name: values.name,
      siteOrigin: values.siteOrigin,
      sections,
      previewPaths: paths,
      refreshUrl: refreshUrl.trim() || null,
      ...(refreshSecret ? { refreshSecret } : {}),
      ...(values.slug ? { slug: values.slug } : {}),
    }
    const result = await run(
      () => api<{ doc: { id: number } }>(website ? `tenants/${website.id}?depth=0` : 'tenants?depth=0', { method: website ? 'PATCH' : 'POST', json }),
      t('savedToast'),
    )
    if (!result) return
    if (website) router.refresh()
    else router.replace(`/admin/platform/websites/${result.doc.id}`)
  }

  const field = (key: keyof typeof values, label: string, props: React.ComponentProps<typeof Input> = {}, description?: string) => (
    <Field {...invalid(key)}>
      <FieldLabel htmlFor={key}>{label}</FieldLabel>
      <Input id={key} value={values[key]} {...ariaInvalid(key)} onChange={(event) => setValues({ ...values, [key]: event.target.value })} {...props} />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{errors[key]}</FieldError>
    </Field>
  )

  return (
    <form onSubmit={save}>
      <Card>
        <CardContent>
          <FieldGroup>
            {field('name', t('name'), { required: true })}
            {field('slug', t('slug'))}
            {field('siteOrigin', t('websiteUrl'), { required: true, type: 'url' }, t('websiteUrlDescription'))}
            <FieldSet>
              <FieldLegend variant="label">{t('contentSections')}</FieldLegend>
              <FieldDescription>{t('contentSectionsDescription')}</FieldDescription>
              {(['articles', 'projects'] as const).map((key) => (
                <Field key={key} orientation="horizontal">
                  <Checkbox
                    id={`section-${key}`}
                    checked={sections.includes(key)}
                    onCheckedChange={(checked) =>
                      setSections((current) => (checked ? [...current, key] : current.filter((value) => value !== key)))
                    }
                  />
                  <FieldLabel htmlFor={`section-${key}`} className="font-normal">
                    {t(key === 'projects' ? 'portfolio' : key)}
                  </FieldLabel>
                </Field>
              ))}
            </FieldSet>
            <FieldSet>
              <FieldLegend variant="label">{t('previewPaths')}</FieldLegend>
              <FieldDescription>{t('previewPathsDescription')}</FieldDescription>
              {(['pages', 'articles', 'projects'] as const).map((key) => (
                <Field key={key} {...invalid(`previewPaths.${key}`)}>
                  <FieldLabel htmlFor={`preview-${key}`}>{t(key === 'projects' ? 'portfolio' : key)}</FieldLabel>
                  <Input id={`preview-${key}`} {...ariaInvalid(`previewPaths.${key}`)} placeholder="/{slug}" value={paths[key]} onChange={(event) => setPaths({ ...paths, [key]: event.target.value })} />
                  <FieldError>{errors[`previewPaths.${key}`]}</FieldError>
                </Field>
              ))}
            </FieldSet>
            <FieldSet>
              <FieldLegend variant="label">{t('refresh')}</FieldLegend>
              <FieldDescription>{t('refreshDescription')}</FieldDescription>
              <Field {...invalid('refreshUrl')}>
                <FieldLabel htmlFor="refreshUrl">{t('refreshUrl')}</FieldLabel>
                <Input id="refreshUrl" {...ariaInvalid('refreshUrl')} type="url" value={refreshUrl} onChange={(event) => setRefreshUrl(event.target.value)} />
                <FieldError>{errors.refreshUrl}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="refreshSecret">{t('refreshSecret')}</FieldLabel>
                <Input id="refreshSecret" type="password" autoComplete="off" value={refreshSecret} onChange={(event) => setRefreshSecret(event.target.value)} />
                <FieldDescription>{t('apiKeyDescription')}</FieldDescription>
              </Field>
            </FieldSet>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}
            {t('save')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
