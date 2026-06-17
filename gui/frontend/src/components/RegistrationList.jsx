import React, { useState, useEffect, useRef } from 'react'
import { verifyRegistration } from '../api.js'
import CertbotModal from './CertbotModal.jsx'

function DnsStatusBadge({ username }) {
  const [state, setState] = useState('idle')

  async function check() {
    setState('loading')
    try {
      const result = await verifyRegistration(username)
      setState(result.verified ? 'ok' : 'fail')
    } catch {
      setState('fail')
    }
  }

  if (state === 'idle') {
    return (
      <button onClick={check} className="text-xs text-gray-400 hover:text-blue-600 underline underline-offset-2">
        Check
      </button>
    )
  }
  if (state === 'loading') return <span className="text-xs text-gray-400">Checking…</span>
  if (state === 'ok') return <span className="text-xs font-medium text-green-600">✓ Verified</span>
  return <span className="text-xs font-medium text-red-500">✗ Not found</span>
}

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

export default function RegistrationList({ registrations, loading, onRefresh, onSelect, onDelete }) {
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [certbotReg, setCertbotReg] = useState(null)
  const headerCheckboxRef = useRef(null)

  const allSelected = registrations.length > 0 && selected.size === registrations.length
  const someSelected = selected.size > 0 && !allSelected

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  // Drop stale selections when list changes (e.g. after refresh)
  useEffect(() => {
    const valid = new Set(registrations.map(r => r.username))
    setSelected(prev => {
      const next = new Set([...prev].filter(u => valid.has(u)))
      return next.size === prev.size ? prev : next
    })
  }, [registrations])

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(registrations.map(r => r.username)))
  }

  function toggle(username) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(username) ? next.delete(username) : next.add(username)
      return next
    })
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete([...selected])
      setSelected(new Set())
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
        Loading…
      </div>
    )
  }

  if (!registrations.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-sm">No registrations yet.</p>
        <p className="text-gray-400 text-xs mt-1">Click "New Registration" to get started.</p>
      </div>
    )
  }

  return (
    <>
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        {selected.size > 0 ? (
          <>
            <span className="text-sm text-gray-600">{selected.size} selected</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                {deleting ? 'Deleting…' : `Delete ${selected.size}`}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-medium text-gray-900">Registrations</h2>
            <button onClick={onRefresh} className="text-xs text-gray-400 hover:text-gray-600">Refresh</button>
          </>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="pl-6 pr-3 py-3 w-8">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Label</th>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Domain</th>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Subdomain</th>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">CNAME</th>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Last Update</th>
              <th className="px-3 py-3 pr-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {registrations.map(r => (
              <tr
                key={r.username}
                onClick={() => onSelect(r)}
                className={`transition-colors cursor-pointer ${selected.has(r.username) ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <td className="pl-6 pr-3 py-4" onClick={e => { e.stopPropagation(); toggle(r.username) }}>
                  <input
                    type="checkbox"
                    checked={selected.has(r.username)}
                    onChange={() => toggle(r.username)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                <td className="px-3 py-4 font-medium text-gray-900">
                  {r.label || <span className="text-gray-400 font-normal">—</span>}
                </td>
                <td className="px-3 py-4 text-gray-600">
                  {r.domain || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-4 font-mono text-xs text-gray-500">
                  {r.subdomain.slice(0, 8)}…
                </td>
                <td className="px-3 py-4">
                  {r.domain
                    ? <DnsStatusBadge username={r.username} />
                    : <span className="text-xs text-gray-300">No domain</span>
                  }
                </td>
                <td className="px-3 py-4 text-xs text-gray-400">
                  {formatDate(r.lastUpdate)}
                </td>
                <td className="px-3 py-4 pr-6" onClick={e => e.stopPropagation()}>
                  {r.domain && (
                    <button
                      onClick={() => setCertbotReg(r)}
                      className="text-xs text-gray-400 hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded px-2 py-0.5 transition-colors"
                    >
                      Certbot
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {certbotReg && (
      <CertbotModal registration={certbotReg} onClose={() => setCertbotReg(null)} />
    )}
    </>
  )
}
