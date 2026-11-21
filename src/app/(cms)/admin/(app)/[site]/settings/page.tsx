import { redirect } from 'next/navigation'

export default async function SettingsIndex({ params }: { params: Promise<{ site: string }> }) {
  redirect(`/admin/${(await params).site}/settings/general`)
}
