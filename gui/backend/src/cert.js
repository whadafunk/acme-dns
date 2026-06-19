import * as acme from 'acme-client'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'

const CERTS_DIR = process.env.CERTS_DIR || '/data/certs'

function certDir(domain, staging) {
  return path.join(CERTS_DIR, domain, staging ? 'staging' : 'prod')
}

function accountKeyPath(staging) {
  return path.join(CERTS_DIR, `account-${staging ? 'staging' : 'prod'}.pem`)
}

async function getOrCreateAccountKey(staging) {
  mkdirSync(CERTS_DIR, { recursive: true })
  const keyPath = accountKeyPath(staging)
  if (existsSync(keyPath)) return readFileSync(keyPath)
  const key = await acme.crypto.createPrivateKey()
  writeFileSync(keyPath, key, { mode: 0o600 })
  return key
}

export async function issueCertificate({ domain, username, password, subdomain, staging = false, acmeDnsUrl }) {
  const dir = certDir(domain, staging)
  mkdirSync(dir, { recursive: true })

  const accountKey = await getOrCreateAccountKey(staging)

  const client = new acme.Client({
    directoryUrl: staging
      ? acme.directory.letsencrypt.staging
      : acme.directory.letsencrypt.production,
    accountKey,
  })

  const [certKey, csr] = await acme.crypto.createCsr({
    commonName: domain,
    altNames: [`*.${domain}`],
  })

  const cert = await client.auto({
    csr,
    termsOfServiceAgreed: true,
    challengePriority: ['dns-01'],
    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
      const res = await fetch(`${acmeDnsUrl}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-User': username,
          'X-Api-Key': password,
        },
        body: JSON.stringify({ subdomain, txt: keyAuthorization }),
      })
      if (!res.ok) throw new Error(`acme-dns update failed: ${res.status} ${await res.text()}`)
      // Allow time for DNS propagation
      await new Promise(r => setTimeout(r, 15000))
    },
    challengeRemoveFn: async () => {},
  })

  const leafCert = cert.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)[0] + '\n'

  writeFileSync(path.join(dir, 'privkey.pem'), certKey, { mode: 0o600 })
  writeFileSync(path.join(dir, 'fullchain.pem'), cert)
  writeFileSync(path.join(dir, 'cert.pem'), leafCert)

  let expiresAt = null
  try {
    const info = await acme.crypto.readCertificateInfo(leafCert)
    expiresAt = info.notAfter?.toISOString?.() ?? null
  } catch {}

  const meta = { issuedAt: new Date().toISOString(), expiresAt, staging, domain, domains: [domain, `*.${domain}`] }
  writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2))

  return meta
}

export function getCertInfo(domain) {
  const result = {}
  for (const staging of [false, true]) {
    const metaPath = path.join(certDir(domain, staging), 'meta.json')
    if (existsSync(metaPath)) {
      result[staging ? 'staging' : 'prod'] = JSON.parse(readFileSync(metaPath, 'utf8'))
    }
  }
  return result
}

export function getCertFile(domain, staging, filename) {
  const allowed = ['privkey.pem', 'fullchain.pem', 'cert.pem']
  if (!allowed.includes(filename)) return null
  const filePath = path.join(certDir(domain, staging), filename)
  if (!existsSync(filePath)) return null
  return readFileSync(filePath)
}
