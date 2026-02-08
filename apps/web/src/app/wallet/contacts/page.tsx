'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { useAccount } from '@/contexts/account-context'
import { loadContacts, saveContact, deleteContact, searchContacts, type Contact } from '@/lib/contacts-service'

export default function ContactsPage() {
  const router = useRouter()
  const { isLoggedIn, address } = useAccount()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newUsername, setNewUsername] = useState('')

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/unlock')
      return
    }
    setContacts(loadContacts(address))
  }, [isLoggedIn, address, router])

  const filtered = search
    ? searchContacts(address, search)
    : contacts

  const handleAdd = () => {
    if (!newName.trim() || !newAddress.trim()) return
    saveContact(address, {
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

  const handleDelete = (id: string) => {
    deleteContact(address, id)
    setContacts(loadContacts(address))
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-8 pb-12">
        <div className="w-full max-w-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform">
                <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>
            <h1 className="text-lg font-semibold text-white">Contacts</h1>
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
            className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/15 mb-4"
          />

          {/* Add Contact Form */}
          {showAdd && (
            <div className="glass-card rounded-2xl p-5 mb-4">
              <h3 className="text-sm font-semibold text-white mb-3">Add Contact</h3>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none mb-2"
              />
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="0x address"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none mb-2 font-mono"
              />
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="@username (optional)"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 rounded-xl glass-card text-white/60 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim() || !newAddress.trim()}
                  className="flex-1 py-2 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Contact List */}
          {filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-white/40 text-sm">
                {search ? 'No contacts match your search' : 'No contacts yet'}
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
              {filtered.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 hover:bg-white/3 transition-colors">
                  <button
                    onClick={() => router.push(`/wallet/send?to=${contact.address}`)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-sm font-bold text-white/60">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{contact.name}</p>
                      <p className="text-xs text-white/40 font-mono truncate">
                        {contact.username ? `@${contact.username}` : `${contact.address.slice(0, 6)}...${contact.address.slice(-4)}`}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-2 rounded-lg text-white/20 hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-colors"
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
