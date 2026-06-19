import React, { useState, useEffect } from 'react'
import { verifyRegistration, fetchConfig } from '../api.js'
import CertbotModal from './CertbotModal.jsx'
import IssueCertModal from './IssueCertModal.jsx'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function Field({ label, value, mono = false, copyable = true }) {
  const empty = !value || value === '—'
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 w-24 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm break-all flex-1 ${mono ? 'font-mono' : ''} ${empty ? 'text-gray-400' : 'text-gray-900'}`}>
        {value || '—'}
      </span>
      {!empty && copyable && <CopyButton text={value} />}
    </div>
  )
}

export default function RegistrationDetails({ registration, onClose }) {
  const { username, password, fulldomain, subdomain, label, domain, allowfrom, txtValue, lastUpdate } = registration
  const cname = domain ? `_acme-challenge.${domain}. CNAME ${fulldomain}.` : null

  const [verifyState, setVerifyState] = useState('idle')
  const [verifyResult, setVerifyResult] = useState(null)
  const [showCertbot, setShowCertbot] = useState(false)
  const [showIssueCert, setShowIssueCert] = useState(false)
  const [acmednsUrl, setAcmednsUrl] = useState(`http://${fulldomain.split('.').slice(1).join('.')}`)

  useEffect(() => {
    fetchConfig().then(cfg => {
      if (cfg.acmedns_url) setAcmednsUrl(cfg.acmedns_url)
    }).catch(() => {})
  }, [])

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
    const data = { [domain]: { username, password, fulldomain, subdomain, allowfrom: allowfrom || [] } }
    download(JSON.stringify(data, null, 2), `acmedns-${domain}.json`, 'application/json')
  }

  function exportIni() {
    const content = [
      `dns_acmedns_api_url = ${acmednsUrl}`,
      `dns_acmedns_registration_file = ./acmedns-${domain}.json`,
    ].join('\n')
    download(content, `acmedns-${domain}.ini`)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="font-semibold text-gray-900">{label || username}</h2>
            {domain && <p className="text-xs text-gray-500 mt-0.5">{domain}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
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

          {cname && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">CNAME Record</p>
              <div className="bg-gray-900 text-green-400 rounded-lg px-4 py-3 font-mono text-sm flex items-center justify-between gap-4">
                <span className="break-all">{cname}</span>
                <CopyButton text={cname} />
              </div>
            </div>
          )}

          {domain && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">DNS Verification</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleVerify}
                  disabled={verifyState === 'loading'}
                  className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {verifyState === 'loading' ? 'Checking…' : 'Check DNS'}
                </button>
                {verifyState === 'ok' && <span className="text-sm text-green-600 font-medium">✓ CNAME resolves correctly</span>}
                {verifyState === 'fail' && (
                  <span className="text-sm text-red-600">
                    ✗ Not found{verifyResult?.error ? ` — ${verifyResult.error}` : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {txtValue && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Current TXT Record</p>
              <div className="bg-gray-50 rounded-lg px-4 py-1">
                <Field label="Value" value={txtValue} mono />
                {lastUpdate && <Field label="Updated" value={new Date(lastUpdate).toLocaleString()} copyable={false} />}
              </div>
            </div>
          )}

          {allowfrom?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Allowed IPs</p>
              <div className="bg-gray-50 rounded-lg px-4 py-2 font-mono text-xs text-gray-600 space-y-1">
                {allowfrom.map(ip => <div key={ip}>{ip}</div>)}
              </div>
            </div>
          )}

          {domain && (
            <div className="pt-1 border-t border-gray-100 flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={() => setShowCertbot(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Certbot guide
                </button>
                <button
                  onClick={() => setShowIssueCert(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Issue certificate
                </button>
              </div>
              {password && (
                <div className="flex gap-3">
                  <button onClick={exportJson} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                    Download JSON
                  </button>
                  <button onClick={exportIni} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                    Download INI
                  </button>
                </div>
              )}
            </div>
          )}

          {showCertbot && (
            <CertbotModal registration={registration} onClose={() => setShowCertbot(false)} />
          )}
          {showIssueCert && (
            <IssueCertModal registration={registration} onClose={() => setShowIssueCert(false)} />
          )}
        </div>
      </div>
    </div>
  )
}
