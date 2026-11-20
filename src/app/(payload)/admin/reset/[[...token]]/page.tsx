import { stockMetadata, stockView, type ViewProps } from '../../stock-view'

type Props = ViewProps & { params: Promise<{ token?: string[] }> }

export async function generateMetadata(props: Props) {
  return stockMetadata(['reset', ...((await props.params).token ?? [])], props)
}

export default async function ResetPasswordPage(props: Props) {
  return stockView(['reset', ...((await props.params).token ?? [])], props)
}
