type SessionRecord = { token: string; createdAtMs: number; expiresAtMs: number }

const sessions = new Map<string, SessionRecord>()
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export function createAdminSession(): { token: string; maxAgeSeconds: number } {
  const token = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  const now = Date.now()
  const rec: SessionRecord = {
    token,
    createdAtMs: now,
    expiresAtMs: now + ONE_DAY_MS,
  }
  sessions.set(token, rec)
  return { token, maxAgeSeconds: Math.floor(ONE_DAY_MS / 1000) }
}

export function validateAdminSession(token: string | undefined | null): boolean {
  if (!token) return false
  const rec = sessions.get(token)
  if (!rec) return false
  if (Date.now() > rec.expiresAtMs) {
    sessions.delete(token)
    return false
  }
  return true
}

export function deleteAdminSession(token: string | undefined | null): void {
  if (!token) return
  sessions.delete(token)
} 