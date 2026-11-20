import type { Page } from '@/payload-types'

const nativeTypes = new Set([
  'root',
  'paragraph',
  'text',
  'heading',
  'quote',
  'list',
  'listitem',
  'linebreak',
  'tab',
])

export function editableBody(value: unknown): value is NonNullable<Page['body']> {
  if (!value || typeof value !== 'object' || !('root' in value)) return false
  function validNode(node: unknown, depth: number): boolean {
    if (
      depth > 40 ||
      !node ||
      typeof node !== 'object' ||
      !('type' in node) ||
      typeof node.type !== 'string' ||
      !nativeTypes.has(node.type)
    )
      return false
    if (node.type === 'text') {
      if (!('text' in node) || typeof node.text !== 'string') return false
      if ('style' in node && node.style !== '') return false
    }
    if (node.type === 'heading' && (!('tag' in node) || !/^h[1-6]$/.test(String(node.tag))))
      return false
    if (
      node.type === 'list' &&
      (!('listType' in node) || !['bullet', 'number', 'check'].includes(String(node.listType)))
    )
      return false
    return (
      !('children' in node) ||
      (Array.isArray(node.children) && node.children.every((child) => validNode(child, depth + 1)))
    )
  }
  const root = value.root
  return Boolean(
    root &&
    typeof root === 'object' &&
    'type' in root &&
    root.type === 'root' &&
    'children' in root &&
    Array.isArray(root.children) &&
    validNode(root, 0),
  )
}
