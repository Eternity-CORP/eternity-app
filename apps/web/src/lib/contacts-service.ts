/**
 * Contacts Service (Web)
 * localStorage-based contact book, per-account isolation.
 */

const CONTACTS_STORAGE_PREFIX = 'e-y_contacts_'

function getStorageKey(accountAddress: string): string {
  return `${CONTACTS_STORAGE_PREFIX}${accountAddress.toLowerCase()}`
}

export interface Contact {
  id: string
  name: string
  address: string
  username?: string
  createdAt: number
  lastUsedAt: number
}

export function loadContacts(accountAddress: string): Contact[] {
  if (!accountAddress) return []
  try {
    const data = localStorage.getItem(getStorageKey(accountAddress))
    if (!data) return []
    const contacts: Contact[] = JSON.parse(data)
    return contacts.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
  } catch {
    return []
  }
}

export function saveContact(
  accountAddress: string,
  contact: Omit<Contact, 'id' | 'createdAt' | 'lastUsedAt'>,
): Contact {
  const contacts = loadContacts(accountAddress)
  const key = getStorageKey(accountAddress)
  const now = Date.now()

  const existingIndex = contacts.findIndex(
    (c) => c.address.toLowerCase() === contact.address.toLowerCase(),
  )

  if (existingIndex >= 0) {
    const updated: Contact = {
      ...contacts[existingIndex],
      name: contact.name,
      username: contact.username || contacts[existingIndex].username,
      lastUsedAt: now,
    }
    contacts[existingIndex] = updated
    localStorage.setItem(key, JSON.stringify(contacts))
    return updated
  }

  const newContact: Contact = {
    id: `contact_${now}_${Math.random().toString(36).slice(2, 9)}`,
    name: contact.name,
    address: contact.address,
    username: contact.username,
    createdAt: now,
    lastUsedAt: now,
  }

  contacts.unshift(newContact)
  localStorage.setItem(key, JSON.stringify(contacts))
  return newContact
}

export function deleteContact(accountAddress: string, id: string): boolean {
  const contacts = loadContacts(accountAddress)
  const filtered = contacts.filter((c) => c.id !== id)
  if (filtered.length === contacts.length) return false
  localStorage.setItem(getStorageKey(accountAddress), JSON.stringify(filtered))
  return true
}

export function searchContacts(accountAddress: string, query: string): Contact[] {
  const contacts = loadContacts(accountAddress)
  const lowerQuery = query.toLowerCase()
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.address.toLowerCase().includes(lowerQuery) ||
      (c.username && c.username.toLowerCase().includes(lowerQuery)),
  )
}

export function touchContact(accountAddress: string, contactAddress: string): void {
  const contacts = loadContacts(accountAddress)
  const index = contacts.findIndex(
    (c) => c.address.toLowerCase() === contactAddress.toLowerCase(),
  )
  if (index >= 0) {
    contacts[index].lastUsedAt = Date.now()
    localStorage.setItem(getStorageKey(accountAddress), JSON.stringify(contacts))
  }
}
