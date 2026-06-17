import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'

const CONFIG_PATH = process.env.ACME_DNS_CONFIG || '../../config.cfg'
const CONTAINER_NAME = process.env.ACME_DNS_CONTAINER || 'acme-dns'

function readText() {
  return fs.readFileSync(path.resolve(CONFIG_PATH), 'utf8')
}

function readScalar(text, key) {
  const m = text.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'))
  return m ? m[1] : null
}

function readBool(text, key) {
  const m = text.match(new RegExp(`^${key}\\s*=\\s*(true|false)`, 'm'))
  return m ? m[1] === 'true' : null
}

function readArray(text, key) {
  const m = text.match(new RegExp(`^${key}\\s*=\\s*\\[([\\s\\S]*?)\\]`, 'm'))
  if (!m) return []
  return [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1])
}

export function readConfig() {
  const text = readText()
  return {
    domain: readScalar(text, 'domain'),
    nsadmin: readScalar(text, 'nsadmin'),
    debug: readBool(text, 'debug'),
    disable_registration: readBool(text, 'disable_registration'),
    loglevel: readScalar(text, 'loglevel'),
    corsorigins: readArray(text, 'corsorigins'),
    records: readArray(text, 'records'),
  }
}

function replaceScalar(text, key, value) {
  const formatted = typeof value === 'string' ? `"${value}"` : String(value)
  return text.replace(new RegExp(`^(${key}\\s*=\\s*).*$`, 'm'), `$1${formatted}`)
}

function replaceArray(text, key, values) {
  const body = values.map(v => `    "${v}"`).join(',\n')
  const replacement = values.length ? `${key} = [\n${body},\n]` : `${key} = []`
  return text.replace(new RegExp(`^${key}\\s*=\\s*\\[[\\s\\S]*?\\]`, 'm'), replacement)
}

export function writeConfig(updates) {
  let text = readText()
  if (updates.domain !== undefined)               text = replaceScalar(text, 'domain', updates.domain)
  if (updates.nsadmin !== undefined)              text = replaceScalar(text, 'nsadmin', updates.nsadmin)
  if (updates.debug !== undefined)                text = replaceScalar(text, 'debug', updates.debug)
  if (updates.disable_registration !== undefined) text = replaceScalar(text, 'disable_registration', updates.disable_registration)
  if (updates.loglevel !== undefined)             text = replaceScalar(text, 'loglevel', updates.loglevel)
  if (updates.corsorigins !== undefined)          text = replaceArray(text, 'corsorigins', updates.corsorigins)
  if (updates.records !== undefined)              text = replaceArray(text, 'records', updates.records)
  fs.writeFileSync(path.resolve(CONFIG_PATH), text)
}

export function restartContainer() {
  return new Promise((resolve, reject) => {
    execFile('docker', ['restart', CONTAINER_NAME], (err, _stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve()
    })
  })
}
