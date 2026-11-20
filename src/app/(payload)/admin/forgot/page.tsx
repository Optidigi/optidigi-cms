import { stockMetadata, stockView, type ViewProps } from '../stock-view'

export const generateMetadata = (props: ViewProps) => stockMetadata(['forgot'], props)
export default function ForgotPasswordPage(props: ViewProps) {
  return stockView(['forgot'], props)
}
