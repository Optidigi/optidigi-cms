'use client'

import { RelationshipNode, UploadNode } from '@payloadcms/richtext-lexical/client'
import { useAdminTranslations } from './i18n-context'

function EmbedReference({
  kind,
  relation,
  value,
}: {
  kind: string
  relation: string
  value: unknown
}) {
  const t = useAdminTranslations()
  const id = value && typeof value === 'object' && 'id' in value ? value.id : value
  return (
    <span className="my-1 inline-block rounded-md border bg-muted px-2 py-1 text-sm">
      {t(kind)} · {relation} #{typeof id === 'number' || typeof id === 'string' ? id : '—'}
    </span>
  )
}

// Use Payload's serialization and replace only the admin-specific decorators.
export class EditorialUploadNode extends UploadNode {
  static clone(node: EditorialUploadNode) {
    return new EditorialUploadNode({
      data: node.getData(),
      format: node.getFormat(),
      key: node.getKey(),
    })
  }

  decorate() {
    const { relationTo, value } = this.getData()
    return <EmbedReference kind="Media" relation={relationTo} value={value} />
  }
}

export class EditorialRelationshipNode extends RelationshipNode {
  static clone(node: EditorialRelationshipNode) {
    return new EditorialRelationshipNode({
      data: node.getData(),
      format: node.getFormat(),
      key: node.getKey(),
    })
  }

  decorate() {
    const { relationTo, value } = this.getData()
    return <EmbedReference kind="Document" relation={relationTo} value={value} />
  }
}

export const editorialEmbeds = [
  UploadNode,
  RelationshipNode,
  {
    replace: UploadNode,
    with: (node: UploadNode) =>
      new EditorialUploadNode({ data: node.getData(), format: node.getFormat() }),
    withKlass: EditorialUploadNode,
  },
  {
    replace: RelationshipNode,
    with: (node: RelationshipNode) =>
      new EditorialRelationshipNode({ data: node.getData(), format: node.getFormat() }),
    withKlass: EditorialRelationshipNode,
  },
]
