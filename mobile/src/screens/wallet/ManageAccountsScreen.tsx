import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '../../context/WalletContext';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScreen } from '../../components/common/KeyboardAwareScreen';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/common/Card';
import Avatar from '../../components/common/Avatar';
import { MainStackParamList } from '../../navigation/MainNavigator';

type Props = NativeStackScreenProps<MainStackParamList, 'ManageAccounts'>;

export default function ManageAccountsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { accounts, activeAccount, renameAccount, deleteAccount, switchAccount, canDeleteAccount, busy } = useWallet();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newName, setNewName] = useState<string>('');

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
      style={[styles.container, { backgroundColor: theme.colors.background }]} 
      withSafeArea={false}
    >
      {/* Header - Telegram/TON Wallet style */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Manage Accounts</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {accounts.map((a, index) => {
          const isActive = activeAccount?.index === a.index;
          const isEditing = editingIndex === a.index;

          return (
            <Card key={a.index} style={[styles.accountCard, index === 0 && styles.firstCard]}>
              {isEditing ? (
                <View style={styles.editContainer}>
                  <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      value={newName}
                      onChangeText={setNewName}
                      placeholder="Account name"
                      placeholderTextColor={theme.colors.textSecondary}
                      editable={!busy}
                      autoFocus
                    />
                  </View>
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={[styles.editButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                      onPress={saveEdit}
                      disabled={busy}
                    >
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.editButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editButton, styles.cancelButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                      onPress={() => {
                        setEditingIndex(null);
                        setNewName('');
                      }}
                      disabled={busy}
                    >
                      <Ionicons name="close" size={18} color={theme.colors.text} />
                      <Text style={[styles.editButtonText, { color: theme.colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.accountHeader}>
                    <View style={styles.accountLeft}>
                      <Avatar address={a.address} size={48} />
                      <View style={styles.accountInfo}>
                        <View style={styles.accountNameRow}>
                          <Text style={[styles.accountName, { color: theme.colors.text }]}>{a.name}</Text>
                          {isActive && (
                            <View style={[styles.activeBadge, { backgroundColor: theme.colors.primary }]}>
                              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.accountAddress, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {a.address}
                        </Text>
                        <Text style={[styles.accountPath, { color: theme.colors.textSecondary }]}>
                          Path: m/44'/60'/0'/0/{a.index}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        isActive ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      ]}
                      onPress={() => switchAccount(a.index)}
                      disabled={busy || isActive}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={isActive ? '#FFFFFF' : theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                      onPress={() => {
                        setEditingIndex(a.index);
                        setNewName(a.name);
                      }}
                      disabled={busy}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil-outline" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                        (!canDeleteAccount(a.index) || busy) && styles.actionButtonDisabled,
                      ]}
                      onPress={() => handleDelete(a.index)}
                      disabled={!canDeleteAccount(a.index) || busy}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={canDeleteAccount(a.index) ? theme.colors.error : theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Card>
          );
        })}

        {accounts.length === 0 && (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No accounts</Text>
            </View>
          </Card>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  accountCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  firstCard: {
    marginTop: 0,
  },
  accountHeader: {
    marginBottom: 16,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
  },
  activeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountAddress: {
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  accountPath: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  editContainer: {
    gap: 12,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  saveButton: {
    borderWidth: 0,
  },
  cancelButton: {
    // Border set dynamically
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyCard: {
    marginHorizontal: 16,
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  spacer: {
    height: 40,
  },
});