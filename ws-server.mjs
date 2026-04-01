// ws-server.mjs - 本地 Yjs WebSocket 協作伺服器
// 執行方式: node ws-server.mjs

import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import * as fs from 'fs'
import * as path from 'path'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as map from 'lib0/map'

const PORT = process.env.PORT || 1234
const docs = new Map()

// 讀取環境變數中的 GITHUB_PAT (優先使用雲端環境的變數，若無則讀取本地 .env)
let GITHUB_PAT = process.env.GITHUB_PAT || ''
if (!GITHUB_PAT) {
  const envPath = path.resolve(process.cwd(), '.env')
  try {
      const envContent = fs.readFileSync(envPath, 'utf-8')
      const match = envContent.match(/^GITHUB_PAT=(.+)$/m)
      if (match) GITHUB_PAT = match[1].trim()
  } catch (_) {}
}

const messageSync = 0
const messageAwareness = 1

const getDoc = (docName) =>
  map.setIfUndefined(docs, docName, () => {
    const doc = new Y.Doc()
    doc.on('update', (update, _, __, tr) => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      syncProtocol.writeUpdate(encoder, update)
      const message = encoding.toUint8Array(encoder)
      doc.conns.forEach((_, conn) => send(conn, message))
    })
    doc.conns = new Map()
    doc.awareness = new awarenessProtocol.Awareness(doc)
    doc.awareness.on('update', ({ added, updated, removed }) => {
      const changedClients = added.concat(updated, removed)
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, changedClients))
      const message = encoding.toUint8Array(encoder)
      doc.conns.forEach((_, conn) => send(conn, message))
    })
    return doc
  })

const send = (conn, message) => {
  if (conn.readyState !== 1) return
  try { conn.send(message) } catch (e) { }
}

const setupConnection = (conn, req) => {
  conn.binaryType = 'arraybuffer'
  const docName = req.url.slice(1).split('?')[0]
  const doc = getDoc(docName)
  doc.conns.set(conn, new Set())
  console.log(`✅ 新連線加入房間: "${docName}"，目前人數: ${doc.conns.size}`)

  conn.on('message', (message) => {
    const decoder = decoding.createDecoder(new Uint8Array(message))
    const msgType = decoding.readVarUint(decoder)
    if (msgType === messageSync) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      syncProtocol.readSyncMessage(decoder, encoder, doc, null)
      const response = encoding.toUint8Array(encoder)
      if (response.byteLength > 1) send(conn, response)
    } else if (msgType === messageAwareness) {
      awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn)
    }
  })

  // 送出完整文件給新加入者
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageSync)
  syncProtocol.writeSyncStep1(encoder, doc)
  send(conn, encoding.toUint8Array(encoder))

  const awarenessStates = doc.awareness.getStates()
  if (awarenessStates.size > 0) {
    const encoder2 = encoding.createEncoder()
    encoding.writeVarUint(encoder2, messageAwareness)
    encoding.writeVarUint8Array(encoder2, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())))
    send(conn, encoding.toUint8Array(encoder2))
  }

  conn.on('close', () => {
    awarenessProtocol.removeAwarenessStates(doc.awareness, [doc.clientID], null)
    doc.conns.delete(conn)
    console.log(`❌ 連線離開房間: "${docName}"，目前人數: ${doc.conns.size}`)
  })
}

const server = createServer(async (req, res) => {
  // CORS headers 讓前端能呼叫
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return
  }

  // GitHub Sync 代理 API
  if (req.url === '/github-sync' && req.method === 'POST') {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const { markdown, path: filePath, username } = JSON.parse(Buffer.concat(chunks).toString())

    if (!GITHUB_PAT) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '請先在 .env 檔加入 GITHUB_PAT=您的Token' }))
      return
    }

    const repo = 'seraphwu/markdown-collab'
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`

    // 檢查檔案是否已存在（取得 SHA）
    let sha = undefined
    try {
      const getRes = await fetch(apiUrl, {
        headers: { 'Authorization': `token ${GITHUB_PAT}`, 'User-Agent': 'Markdown-Collab-Local' }
      })
      if (getRes.ok) sha = (await getRes.json()).sha
    } catch (_) {}

    // Base64 編碼 Markdown
    const content = Buffer.from(markdown).toString('base64')

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_PAT}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Markdown-Collab-Local'
      },
      body: JSON.stringify({
        message: `📝 [Collab] 更新文件 ${filePath} by ${username || 'Unknown'}`,
        content,
        sha
      })
    })

    const result = await putRes.json()
    if (!putRes.ok) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: result.message }))
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true, url: result.content?.html_url }))
    return
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Yjs WebSocket Server Running')
})

const wss = new WebSocketServer({ server })
wss.on('connection', setupConnection)

server.listen(PORT, () => {
  console.log(`🚀 Yjs WebSocket 伺服器已啟動於 ws://localhost:${PORT}`)
})
