// The address part of a page, article or project: lowercase letters, digits and single hyphens.
// The editor fills it in from the title; the server applies the same rule to every save, including
// saves through the REST API and the AI's tools.
export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150)
}
