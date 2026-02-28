'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import { useAccount } from '@/contexts/account-context'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { loadContacts, saveContact, deleteContact, searchContacts, type Contact } from '@/lib/contacts-service'

export default function ContactsPage() {
  const router = useRouter()
  const { isReady } = useAuthGuard()
  const { address } = useAccount()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [filtered, setFiltered] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newUsername, setNewUsername] = useState('')

  useEffect(() => {
    if (!isReady) return
    setContacts(loadContacts(address))
  }, [isReady, address])

  useEffect(() => {
    if (search) {
      searchContacts(address, search).then(setFiltered)
    } else {
      setFiltered(contacts)
    }
  }, [search, contacts, address])

  const handleAdd = async () => {
    if (!newName.trim() || !newAddress.trim()) return
    await saveContact(address, {
      name: newName.trim(),
      address: newAddress.trim(),
      username: newUsername.trim() || undefined,
    })
    setContacts(loadContacts(address))
    setShowAdd(false)
    setNewName('')
    setNewAddress('')
    setNewUsername('')
  }

  const handleDelete = async (id: string) => {
    await deleteContact(address, id)
    setContacts(loadContacts(address))
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-8 pb-12">
        <div className="w-full max-w-[420px]">
          {/* Header */}
          <BackButton />
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-semibold text-[var(--foreground)]">Contacts</h1>
            <button
              onClick={() => setShowAdd(true)}
              className="text-sm text-[#3388FF] hover:text-[#3388FF]/80 transition-colors font-medium"
            >
              + Add
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--border)] mb-4"
          />

          {/* Add Contact Form */}
          {showAdd && (
            <div className="glass-card rounded-2xl p-5 mb-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Add Contact</h3>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none mb-2"
              />
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="0x address"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none mb-2 font-mono"
              />
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="@username (optional)"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 rounded-xl glass-card text-[var(--foreground-muted)] text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim() || !newAddress.trim()}
                  className="flex-1 py-2 rounded-xl bg-[var(--foreground)] text-[var(--background)] text-sm font-semibold disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Contact List */}
          {filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-[var(--foreground-subtle)] text-sm">
                {search ? 'No contacts match your search' : 'No contacts yet'}
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[var(--border-light)]">
              {filtered.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 hover:bg-[var(--surface)] transition-colors">
                  <button
                    onClick={() => router.push(`/wallet/send?to=${contact.address}`)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--surface)] flex items-center justify-center text-sm font-bold text-[var(--foreground-muted)]">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">{contact.name}</p>
                      <p className="text-xs text-[var(--foreground-subtle)] font-mono truncate">
                        {contact.username ? `@${contact.username}` : `${contact.address.slice(0, 6)}...${contact.address.slice(-4)}`}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-2 rounded-lg text-[var(--foreground-subtle)] hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
