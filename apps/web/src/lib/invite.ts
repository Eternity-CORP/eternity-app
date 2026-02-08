const INVITE_KEY = 'ey_invite_validated'

export function isInviteValidated(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(INVITE_KEY) === 'true'
}

export function setInviteValidated() {
  localStorage.setItem(INVITE_KEY, 'true')
}

export function clearInviteValidated() {
  localStorage.removeItem(INVITE_KEY)
}
