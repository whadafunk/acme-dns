const BASE = '/api'

export async function fetchRegistrations() {
  const r = await fetch(`${BASE}/registrations`)
  if (!r.ok) throw new Error('Failed to load registrations')
  return r.json()
}

export async function createRegistration({ label, domain, allowfrom }) {
  const r = await fetch(`${BASE}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label, domain, allowfrom }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || 'Registration failed')
  return data
}

export async function verifyRegistration(username) {
  const r = await fetch(`${BASE}/registrations/${username}/verify`)
  if (!r.ok) throw new Error('Verification request failed')
  return r.json()
}

export async function deleteRegistrations(usernames) {
  const r = await fetch(`${BASE}/registrations`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernames }),
  })
  if (!r.ok) {
    const data = await r.json()
    throw new Error(data.error || 'Delete failed')
  }
}

export async function fetchConfig() {
  const r = await fetch(`${BASE}/config`)
  if (!r.ok) throw new Error('Failed to load config')
  return r.json()
}

export async function saveConfig(config) {
  const r = await fetch(`${BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!r.ok) {
    const data = await r.json()
    throw new Error(data.error || 'Save failed')
  }
}

export async function restartServer() {
  const r = await fetch(`${BASE}/restart`, { method: 'POST' })
  if (!r.ok) {
    const data = await r.json().catch(() => ({}))
    throw new Error(data.error || 'Restart failed')
  }
}

export async function fetchHealth() {
  try {
    const r = await fetch(`${BASE}/health`)
    return r.ok
  } catch {
    return false
  }
}
