import express from 'express'
import cors from 'cors'
import { getRegistrations, saveLabel, getLabelMeta, deleteRegistrations } from './db.js'
import { verifyCname } from './dns.js'
import { readConfig, writeConfig, restartContainer } from './config.js'
import { issueCertificate, getCertInfo, getCertFile } from './cert.js'

const app = express()
const PORT = process.env.PORT || 3001
const ACME_DNS_URL = process.env.ACME_DNS_URL || 'http://localhost:8053'
const ACME_DNS_PUBLIC_URL = process.env.ACME_DNS_PUBLIC_URL || null

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

app.post('/api/registrations/:username/certificate', async (req, res) => {
  const meta = getLabelMeta(req.params.username)
  if (!meta?.domain || !meta?.password) {
    return res.status(400).json({ error: 'Registration missing domain or password' })
  }
  const { staging = false } = req.body
  try {
    const result = await issueCertificate({
      domain: meta.domain,
      username: req.params.username,
      password: meta.password,
      subdomain: meta.subdomain,
      staging,
      acmeDnsUrl: ACME_DNS_URL,
    })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/registrations/:username/certificate', (req, res) => {
  const meta = getLabelMeta(req.params.username)
  if (!meta?.domain) return res.status(404).json({ error: 'Registration not found' })
  const info = getCertInfo(meta.domain)
  if (!info.prod && !info.staging) return res.status(404).json({ error: 'No certificate issued yet' })
  res.json(info)
})

app.get('/api/registrations/:username/certificate/:env/:file', (req, res) => {
  const { env, file } = req.params
  if (env !== 'prod' && env !== 'staging') return res.status(400).end()
  const meta = getLabelMeta(req.params.username)
  if (!meta?.domain) return res.status(404).end()
  const content = getCertFile(meta.domain, env === 'staging', file)
  if (!content) return res.status(404).end()
  res.setHeader('Content-Type', 'application/x-pem-file')
  res.setHeader('Content-Disposition', `attachment; filename="${file}"`)
  res.send(content)
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
    const config = readConfig()
    if (ACME_DNS_PUBLIC_URL) config.acmedns_url = ACME_DNS_PUBLIC_URL
    res.json(config)
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
