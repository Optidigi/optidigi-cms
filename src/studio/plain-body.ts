/** Leave rich Lexical documents alone. This editor only round-trips plain paragraphs. */
export function getPlainBody(body: unknown): string | null {
  if (body == null) return ''
  if (typeof body !== 'object' || !('root' in body)) return null
  const root = body.root as { children?: unknown[] }
  if (!root || !Array.isArray(root.children)) return null
  const paragraphs: string[] = []
  for (const item of root.children) {
    const block = item as { type?: string; format?: string; indent?: number; children?: unknown[] }
    if (
      block?.type !== 'paragraph' ||
      block.format ||
      block.indent ||
      !Array.isArray(block.children)
    )
      return null
    const lines: string[] = []
    for (const child of block.children) {
      const node = child as { type?: string; text?: string; format?: number; style?: string }
      if (node?.type !== 'text' || typeof node.text !== 'string' || node.format || node.style)
        return null
      lines.push(node.text)
    }
    paragraphs.push(lines.join(''))
  }
  return paragraphs.join('\n')
}

export function makePlainBody(text: string) {
  return {
    root: {
      type: 'root' as const,
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
      children: text.split(/\r?\n/).map((line) => ({
        type: 'paragraph' as const,
        textFormat: 0,
        textStyle: '',
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        version: 1,
        children: line
          ? [
              {
                type: 'text' as const,
                text: line,
                format: 0,
                style: '',
                detail: 0,
                mode: 'normal' as const,
                version: 1,
              },
            ]
          : [],
      })),
    },
  }
}
