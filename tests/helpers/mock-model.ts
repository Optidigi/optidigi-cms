import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

// A small OpenAI-compatible model on localhost, so the assistant runs end to end (AI SDK, streaming,
// the MCP tools and approvals) without a real AI service. It answers:
// - "list pages": calls the read-only findDocuments tool, then reports what it found;
// - "rename page <id>": asks to change that page's heading (a write, so the editor must allow it);
// - anything else: a short greeting.
export async function startMockModel(): Promise<{ baseURL: string; close: () => Promise<void> }> {
  const server: Server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url?.endsWith('/models')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ data: [{ id: 'mock-a', name: 'Mock A', supported_parameters: ['tools'] }] }))
      return
    }
    let body = ''
    for await (const chunk of req) body += chunk
    const request = JSON.parse(body || '{}')
    const messages: { role: string; content?: unknown }[] = request.messages ?? []
    const last = messages.at(-1)
    const sawTool = last?.role === 'tool'
    const tools = new Set<string>((request.tools ?? []).map((tool: { function: { name: string } }) => tool.function.name))
    const text = JSON.stringify(last?.content ?? '')
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    const send = (delta: object, finish: string | null = null) =>
      res.write(`data: ${JSON.stringify({ id: 'mock', object: 'chat.completion.chunk', created: 0, model: request.model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`)
    const call = (name: string, args: object) => {
      send({ role: 'assistant', tool_calls: [{ index: 0, id: `call_${name}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }] })
      send({}, 'tool_calls')
    }
    const rename = text.match(/rename page (\d+)/)
    if (!sawTool && text.includes('list pages') && tools.has('findDocuments')) {
      call('findDocuments', { slug: 'pages', limit: 5 })
    } else if (!sawTool && rename && tools.has('updateDocument')) {
      call('updateDocument', { slug: 'pages', id: Number(rename[1]), data: { heading: 'Changed by AI' }, draft: true })
    } else {
      const result = [...messages].reverse().find((message) => message.role === 'tool')?.content
      send({ role: 'assistant', content: sawTool ? `Done: ${String(JSON.stringify(result)).slice(0, 200)}` : 'Hello! I am the test model.' })
      send({}, 'stop')
    }
    res.write('data: [DONE]\n\n')
    res.end()
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}
