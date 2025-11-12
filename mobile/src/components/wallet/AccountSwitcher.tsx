import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useWallet } from '../../context/WalletContext';
import { getETHBalance, formatBalance } from '../../services/blockchain/balanceService';
import { defaultNetwork } from '../../constants/rpcUrls';
import { useNavigation } from '@react-navigation/native';

export default function AccountSwitcher({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { accounts, activeAccount, switchAccount, createAccount, busy } = useWallet();
  const [balances, setBalances] = useState<Record<string, string>>({});
  const navigation = useNavigation<any>();

  useEffect(() => {
    const loadBalances = async () => {
      const entries: Record<string, string> = {};
      for (const a of accounts) {
        try {
          const bn = await getETHBalance(a.address, defaultNetwork);
          entries[a.address] = formatBalance(bn);
        } catch {
          entries[a.address] = '—';
        }
      }
      setBalances(entries);
    };
    if (visible) loadBalances();
  }, [visible, accounts]);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Accounts</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 300 }}>
            {accounts.map((a) => (
              <TouchableOpacity
                key={a.index}
                style={[styles.item, activeAccount?.index === a.index && styles.itemActive]}
                onPress={async () => { try { await switchAccount(a.index); onClose(); } catch (e: any) { Alert.alert('Switch failed', e?.message || 'Cannot switch'); } }}
                disabled={busy}
              >
                <View>
                  <Text style={styles.itemName}>{a.name}</Text>
                  <Text style={styles.itemAddr}>{truncate(a.address)}</Text>
                </View>
                <Text style={styles.itemBal}>{balances[a.address] ?? '…'} ETH</Text>
              </TouchableOpacity>
            ))}
            {accounts.length === 0 && (
              <Text style={styles.empty}>No accounts</Text>
            )}
          </ScrollView>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.button} onPress={async () => { try { await createAccount(); } catch (e: any) { Alert.alert('Create failed', e?.message || 'Unable to create account'); } }} accessibilityRole="button" disabled={busy}>
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => { onClose(); navigation.navigate('ManageAccounts'); }} accessibilityRole="button">
              <Text style={styles.buttonText}>Manage Accounts</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0B0E13', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  close: { color: '#aaa', fontSize: 18 },
  item: { paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#222' },
  itemActive: { backgroundColor: '#10141C' },
  itemName: { color: '#fff', fontSize: 16 },
  itemAddr: { color: '#9aa0a6', fontSize: 12 },
  itemBal: { color: '#fff', fontSize: 14 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  button: { backgroundColor: '#2b3140', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  secondary: { backgroundColor: '#3a4150' },
  buttonText: { color: '#fff', fontWeight: '600' },
  empty: { color: '#9aa0a6', textAlign: 'center', paddingVertical: 16 },
});
