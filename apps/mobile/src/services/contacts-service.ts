/**
 * Contacts Service
 * Local storage for frequent recipients
 */

import Storage from '@/src/utils/storage';

const CONTACTS_STORAGE_KEY = 'e-y_contacts';

export interface Contact {
  id: string;
  name: string;
  address: string;
  username?: string; // @username if known
  createdAt: number;
  lastUsedAt: number;
}

/**
 * Load all contacts from storage
 */
export async function loadContacts(): Promise<Contact[]> {
  try {
    const data = await Storage.getItem(CONTACTS_STORAGE_KEY);
    if (!data) return [];

    const contacts: Contact[] = JSON.parse(data);
    // Sort by last used (most recent first)
    return contacts.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  } catch (error) {
    console.warn('Error loading contacts:', error);
    return [];
  }
}

/**
 * Save a new contact
 */
export async function saveContact(contact: Omit<Contact, 'id' | 'createdAt' | 'lastUsedAt'>): Promise<Contact> {
  const contacts = await loadContacts();

  // Check if contact with this address already exists
  const existingIndex = contacts.findIndex(
    c => c.address.toLowerCase() === contact.address.toLowerCase()
  );

  const now = Date.now();

  if (existingIndex >= 0) {
    // Update existing contact
    const updated: Contact = {
      ...contacts[existingIndex],
      name: contact.name,
      username: contact.username || contacts[existingIndex].username,
      lastUsedAt: now,
    };
    contacts[existingIndex] = updated;
    await Storage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
    return updated;
  }

  // Create new contact
  const newContact: Contact = {
    id: `contact_${now}_${Math.random().toString(36).slice(2, 9)}`,
    name: contact.name,
    address: contact.address,
    username: contact.username,
    createdAt: now,
    lastUsedAt: now,
  };

  contacts.unshift(newContact);
  await Storage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  return newContact;
}

/**
 * Update contact's last used timestamp
 */
export async function touchContact(address: string): Promise<void> {
  const contacts = await loadContacts();
  const index = contacts.findIndex(
    c => c.address.toLowerCase() === address.toLowerCase()
  );

  if (index >= 0) {
    contacts[index].lastUsedAt = Date.now();
    await Storage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  }
}

/**
 * Update a contact
 */
export async function updateContact(
  id: string,
  updates: Partial<Pick<Contact, 'name' | 'username'>>
): Promise<Contact | null> {
  const contacts = await loadContacts();
  const index = contacts.findIndex(c => c.id === id);

  if (index < 0) return null;

  const updated: Contact = {
    ...contacts[index],
    ...updates,
    lastUsedAt: Date.now(),
  };

  contacts[index] = updated;
  await Storage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  return updated;
}

/**
 * Delete a contact
 */
export async function deleteContact(id: string): Promise<boolean> {
  const contacts = await loadContacts();
  const filtered = contacts.filter(c => c.id !== id);

  if (filtered.length === contacts.length) return false;

  await Storage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Find contact by address
 */
export async function findContactByAddress(address: string): Promise<Contact | null> {
  const contacts = await loadContacts();
  return contacts.find(
    c => c.address.toLowerCase() === address.toLowerCase()
  ) || null;
}

/**
 * Search contacts by name or address
 */
export async function searchContacts(query: string): Promise<Contact[]> {
  const contacts = await loadContacts();
  const lowerQuery = query.toLowerCase();

  return contacts.filter(c =>
    c.name.toLowerCase().includes(lowerQuery) ||
    c.address.toLowerCase().includes(lowerQuery) ||
    (c.username && c.username.toLowerCase().includes(lowerQuery))
  );
}
