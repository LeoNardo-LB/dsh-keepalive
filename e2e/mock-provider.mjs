/**
 * Minimal OpenAI-compatible mock provider for E2E: /v1/chat/completions
 * streams a tiny SSE reply; /__log dumps received requests (timestamped);
 * /__mode switches behavior between ok / fail / flaky.
 */
import { createServer } from 'node:http'

const port = Number(process.argv[2] ?? 9201)
const name = process.argv[3] ?? 'mock'
let mode = process.argv[4] ?? 'ok'
const log = []

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (url.pathname === '/__mode') {
    mode = url.searchParams.get('m') ?? 'ok'
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ name, mode }))
    return
  }
  if (url.pathname === '/__log') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(log))
    return
  }
  if (url.pathname === '/v1/models') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ object: 'list', data: [{ id: 'mock-keepalive-model' }] }))
    return
  }
  if (url.pathname === '/v1/chat/completions' && req.method === 'POST') {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      let parsed = null
      try {
        parsed = JSON.parse(body)
      } catch {
        parsed = { raw: body }
      }
      log.push({ at: Date.now(), path: url.pathname, body: parsed })
      if (mode === 'fail') {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: { message: 'mock failure mode' } }))
        return
      }
      const userText = parsed?.messages?.[parsed.messages.length - 1]?.content
      const text = typeof userText === 'string' ? userText.slice(0, 20) : Array.isArray(userText) ? String(userText[0]?.text ?? '').slice(0, 20) : ''
      if (parsed?.stream === true) {
        res.writeHead(200, { 'content-type': 'text/event-stream' })
        const frame = (obj) => res.write('data: ' + JSON.stringify(obj) + '\n\n')
        frame({ id: 'mock', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content: 'ok:' + text }, finish_reason: null }] })
        res.write('data: [DONE]\n\n')
        res.end()
      } else {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ id: 'mock', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: 'ok:' + text }, finish_reason: 'stop' }], usage: { prompt_tokens: 5, completion_tokens: 1 } }))
      }
    })
    return
  }
  res.writeHead(404)
  res.end('not found')
})

server.listen(port, '127.0.0.1', () => {
  console.log(name + ' mock provider on 127.0.0.1:' + String(port) + ' mode=' + mode)
})
