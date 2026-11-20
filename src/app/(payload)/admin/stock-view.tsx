import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from './importMap'

export type ViewProps = { searchParams: Promise<Record<string, string | string[]>> }

export function stockView(segments: string[], { searchParams }: ViewProps) {
  return RootPage({ config, params: Promise.resolve({ segments }), searchParams, importMap })
}

export function stockMetadata(segments: string[], { searchParams }: ViewProps) {
  return generatePageMetadata({ config, params: Promise.resolve({ segments }), searchParams })
}
