// Effort levels in the AI SDK's provider-neutral `reasoning` option, lowest first. Shared by the
// server and the chat's effort menu.
export const effortLevels = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const
export type EffortLevel = (typeof effortLevels)[number]

// What the chat offers for one model. `efforts` lists the levels the model accepts; empty means the
// chat only offers the provider's default and sends no effort. `images` and `pdfs` are null when
// nobody says, and the upload stays allowed.
export type ModelCapabilities = { efforts: EffortLevel[]; images: boolean | null; pdfs: boolean | null }
