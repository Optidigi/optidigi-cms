import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateText, type LanguageModel } from 'ai'
import { describe, expect, it } from 'vitest'
import { anthropicListed, capabilitiesFor, openRouterListed } from '@/assistant/capabilities'

// Builds the real request the provider package would send, without sending it.
async function requestBody(build: (fetch: typeof globalThis.fetch) => LanguageModel) {
  let body: Record<string, unknown> = {}
  const fetch = (async (_url: unknown, init?: RequestInit) => {
    body = JSON.parse(String(init?.body))
    return new Response('{"error":{"message":"not sent"}}', { status: 400 })
  }) as typeof globalThis.fetch
  await generateText({ model: build(fetch), prompt: 'Hallo', reasoning: 'high', maxRetries: 0 }).catch(() => undefined)
  return body
}

describe('model effort', () => {
  it('reaches each provider in its own setting', async () => {
    const openai = await requestBody((fetch) => createOpenAI({ apiKey: 'test', fetch })('gpt-5.2'))
    expect(openai.reasoning).toMatchObject({ effort: 'high' })

    const anthropic = await requestBody((fetch) => createAnthropic({ apiKey: 'test', fetch })('claude-opus-4-7'))
    expect(anthropic.output_config).toMatchObject({ effort: 'high' })
    expect(anthropic.thinking).toMatchObject({ type: 'adaptive' })

    const gemini = await requestBody((fetch) => createGoogle({ apiKey: 'test', fetch })('gemini-3-pro-preview'))
    expect(gemini.generationConfig).toMatchObject({ thinkingConfig: { thinkingLevel: 'high' } })

    const compatible = await requestBody((fetch) =>
      createOpenAICompatible({ name: 'test', apiKey: 'test', baseURL: 'https://example.test/v1', fetch })('model'),
    )
    expect(compatible.reasoning_effort).toBe('high')
  })

  it('offers only the levels a model supports', () => {
    expect(capabilitiesFor('openai', 'gpt-5.2').efforts).toEqual(['none', 'low', 'medium', 'high', 'xhigh'])
    expect(capabilitiesFor('openai', 'gpt-5-mini-2025-08-07').efforts).toEqual(['minimal', 'low', 'medium', 'high'])
    expect(capabilitiesFor('openai', 'gpt-4.1')).toEqual({ efforts: [], images: true, pdfs: true })
    // Unknown models only get the provider's default.
    expect(capabilitiesFor('openai', 'o3').efforts).toEqual([])
    expect(capabilitiesFor('anthropic', 'claude-unknown-9').efforts).toEqual([])
    expect(capabilitiesFor('openai-compatible', 'llama-local')).toEqual({ efforts: [], images: null, pdfs: null })
    // Google: only models its own list marks as thinking.
    expect(capabilitiesFor('google', 'gemini-3-pro-preview', { thinking: true }).efforts).toEqual(['low', 'medium', 'high'])
    expect(capabilitiesFor('google', 'gemini-2.0-flash', { thinking: false }).efforts).toEqual([])
    expect(capabilitiesFor('google', 'gemini-3-pro-preview').efforts).toEqual([])
  })

  it('reads what the provider lists say', () => {
    const supported = { supported: true }
    const unsupported = { supported: false }
    expect(
      anthropicListed({
        effort: { supported: true, low: supported, medium: supported, high: supported, xhigh: unsupported, max: supported },
        thinking: { supported: true, types: { adaptive: supported, enabled: supported, disabled: supported } },
        image_input: supported,
        pdf_input: unsupported,
      }),
    ).toEqual({ efforts: ['none', 'low', 'medium', 'high', 'max'], images: true, pdfs: false })
    // Budget thinking only: the AI SDK turns low/medium/high into budgets.
    expect(anthropicListed({ effort: { supported: false }, thinking: { supported: true, types: { enabled: supported, disabled: unsupported } } }).efforts).toEqual([
      'low',
      'medium',
      'high',
    ])
    expect(anthropicListed({ thinking: { supported: false } }).efforts).toEqual([])
    expect(anthropicListed(null)).toEqual({})

    expect(
      openRouterListed({ reasoning: { supported_efforts: ['low', 'high', 'turbo'] }, architecture: { input_modalities: ['text', 'image'] } }),
    ).toEqual({ efforts: ['low', 'high'], images: true, pdfs: false })
    expect(openRouterListed({ supported_parameters: ['tools', 'temperature'] }).efforts).toEqual([])
    // The provider's list wins over the SDK's table.
    expect(capabilitiesFor('anthropic', 'claude-opus-4-7', { efforts: ['low'], images: false }).efforts).toEqual(['low'])
  })
})
