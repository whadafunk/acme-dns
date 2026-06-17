import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const DB_PATH = process.env.ACME_DNS_DB || '../../data/acme-dns.db'
const LABELS_PATH = process.env.LABELS_FILE || '../../data/labels.json'

function getDb() {
  return new Database(path.resolve(DB_PATH), { readonly: true })
}

function readLabels() {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(LABELS_PATH), 'utf8'))
  } catch {
    return {}
  }
}

function writeLabels(labels) {
  fs.writeFileSync(path.resolve(LABELS_PATH), JSON.stringify(labels, null, 2))
}

export function getRegistrations() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT r.Username, r.Subdomain, r.AllowFrom,
           t.Value as TxtValue, t.LastUpdate
    FROM records r
    LEFT JOIN (
      SELECT Subdomain, Value, MAX(LastUpdate) as LastUpdate
      FROM txt GROUP BY Subdomain
    ) t ON r.Subdomain = t.Subdomain
  `).all()
  db.close()

  const labels = readLabels()
  return rows.map(r => ({
    username: r.Username,
    subdomain: r.Subdomain,
    allowfrom: JSON.parse(r.AllowFrom || '[]'),
    txtValue: r.TxtValue || null,
    lastUpdate: r.LastUpdate || null,
    ...(labels[r.Username] || {}),
  }))
}

export function saveLabel(username, meta) {
  const labels = readLabels()
  labels[username] = meta
  writeLabels(labels)
}

export function getLabelMeta(username) {
  return readLabels()[username] || null
}

export function deleteRegistrations(usernames) {
  const db = new Database(path.resolve(DB_PATH))
  const placeholders = usernames.map(() => '?').join(',')
  const subdomains = db.prepare(`SELECT Subdomain FROM records WHERE Username IN (${placeholders})`).all(...usernames).map(r => r.Subdomain)
  if (subdomains.length) {
    const subPlaceholders = subdomains.map(() => '?').join(',')
    db.prepare(`DELETE FROM txt WHERE Subdomain IN (${subPlaceholders})`).run(...subdomains)
  }
  db.prepare(`DELETE FROM records WHERE Username IN (${placeholders})`).run(...usernames)
  db.close()

  const labels = readLabels()
  usernames.forEach(u => delete labels[u])
  writeLabels(labels)
}
