import React, { useState } from 'react'
import { createRegistration } from '../api.js'

export default function RegisterModal({ onClose, onRegistered }) {
  const [label, setLabel] = useState('')
  const [domain, setDomain] = useState('')
  const [allowfrom, setAllowfrom] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const parsedAllowfrom = allowfrom
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
      const reg = await createRegistration({ label, domain, allowfrom: parsedAllowfrom })
      onRegistered({ ...reg, label, domain })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">New Registration</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input
              type="text"
              required
              placeholder="e.g. Wildcard upsigma.cc"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
            <input
              type="text"
              required
              placeholder="e.g. upsigma.cc"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">The domain you want a certificate for.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allowed IPs <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              placeholder={"192.168.1.0/24\n10.0.0.5/32"}
              value={allowfrom}
              onChange={e => setAllowfrom(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">One IP or CIDR per line (e.g. 1.2.3.4 or 10.0.0.0/24). Bare IPs are treated as /32.</p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? 'Registering…' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
