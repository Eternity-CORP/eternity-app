import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useWallet } from '../../context/WalletContext';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScreen } from '../../components/common/KeyboardAwareScreen';

export default function ManageAccountsScreen() {
  const { accounts, activeAccount, renameAccount, deleteAccount, switchAccount, canDeleteAccount, busy } = useWallet();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newName, setNewName] = useState<string>('');
  const navigation = useNavigation<any>();

  const saveEdit = async () => {
    if (editingIndex === null) return;
    try {
      await renameAccount(editingIndex, newName);
      setEditingIndex(null);
      setNewName('');
    } catch (e: any) {
      Alert.alert('Rename failed', e?.message || 'Invalid name');
    }
  };

  const handleDelete = async (index: number) => {
    if (!canDeleteAccount(index)) {
      const reason = accounts.length <= 1
        ? 'Cannot delete the last remaining account'
        : 'Cannot delete account with active transactions';
      Alert.alert('Delete not allowed', reason);
      return;
    }
    Alert.alert('Delete Account', 'Are you sure you want to delete this account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteAccount(index);
        } catch (e: any) {
          Alert.alert('Delete failed', e?.message || 'Failed to delete');
        }
      } },
    ]);
  };

  return (
    <KeyboardAwareScreen 
      style={styles.safeArea} 
      withSafeArea={true}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manage Accounts</Text>
          <View style={{ width: 64 }} />
        </View>
      </View>

      {accounts.map(a => (
        <View key={a.index} style={[styles.item, activeAccount?.index === a.index && styles.itemActive]}>
          <View style={{ flex: 1 }}>
            {editingIndex === a.index ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput style={styles.input} value={newName} onChangeText={setNewName} editable={!busy} autoFocus />
                <TouchableOpacity style={styles.actionButton} onPress={saveEdit} disabled={busy}><Text style={styles.actionText}>Save</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.secondary]} onPress={() => setEditingIndex(null)} disabled={busy}><Text style={styles.actionText}>Cancel</Text></TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.name}>{a.name}</Text>
                <Text style={styles.addr}>{a.address}</Text>
                <Text style={styles.path}>Path: m/44'/60'/0'/0/{a.index}</Text>
              </>
            )}
          </View>
          {editingIndex !== a.index && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.iconButton} onPress={() => switchAccount(a.index)} disabled={busy}><Text style={styles.icon}>✓</Text></TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => { setEditingIndex(a.index); setNewName(a.name); }} disabled={busy}><Text style={styles.icon}>✎</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.iconButton, !canDeleteAccount(a.index) && styles.disabled]} onPress={() => handleDelete(a.index)} disabled={!canDeleteAccount(a.index) || busy}><Text style={styles.icon}>🗑</Text></TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0E13' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  header: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#222', marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1b1f27', borderRadius: 8 },
  backText: { color: '#fff', fontSize: 14 },
  title: { color: '#fff', fontSize: 20, fontWeight: '600' },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222', flexDirection: 'row' },
  itemActive: { backgroundColor: '#10141C' },
  name: { color: '#fff', fontSize: 16, fontWeight: '500' },
  addr: { color: '#9aa0a6', fontSize: 12, marginTop: 4 },
  path: { color: '#62666b', fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1b1f27', borderRadius: 8 },
  icon: { color: '#fff', fontSize: 16 },
  input: { flex: 1, backgroundColor: '#1b1f27', borderRadius: 6, padding: 8, color: '#fff', marginRight: 8 },
  actionButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#2b3140', borderRadius: 8 },
  actionText: { color: '#fff' },
  secondary: { backgroundColor: '#3a4150' },
  disabled: { opacity: 0.4 },
});