const paths = {
  spark: 'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z',
  expand: 'M14 4h6v6m0-6-6 6M4 14v6h6m-6 0 6-6',
  close: 'm6 6 12 12M18 6 6 18',
  send: 'M12 19V5m-6 6 6-6 6 6',
  connect: 'M9 7V3m6 4V3M7 7h10v4a5 5 0 0 1-5 5m-5-9v4a5 5 0 0 0 5 5m0 0v5',
} as const

export function AssistantIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  )
}
