import { ArrowRight, Globe2 } from 'lucide-react'
import Link from 'next/link'
import { listSites, studioRequest } from '@/studio/data'
import { StudioShell } from '@/studio/shell'
import { Button } from '@/studio/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/studio/ui/card'

export default async function StudioHome() {
  const sites = await listSites(await studioRequest())
  return (
    <StudioShell sites={sites}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Websites</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Kies de website waarvan je de homepage wilt bewerken.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => (
            <Card key={site.id}>
              <CardHeader>
                <Globe2 aria-hidden="true" className="mb-1 size-5 text-primary" />
                <CardTitle>{site.name}</CardTitle>
                <CardDescription>{new URL(site.siteOrigin).hostname}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link href={'/studio/' + site.id}>
                    Homepage bewerken <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {sites.length === 0 && (
            <p className="text-muted-foreground">Je hebt nog geen toegang tot een website.</p>
          )}
        </div>
      </div>
    </StudioShell>
  )
}
