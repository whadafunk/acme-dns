import React, { useState } from 'react'
import { verifyRegistration } from '../api.js'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function Field({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 w-24 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-900 break-all flex-1 ${mono ? 'font-mono' : ''}`}>{value}</span>
      <CopyButton text={value} />
    </div>
  )
}

export default function NewRegistrationCard({ registration, onDismiss }) {
  const { username, password, fulldomain, subdomain, label, domain } = registration
  const cname = `_acme-challenge.${domain}. CNAME ${fulldomain}.`

  const [verifyState, setVerifyState] = useState('idle')
  const [verifyResult, setVerifyResult] = useState(null)

  async function handleVerify() {
    setVerifyState('loading')
    try {
      const result = await verifyRegistration(username)
      setVerifyResult(result)
      setVerifyState(result.verified ? 'ok' : 'fail')
    } catch {
      setVerifyState('fail')
    }
  }

  function download(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
  }

  function exportJson() {
    const data = { [domain]: { username, password, fulldomain, subdomain, allowfrom: [] } }
    download(JSON.stringify(data, null, 2), `acmedns-${domain}.json`, 'application/json')
  }

  function exportIni() {
    const acmednsBase = `http://${fulldomain.split('.').slice(1).join('.')}`
    const content = [
      `dns_acmedns_api_url = ${acmednsBase}`,
      `dns_acmedns_registration_file = ./acmedns-${domain}.json`,
    ].join('\n')
    download(content, `acmedns-${domain}.ini`)
  }

  return (
    <div className="bg-white border border-blue-200 rounded-xl shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Registration created — {label}</h2>
          <p className="text-xs text-amber-600 mt-0.5">Save your credentials now. The password will not be shown again.</p>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>

      <div className="px-6 py-4 space-y-5">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Credentials</p>
          <div className="bg-gray-50 rounded-lg px-4 py-1">
            <Field label="Username" value={username} mono />
            <Field label="Password" value={password} mono />
            <Field label="Full domain" value={fulldomain} mono />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Step 1 — Add this CNAME to your DNS</p>
          <div className="bg-gray-900 text-green-400 rounded-lg px-4 py-3 font-mono text-sm flex items-center justify-between gap-4">
            <span className="break-all">{cname}</span>
            <CopyButton text={cname} />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Step 2 — Verify CNAME is live</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleVerify}
              disabled={verifyState === 'loading'}
              className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {verifyState === 'loading' ? 'Checking…' : 'Check DNS'}
            </button>
            {verifyState === 'ok' && (
              <span className="text-sm text-green-600 font-medium">✓ CNAME resolves correctly</span>
            )}
            {verifyState === 'fail' && (
              <span className="text-sm text-red-600">
                ✗ Not found{verifyResult?.error ? ` — ${verifyResult.error}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="pt-1 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">Export credentials for your ACME client</p>
          <div className="flex gap-3">
            <button onClick={exportJson} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Download JSON
            </button>
            <button onClick={exportIni} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Download INI
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
