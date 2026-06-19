import React, { useState, useEffect } from 'react'
import { issueCertificate, fetchCertInfo, certDownloadUrl } from '../api.js'

function CertCard({ label, meta, username, env }) {
  const issued = meta.issuedAt ? new Date(meta.issuedAt).toLocaleDateString() : null
  const expires = meta.expiresAt ? new Date(meta.expiresAt).toLocaleDateString() : null
  const expired = meta.expiresAt && new Date(meta.expiresAt) < new Date()

  return (
    <div className="rounded-lg border border-gray-200 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${expired ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {expired ? 'Expired' : 'Valid'}
        </span>
      </div>
      <div className="text-xs text-gray-500 space-y-0.5">
        {issued && <div>Issued: {issued}</div>}
        {expires && <div>Expires: {expires}</div>}
      </div>
      <div className="flex gap-2 pt-1">
        <a href={certDownloadUrl(username, env, 'fullchain.pem')} download className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors">
          ↓ fullchain.pem
        </a>
        <a href={certDownloadUrl(username, env, 'cert.pem')} download className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors">
          ↓ cert.pem
        </a>
        <a href={certDownloadUrl(username, env, 'privkey.pem')} download className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors">
          ↓ privkey.pem
        </a>
      </div>
    </div>
  )
}

export default function IssueCertModal({ registration, onClose }) {
  const { username, domain } = registration
  const [certInfo, setCertInfo] = useState(null)
  const [staging, setStaging] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCertInfo(username).then(setCertInfo).catch(() => setCertInfo({}))
  }, [username])

  async function handleIssue() {
    setIssuing(true)
    setError(null)
    try {
      await issueCertificate(username, { staging })
      const info = await fetchCertInfo(username)
      setCertInfo(info)
    } catch (err) {
      setError(err.message)
    } finally {
      setIssuing(false)
    }
  }

  const hasCerts = certInfo && (certInfo.prod || certInfo.staging)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Issue Certificate</h2>
            <p className="text-xs text-gray-500 mt-0.5">{domain}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-4">
          {hasCerts && (
            <div className="space-y-3">
              {certInfo.prod && (
                <CertCard label="Production" meta={certInfo.prod} username={username} env="prod" />
              )}
              {certInfo.staging && (
                <CertCard label="Staging" meta={certInfo.staging} username={username} env="staging" />
              )}
            </div>
          )}

          {certInfo === null && (
            <p className="text-sm text-gray-400">Loading…</p>
          )}

          <div className={`space-y-3 ${hasCerts ? 'pt-2 border-t border-gray-100' : ''}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Issue new certificate</p>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={staging}
                onChange={e => setStaging(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Use Let's Encrypt staging</span>
            </label>

            {staging && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Staging certificates are not trusted by browsers or tools. Use this to verify the flow before issuing a real certificate.
              </p>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 break-all">{error}</p>
            )}

            <button
              onClick={handleIssue}
              disabled={issuing}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              {issuing ? 'Issuing… (this can take up to a minute)' : `Issue ${staging ? 'Staging' : 'Production'} Certificate`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
