import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'

const directory = new URL('../src/components/ui/', import.meta.url)
const expected = JSON.parse(await readFile(new URL('./shadcn-base-vega.json', import.meta.url), 'utf8'))
const files = (await readdir(directory)).filter((name) => name.endsWith('.tsx')).sort()
const changed = []
for (const name of files) {
  const hash = createHash('sha256').update(await readFile(new URL(name, directory))).digest('hex')
  if (expected.files[name] !== hash) changed.push(name)
}
for (const name of Object.keys(expected.files)) {
  if (!files.includes(name)) changed.push(name)
}
if (changed.length) {
  console.error('Generated shadcn components differ from the Base Vega baseline: ' + changed.join(', '))
  process.exitCode = 1
}
