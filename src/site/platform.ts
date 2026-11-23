import type { GlobalConfig } from 'payload'
import { platformOnly } from './access'

// Settings for the CMS as a whole. The brand website's logos appear on the sign-in screen, which
// the server reads itself, so only platform administrators read or change this through the API.
export const Platform: GlobalConfig = {
  slug: 'platform',
  label: { en: 'Platform', nl: 'Platform' },
  access: { read: platformOnly, update: platformOnly },
  versions: false,
  fields: [
    {
      name: 'brandWebsite',
      label: { en: 'CMS brand', nl: 'Merk van het CMS' },
      type: 'relationship',
      relationTo: 'tenants',
    },
  ],
}
