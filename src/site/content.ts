import { APIError, type CollectionConfig, type Field } from 'payload'
import { isPlatformAdmin, platformOnly, relationID, signedIn, tenantDelete } from './access'
import { previewURL } from './preview'

const drafts = { drafts: { autosave: true } }

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: { useAsTitle: 'name' },
  access: { create: platformOnly, delete: () => false, read: signedIn, update: platformOnly },
  fields: [
    { name: 'name', label: { en: 'Name', nl: 'Naam' }, type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || 'Use lowercase words separated by hyphens.' },
    {
      name: 'siteOrigin', label: { en: 'Website URL', nl: 'Website-URL' },
      type: 'text',
      required: true,
      validate: (value: unknown) => {
        try {
          const url = new URL(typeof value === 'string' ? value : '')
          return url.protocol === 'https:' && url.origin === value || 'Enter an HTTPS origin without a path.'
        } catch {
          return 'Enter an HTTPS origin without a path.'
        }
      },
    },
  ],
}

const editorAccess: CollectionConfig['access'] = {
  create: signedIn,
  delete: tenantDelete,
  read: signedIn,
  readVersions: signedIn,
  update: signedIn,
}

const seo: Field = {
  name: 'seo',
  type: 'group',
  fields: [
    { name: 'title', label: { en: 'Title', nl: 'Titel' }, type: 'text', localized: true },
    { name: 'description', label: { en: 'Description', nl: 'Beschrijving' }, type: 'textarea', localized: true },
  ],
}

export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  admin: {
    useAsTitle: 'name',
    preview: (doc, { locale, req }) => previewURL('site-settings', doc.id, locale, req),
    livePreview: { url: ({ data, locale, req }) => previewURL('site-settings', data.id, locale.code, req) },
  },
  access: { ...editorAccess, delete: () => false },
  versions: drafts,
  llmInstructions: 'Edit the current tenant’s site identity and defaults. Save edits as drafts unless the editor explicitly asks to publish.',
  fields: [
    { name: 'name', label: { en: 'Name', nl: 'Naam' }, type: 'text', required: true },
    { name: 'contactEmail', label: { en: 'Contact email', nl: 'E-mailadres' }, type: 'email' },
    { name: 'phone', label: { en: 'Phone', nl: 'Telefoonnummer' }, type: 'text' },
    { name: 'navigation', label: { en: 'Website navigation', nl: 'Websitenavigatie' }, type: 'array', localized: true, fields: [
      { name: 'label', label: { en: 'Link text', nl: 'Linktekst' }, type: 'text', required: true },
      { name: 'href', label: { en: 'Link destination', nl: 'Linkbestemming' }, type: 'text', required: true, validate: (value: unknown) =>
        typeof value === 'string' && /^\/(?![\/\\])/.test(value) && !/[\\\s]/.test(value)
        || 'Use a site-relative path starting with a single slash.' },
    ] },
    seo,
  ],
}

function editorialCollection(slug: 'pages' | 'articles' | 'projects'): CollectionConfig {
  return {
    slug,
    admin: {
      useAsTitle: 'title',
      ...(slug === 'pages' && {
        preview: (doc, { locale, req }) => previewURL('pages', doc.id, locale, req),
        livePreview: { url: ({ data, locale, req }) => previewURL('pages', data.id, locale.code, req) },
      }),
    },
    access: editorAccess,
    indexes: [{ fields: ['tenant', 'slug'], unique: true }],
    versions: drafts,
    llmInstructions: 'Read the schema first. Save changes as drafts unless the editor explicitly asks to publish. Preserve unchanged translations.',
    hooks: {
      beforeValidate: [
        ({ data, operation, originalDoc, req }) => {
          if (operation === 'update' && originalDoc && data?.tenant != null && relationID(data.tenant) !== relationID(originalDoc.tenant) && !isPlatformAdmin(req.user)) {
            throw new APIError('Changing an existing document’s tenant requires a platform admin.', 403)
          }
          return data
        },
      ],
    },
    fields: [
      { name: 'title', label: { en: 'Title', nl: 'Titel' }, type: 'text', required: true, localized: true },
      { name: 'slug', type: 'text', required: true, validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || 'Use lowercase words separated by hyphens.' },
      { name: 'heading', label: { en: 'Page heading', nl: 'Paginakop' }, type: 'text', localized: true },
      { name: 'description', label: { en: 'Description', nl: 'Beschrijving' }, type: 'textarea', localized: true },
      { name: 'body', label: { en: 'Body content', nl: 'Inhoud' }, type: 'richText', localized: true },
      seo,
    ],
  }
}

export const Pages = editorialCollection('pages')
export const Articles = editorialCollection('articles')
export const Projects = editorialCollection('projects')
