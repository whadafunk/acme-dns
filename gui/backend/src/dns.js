import { promises as dns } from 'dns'

export async function verifyCname(domain, fulldomain) {
  const host = `_acme-challenge.${domain}`
  const expected = fulldomain.replace(/\.$/, '').toLowerCase()

  try {
    const cnames = await dns.resolveCname(host)
    const normalized = cnames.map(c => c.replace(/\.$/, '').toLowerCase())
    const match = normalized.includes(expected)
    return { verified: match, cnames: normalized, expected, host }
  } catch (err) {
    return { verified: false, cnames: [], expected, host, error: err.message }
  }
}
