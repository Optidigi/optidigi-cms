'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import type { User } from '@/payload-types'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { useSave } from '../client/use-save'

type Role = User['role']
type Membership = NonNullable<User['tenants']>[number]['role']
// The account as the form edits it: its role on each website by website id.
type Account = Pick<User, 'id' | 'email' | 'role'> & { memberships: Record<number, Membership> }

export function UserForm({ sites, account }: { sites: { id: number; name: string }[]; account?: Account }) {
  const { t } = useI18n()
  const router = useRouter()
  const [email, setEmail] = useState(account?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(account?.role ?? 'customer')
  const [memberships, setMemberships] = useState<Record<number, Membership>>(account?.memberships ?? {})
  const { errors, saving, save: run, invalid, ariaInvalid } = useSave()

  const roleLabels: Record<Role, string> = { customer: t('customer'), 'platform-admin': t('platformAdmin') }
  const membershipLabels: Record<string, string> = { none: t('noAccess'), editor: t('editor'), admin: t('websiteAdmin') }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    const json = {
      email,
      role,
      tenants: Object.entries(memberships).map(([tenant, membership]) => ({ tenant: Number(tenant), role: membership })),
      ...(password ? { password } : {}),
    }
    const result = await run(
      () => api<{ doc: { id: number } }>(account ? `users/${account.id}?depth=0` : 'users?depth=0', { method: account ? 'PATCH' : 'POST', json }),
      t('savedToast'),
    )
    if (!result) return
    setPassword('')
    if (account) router.refresh()
    else router.replace(`/admin/platform/users/${result.doc.id}`)
  }

  return (
    <form onSubmit={save}>
      <Card>
        <CardContent>
          <FieldGroup>
            <Field {...invalid('email')}>
              <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
              <Input id="email" type="email" required value={email} {...ariaInvalid('email')} onChange={(event) => setEmail(event.target.value)} />
              <FieldError>{errors.email}</FieldError>
            </Field>
            <Field {...invalid('password')}>
              <FieldLabel htmlFor="password">{account ? t('newPassword') : t('password')}</FieldLabel>
              <Input id="password" type="password" autoComplete="new-password" required={!account} value={password} {...ariaInvalid('password')} onChange={(event) => setPassword(event.target.value)} />
              {account && <FieldDescription>{t('passwordDescription')}</FieldDescription>}
              <FieldError>{errors.password}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="role">{t('role')}</FieldLabel>
              <Select value={role} onValueChange={(value) => value && setRole(value as Role)}>
                <SelectTrigger id="role" className="w-full sm:w-64">
                  <SelectValue>{(value: Role) => roleLabels[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">{t('customer')}</SelectItem>
                  <SelectItem value="platform-admin">{t('platformAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <FieldSet>
              <FieldLegend variant="label">{t('memberships')}</FieldLegend>
              <FieldDescription>{t('membershipsDescription')}</FieldDescription>
              <div className="overflow-hidden rounded-md border">
                <Table className="table-fixed">
                  <TableBody>
                    {sites.map((site) => (
                      <TableRow key={site.id}>
                        <TableCell className="truncate">{site.name}</TableCell>
                        <TableCell className="w-40">
                          <Select
                            value={memberships[site.id] ?? 'none'}
                            onValueChange={(value) =>
                              setMemberships((current) => {
                                const next = { ...current }
                                if (value === 'admin' || value === 'editor') next[site.id] = value
                                else delete next[site.id]
                                return next
                              })
                            }
                          >
                            <SelectTrigger size="sm" className="w-full" aria-label={`${t('role')}: ${site.name}`}>
                              <SelectValue>{(value: string) => membershipLabels[value]}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t('noAccess')}</SelectItem>
                              <SelectItem value="editor">{t('editor')}</SelectItem>
                              <SelectItem value="admin">{t('websiteAdmin')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
