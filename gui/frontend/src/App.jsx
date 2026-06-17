import React, { useState, useEffect, useCallback } from 'react'
import { fetchRegistrations, fetchHealth, deleteRegistrations } from './api.js'
import RegistrationList from './components/RegistrationList.jsx'
import RegisterModal from './components/RegisterModal.jsx'
import NewRegistrationCard from './components/NewRegistrationCard.jsx'
import RegistrationDetails from './components/RegistrationDetails.jsx'
import ConfigModal from './components/ConfigModal.jsx'

export default function App() {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [healthy, setHealthy] = useState(null)
  const [showRegister, setShowRegister] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [newReg, setNewReg] = useState(null)
  const [selectedReg, setSelectedReg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [regs, health] = await Promise.all([fetchRegistrations(), fetchHealth()])
      setRegistrations(regs)
      setHealthy(health)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(usernames) {
    await deleteRegistrations(usernames)
    load()
  }

  function handleRegistered(reg) {
    setShowRegister(false)
    setNewReg(reg)
    load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">acme-dns</h1>
            {healthy !== null && (
              <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                healthy ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${healthy ? 'bg-green-500' : 'bg-red-500'}`} />
                {healthy ? 'Online' : 'Offline'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(true)}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Config
            </button>
            <button
              onClick={() => setShowRegister(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              New Registration
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {newReg && (
          <NewRegistrationCard
            registration={newReg}
            onDismiss={() => setNewReg(null)}
          />
        )}
        <RegistrationList
          registrations={registrations}
          loading={loading}
          onRefresh={load}
          onSelect={setSelectedReg}
          onDelete={handleDelete}
        />
      </main>

      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onRegistered={handleRegistered}
        />
      )}

      {selectedReg && (
        <RegistrationDetails
          registration={selectedReg}
          onClose={() => setSelectedReg(null)}
        />
      )}

      {showConfig && (
        <ConfigModal onClose={() => setShowConfig(false)} />
      )}
    </div>
  )
}
