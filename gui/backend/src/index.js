import express from 'express'
import cors from 'cors'
import { getRegistrations, saveLabel, getLabelMeta, deleteRegistrations } from './db.js'
import { verifyCname } from './dns.js'
import { readConfig, writeConfig, restartContainer } from './config.js'

const app = express()
const PORT = process.env.PORT || 3001
const ACME_DNS_URL = process.env.ACME_DNS_URL || 'http://localhost:8053'

app.use(cors())
app.use(express.json())

app.get('/api/registrations', (req, res) => {
  try {
    res.json(getRegistrations())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/registrations', async (req, res) => {
  const { label, domain, allowfrom } = req.body

  if (!label || !domain) {
    return res.status(400).json({ error: 'label and domain are required' })
  }

  const normalizedAllowfrom = (allowfrom || []).map(ip =>
    /\/\d+$/.test(ip) ? ip : `${ip}/32`
  )
  const body = normalizedAllowfrom.length ? { allowfrom: normalizedAllowfrom } : {}

  try {
    const upstream = await fetch(`${ACME_DNS_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: Object.keys(body).length ? JSON.stringify(body) : undefined,
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'acme-dns registration failed' })
    }

    const data = await upstream.json()
    saveLabel(data.username, { label, domain, fulldomain: data.fulldomain, subdomain: data.subdomain, password: data.password })

    res.json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

app.delete('/api/registrations', (req, res) => {
  const { usernames } = req.body
  if (!Array.isArray(usernames) || !usernames.length) {
    return res.status(400).json({ error: 'usernames array is required' })
  }
  try {
    deleteRegistrations(usernames)
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/registrations/:username/verify', async (req, res) => {
  const meta = getLabelMeta(req.params.username)
  if (!meta?.domain || !meta?.fulldomain) {
    return res.status(404).json({ error: 'No domain metadata for this registration' })
  }

  const result = await verifyCname(meta.domain, meta.fulldomain)
  res.json(result)
})

app.get('/api/config', (req, res) => {
  try {
    res.json(readConfig())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/config', (req, res) => {
  try {
    writeConfig(req.body)
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/restart', async (req, res) => {
  try {
    await restartContainer()
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/health', async (req, res) => {
  try {
    const r = await fetch(`${ACME_DNS_URL}/health`)
    res.status(r.status).end()
  } catch {
    res.status(503).end()
  }
})

app.listen(PORT, () => console.log(`Backend listening on :${PORT}`))
