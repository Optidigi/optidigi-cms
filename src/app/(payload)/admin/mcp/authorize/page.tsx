import { stockMetadata, stockView, type ViewProps } from '../../stock-view'

const segments = ['mcp', 'authorize']

export const generateMetadata = (props: ViewProps) => stockMetadata(segments, props)
export default function ConsentPage(props: ViewProps) {
  return stockView(segments, props)
}
