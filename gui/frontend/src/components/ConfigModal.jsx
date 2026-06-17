import React, { useState, useEffect } from 'react'
import { fetchConfig, saveConfig, restartServer } from '../api.js'

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export default function ConfigModal({ onClose }) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchConfig()
      .then(c => setConfig({ ...c, corsorigins: c.corsorigins.join('\n'), records: c.records.join('\n') }))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function set(key, value) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...config,
        corsorigins: config.corsorigins.split('\n').map(s => s.trim()).filter(Boolean),
        records: config.records.split('\n').map(s => s.trim()).filter(Boolean),
      }
      await saveConfig(payload)
      await restartServer()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-gray-900">Configuration</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {loading && <p className="text-sm text-gray-400 text-center py-8">Loading…</p>}

          {!loading && config && (
            <>
              <Field label="Base Domain" hint="The suffix used for all fulldomain values (e.g. acme.upsigma.cc).">
                <input
                  type="text"
                  value={config.domain}
                  onChange={e => set('domain', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Admin Email" hint="Shown in the SOA record. Use dot instead of @ (e.g. admin.upsigma.cc).">
                <input
                  type="text"
                  value={config.nsadmin}
                  onChange={e => set('nsadmin', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Log Level">
                <select
                  value={config.loglevel}
                  onChange={e => set('loglevel', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['error', 'warning', 'info', 'debug'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </Field>

              <Field label="DNS Records" hint="Predefined records served by the server. One record per line.">
                <textarea
                  value={config.records}
                  onChange={e => set('records', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="CORS Origins" hint="One origin per line. Use * to allow all.">
                <textarea
                  value={config.corsorigins}
                  onChange={e => set('corsorigins', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Disable Registration</p>
                  <p className="text-xs text-gray-400">Prevent new registrations from being created.</p>
                </div>
                <Toggle checked={config.disable_registration} onChange={v => set('disable_registration', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Debug Logging</p>
                  <p className="text-xs text-gray-400">Enable verbose debug output from the server.</p>
                </div>
                <Toggle checked={config.debug} onChange={v => set('debug', v)} />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0 space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Changes take effect after restart.</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving & Restarting…' : 'Save & Restart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
