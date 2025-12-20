/**
 * AccountAndProfileScreen - Unified account and profile management
 *
 * Combines:
 * - Local HD wallet account management (switch, rename, delete)
 * - Global profile settings (nickname, global ID)
 * - Wallet addresses per network
 * - Token preferences
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { MainStackParamList } from '../navigation/MainNavigator';
import Card from '../components/common/Card';
import Avatar from '../components/common/Avatar';
import {
  getMyProfile,
  updateNickname,
  getWallets,
  addWallet,
  deleteWallet,
  getTokenPreferences,
  setTokenPreference,
  deleteTokenPreference,
  UserProfile,
} from '../services/api/identityService';
import { loginWithWallet } from '../services/authService';
import { KeyboardAwareScreen } from '../components/common/KeyboardAwareScreen';

type Props = NativeStackScreenProps<MainStackParamList, 'Profile'>;

type Tab = 'accounts' | 'profile';

interface Wallet {
  id: number;
  chainId: string;
  address: string;
  isPrimary: boolean;
  label?: string;
}

interface TokenPreference {
  id: number;
  tokenSymbol: string;
  preferredChainId: string;
}

export default function AccountAndProfileScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { accounts, activeAccount, renameAccount, deleteAccount, switchAccount, createAccount, canDeleteAccount, busy } = useWallet();

  const scrollViewRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<Tab>('accounts');

  // Account management state
  const [editingAccountIndex, setEditingAccountIndex] = useState<number | null>(null);
  const [newAccountName, setNewAccountName] = useState('');

  // Profile state
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [tokenPrefs, setTokenPrefs] = useState<TokenPreference[]>([]);

  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);

  // Add wallet modal
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletChain, setNewWalletChain] = useState('sepolia');
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [addingWallet, setAddingWallet] = useState(false);

  // Add token preference modal
  const [showAddTokenPref, setShowAddTokenPref] = useState(false);
  const [newPrefToken, setNewPrefToken] = useState('ETH');
  const [newPrefChain, setNewPrefChain] = useState('sepolia');
  const [addingTokenPref, setAddingTokenPref] = useState(false);

  useEffect(() => {
    if (activeTab === 'profile') {
      loadProfile();
    }
  }, [activeTab]);

  useEffect(() => {
    if (editingNickname) {
      // Scroll to nickname section when editing starts
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  }, [editingNickname]);

  const loadProfile = async () => {
    if (!activeAccount?.address) {
      return;
    }

    try {
      setLoading(true);
      const token = await loginWithWallet(activeAccount.address);

      if (!token) {
        console.warn('Failed to authenticate');
        return;
      }

      const [profileData, walletsData, prefsData] = await Promise.all([
        getMyProfile(token),
        getWallets(token),
        getTokenPreferences(token),
      ]);

      console.log('DEBUG: Wallets loaded:', walletsData);
      console.log('DEBUG: Token prefs loaded:', prefsData);

      setProfile(profileData);
      setWallets(walletsData);
      setTokenPrefs(prefsData);
      setNewNickname(profileData.nickname || '');
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Account management handlers
  const handleSaveAccountName = async () => {
    if (editingAccountIndex === null) return;
    try {
      await renameAccount(editingAccountIndex, newAccountName);
      setEditingAccountIndex(null);
      setNewAccountName('');
    } catch (e: any) {
      Alert.alert('Rename failed', e?.message || 'Invalid name');
    }
  };

  const handleDeleteAccount = async (index: number) => {
    if (!canDeleteAccount(index)) {
      const reason = accounts.length <= 1
        ? 'Cannot delete the last remaining account'
        : 'Cannot delete account with active transactions';
      Alert.alert('Delete not allowed', reason);
      return;
    }
    Alert.alert('Delete Account', 'Are you sure you want to delete this account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount(index);
          } catch (e: any) {
            Alert.alert('Delete failed', e?.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const handleCreateAccount = async () => {
    try {
      await createAccount();
      Alert.alert('Success', 'New account created successfully');
    } catch (e: any) {
      Alert.alert('Failed to create account', e?.message || 'Unknown error');
    }
  };

  // Profile handlers
  const handleSaveNickname = async () => {
    if (!activeAccount?.address) {
      Alert.alert('Error', 'No active wallet found');
      return;
    }

    if (!newNickname.trim()) {
      Alert.alert('Error', 'Nickname cannot be empty');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(newNickname)) {
      Alert.alert('Invalid Nickname', 'Nickname must be 3-20 characters (letters, numbers, underscore only)');
      return;
    }

    try {
      setSavingNickname(true);
      const token = await loginWithWallet(activeAccount.address);

      if (!token) {
        Alert.alert('Error', 'Failed to authenticate. Please try again.');
        return;
      }

      await updateNickname(token, newNickname);

      setProfile((prev) => (prev ? { ...prev, nickname: newNickname } : null));
      setEditingNickname(false);
      Alert.alert('Success', 'Nickname updated successfully');

      // Reload to get updated Global ID
      await loadProfile();
    } catch (error: any) {
      if (error.response?.data?.code === 'NICKNAME_TAKEN') {
        Alert.alert('Error', 'This nickname is already taken');
      } else {
        Alert.alert('Error', 'Failed to update nickname');
      }
    } finally {
      setSavingNickname(false);
    }
  };

  const handleAddWallet = async () => {
    if (!activeAccount?.address) {
      Alert.alert('Error', 'No active wallet found');
      return;
    }

    if (!newWalletAddress.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    try {
      setAddingWallet(true);
      const token = await loginWithWallet(activeAccount.address);

      if (!token) {
        Alert.alert('Error', 'Failed to authenticate. Please try again.');
        return;
      }

      await addWallet(token, newWalletChain, newWalletAddress, false);

      setShowAddWallet(false);
      setNewWalletAddress('');
      setNewWalletChain('sepolia');
      Alert.alert('Success', 'Wallet added successfully');
      await loadProfile();
    } catch (error: any) {
      if (error.response?.data?.code === 'WALLET_ALREADY_EXISTS') {
        Alert.alert('Error', 'This wallet is already registered for this network');
      } else {
        Alert.alert('Error', 'Failed to add wallet');
      }
    } finally {
      setAddingWallet(false);
    }
  };

  const handleAddTokenPref = async () => {
    if (!activeAccount?.address) {
      Alert.alert('Error', 'No active wallet found');
      return;
    }

    try {
      setAddingTokenPref(true);
      const token = await loginWithWallet(activeAccount.address);

      if (!token) {
        Alert.alert('Error', 'Failed to authenticate. Please try again.');
        return;
      }

      await setTokenPreference(token, newPrefToken, newPrefChain);

      setShowAddTokenPref(false);
      setNewPrefToken('ETH');
      setNewPrefChain('sepolia');
      Alert.alert('Success', 'Token preference saved successfully');
      await loadProfile();
    } catch (error) {
      Alert.alert('Error', 'Failed to save token preference');
    } finally {
      setAddingTokenPref(false);
    }
  };

  const handleDeleteWallet = async (walletId: number) => {
    if (!activeAccount?.address) {
      Alert.alert('Error', 'No active wallet found');
      return;
    }

    Alert.alert(
      'Delete Wallet',
      'Are you sure you want to delete this wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await loginWithWallet(activeAccount.address);
              if (!token) {
                Alert.alert('Error', 'Failed to authenticate. Please try again.');
                return;
              }

              await deleteWallet(token, walletId);
              Alert.alert('Success', 'Wallet deleted successfully');
              await loadProfile();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete wallet');
            }
          },
        },
      ]
    );
  };

  const handleDeleteTokenPref = async (prefId: number) => {
    if (!activeAccount?.address) {
      Alert.alert('Error', 'No active wallet found');
      return;
    }

    Alert.alert(
      'Delete Preference',
      'Are you sure you want to delete this token preference?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await loginWithWallet(activeAccount.address);
              if (!token) {
                Alert.alert('Error', 'Failed to authenticate. Please try again.');
                return;
              }

              await deleteTokenPreference(token, prefId);
              Alert.alert('Success', 'Preference deleted successfully');
              await loadProfile();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete preference');
            }
          },
        },
      ]
    );
  };

  // Render account management tab
  const renderAccountsTab = () => (
    <View>
      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Local Accounts</Text>
          <TouchableOpacity
            onPress={handleCreateAccount}
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            disabled={busy}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
          Manage your HD wallet accounts. All accounts are derived from your seed phrase.
        </Text>

        {accounts.map((a) => (
          <View
            key={a.index}
            style={[
              styles.accountItem,
              {
                backgroundColor: activeAccount?.index === a.index ? theme.colors.primary + '10' : theme.colors.surface,
                borderColor: activeAccount?.index === a.index ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            {editingAccountIndex === a.index ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={[styles.editInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  value={newAccountName}
                  onChangeText={setNewAccountName}
                  editable={!busy}
                  placeholder="Account name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    onPress={handleSaveAccountName}
                    style={[styles.editActionButton, { backgroundColor: theme.colors.success }]}
                    disabled={busy}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditingAccountIndex(null)}
                    style={[styles.editActionButton, { backgroundColor: theme.colors.error }]}
                    disabled={busy}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <View style={styles.accountHeader}>
                    <Avatar address={a.address} size={32} />
                    <Text style={[styles.accountName, { color: theme.colors.text }]}>{a.name}</Text>
                    {activeAccount?.index === a.index && (
                      <View style={[styles.activeBadge, { backgroundColor: theme.colors.success }]}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.accountAddress, { color: theme.colors.textSecondary }]}>
                    {a.address.slice(0, 10)}...{a.address.slice(-8)}
                  </Text>
                  <Text style={[styles.accountPath, { color: theme.colors.muted }]}>
                    Path: m/44'/60'/0'/0/{a.index}
                  </Text>
                </View>
                <View style={styles.accountActions}>
                  <TouchableOpacity
                    onPress={() => switchAccount(a.index)}
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                    disabled={busy || activeAccount?.index === a.index}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingAccountIndex(a.index);
                      setNewAccountName(a.name);
                    }}
                    style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
                    disabled={busy}
                  >
                    <Ionicons name="pencil-outline" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteAccount(a.index)}
                    style={[styles.actionButton, { backgroundColor: canDeleteAccount(a.index) ? theme.colors.error : theme.colors.border }]}
                    disabled={!canDeleteAccount(a.index) || busy}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ))}
      </Card>
    </View>
  );

  // Render profile management tab
  const renderProfileTab = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading profile...</Text>
        </View>
      );
    }

    if (!profile) {
      return (
        <Card style={styles.card}>
          <View style={styles.emptyState}>
            <Ionicons name="person-circle-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Profile Found</Text>
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
              Failed to load profile. Check your network connection.
            </Text>
            <TouchableOpacity
              onPress={loadProfile}
              style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </Card>
      );
    }

    return (
      <View>
        {/* Global Identity */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Global Identity</Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Your identity on the Eternity network
          </Text>

          <View style={styles.profileInfo}>
            <View style={styles.profileRow}>
              <Text style={[styles.profileLabel, { color: theme.colors.textSecondary }]}>Global ID</Text>
              <View style={[styles.profileValue, { backgroundColor: theme.colors.primary + '10' }]}>
                <Ionicons name="at" size={16} color={theme.colors.primary} />
                <Text style={[styles.globalId, { color: theme.colors.primary }]}>{profile.globalId}</Text>
              </View>
            </View>

            <View style={styles.profileRow}>
              <Text style={[styles.profileLabel, { color: theme.colors.textSecondary }]}>Nickname</Text>
              {editingNickname ? (
                <View style={styles.nicknameEdit}>
                  <TextInput
                    style={[styles.nicknameInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                    value={newNickname}
                    onChangeText={setNewNickname}
                    placeholder="Enter nickname"
                    placeholderTextColor={theme.colors.textSecondary}
                    editable={!savingNickname}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      onPress={handleSaveNickname}
                      style={[styles.editActionButton, { backgroundColor: theme.colors.success }]}
                      disabled={savingNickname}
                    >
                      {savingNickname ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingNickname(false);
                        setNewNickname(profile.nickname || '');
                      }}
                      style={[styles.editActionButton, { backgroundColor: theme.colors.error }]}
                      disabled={savingNickname}
                    >
                      <Ionicons name="close" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setEditingNickname(true)}
                  style={styles.nicknameDisplay}
                >
                  <Text style={[styles.nicknameText, { color: theme.colors.text }]}>
                    {profile.nickname || 'Not set'}
                  </Text>
                  <Ionicons name="pencil" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>

        {/* Registered Wallets */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Registered Wallets</Text>
            <TouchableOpacity
              onPress={() => setShowAddWallet(true)}
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Wallet</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Wallets linked to your identity for different networks
          </Text>

          {wallets.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No wallets registered yet</Text>
          ) : (
            wallets.map((wallet, index) => {
              console.log('DEBUG: Rendering wallet:', wallet);
              return (
                <View key={index} style={[styles.walletItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.walletHeader}>
                      <Text style={[styles.walletChain, { color: theme.colors.primary }]}>{wallet.chainId}</Text>
                      {wallet.isPrimary && (
                        <View style={[styles.primaryBadge, { backgroundColor: theme.colors.success }]}>
                          <Text style={styles.primaryBadgeText}>Primary</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.walletAddress, { color: theme.colors.text }]}>
                      {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('DEBUG: Delete clicked, wallet.id =', wallet.id);
                      handleDeleteWallet(wallet.id);
                    }}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error || '#FF3B30'} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </Card>

        {/* Token Preferences */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Token Preferences</Text>
            <TouchableOpacity
              onPress={() => setShowAddTokenPref(true)}
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Preference</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Preferred networks for receiving specific tokens
          </Text>

          {tokenPrefs.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No preferences set</Text>
          ) : (
            tokenPrefs.map((pref, index) => (
              <View key={index} style={[styles.prefItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={[styles.prefToken, { color: theme.colors.text }]}>{pref.tokenSymbol}</Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.prefChain, { color: theme.colors.primary }]}>{pref.preferredChainId}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteTokenPref(pref.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.colors.error || '#FF3B30'} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>
      </View>
    );
  };

  return (
    <KeyboardAwareScreen
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      withSafeArea={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Account & Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: activeTab === 'accounts' ? theme.colors.primary : 'transparent' }]}
          onPress={() => setActiveTab('accounts')}
        >
          <Ionicons name="wallet-outline" size={20} color={activeTab === 'accounts' ? '#FFFFFF' : theme.colors.textSecondary} />
          <Text style={[styles.tabLabel, { color: activeTab === 'accounts' ? '#FFFFFF' : theme.colors.textSecondary }]}>
            Local Accounts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: activeTab === 'profile' ? theme.colors.primary : 'transparent' }]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons name="person-outline" size={20} color={activeTab === 'profile' ? '#FFFFFF' : theme.colors.textSecondary} />
          <Text style={[styles.tabLabel, { color: activeTab === 'profile' ? '#FFFFFF' : theme.colors.textSecondary }]}>
            Global Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View>
        {activeTab === 'accounts' ? renderAccountsTab() : renderProfileTab()}
        <View style={styles.spacer} />
      </View>

      {/* Add Wallet Modal */}
      <Modal visible={showAddWallet} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 34 }}
              activeOpacity={1}
              onPress={() => setShowAddWallet(false)}
            >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Wallet</Text>

                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Network</Text>
                    <View style={styles.chainSelector}>
                      {['sepolia', 'mainnet', 'holesky'].map((chain) => (
                        <TouchableOpacity
                          key={chain}
                          style={[
                            styles.chainOption,
                            {
                              backgroundColor: newWalletChain === chain ? theme.colors.primary : theme.colors.surface,
                              borderColor: newWalletChain === chain ? theme.colors.primary : theme.colors.border,
                            },
                          ]}
                          onPress={() => setNewWalletChain(chain)}
                        >
                          <Text style={[styles.chainOptionText, { color: newWalletChain === chain ? '#FFFFFF' : theme.colors.text }]}>
                            {chain}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Wallet Address</Text>
                    <TextInput
                      style={[
                        styles.modalInput,
                        { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                      ]}
                      value={newWalletAddress}
                      onChangeText={setNewWalletAddress}
                      placeholder="0x..."
                      placeholderTextColor={theme.colors.textSecondary}
                      editable={!addingWallet}
                    />

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        onPress={() => setShowAddWallet(false)}
                        style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
                        disabled={addingWallet}
                      >
                        <Text style={styles.modalButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleAddWallet}
                        style={[styles.modalButton, { backgroundColor: theme.colors.success }]}
                        disabled={addingWallet}
                      >
                        {addingWallet ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.modalButtonText}>Add</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Token Preference Modal */}
      <Modal visible={showAddTokenPref} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 34 }}
              activeOpacity={1}
              onPress={() => setShowAddTokenPref(false)}
            >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Token Preference</Text>

                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Token</Text>
                    <View style={styles.chainSelector}>
                      {['ETH', 'USDC', 'USDT', 'DAI'].map((token) => (
                        <TouchableOpacity
                          key={token}
                          style={[
                            styles.chainOption,
                            {
                              backgroundColor: newPrefToken === token ? theme.colors.primary : theme.colors.surface,
                              borderColor: newPrefToken === token ? theme.colors.primary : theme.colors.border,
                            },
                          ]}
                          onPress={() => setNewPrefToken(token)}
                        >
                          <Text style={[styles.chainOptionText, { color: newPrefToken === token ? '#FFFFFF' : theme.colors.text }]}>
                            {token}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Preferred Network</Text>
                    <View style={styles.chainSelector}>
                      {['sepolia', 'mainnet', 'holesky'].map((chain) => (
                        <TouchableOpacity
                          key={chain}
                          style={[
                            styles.chainOption,
                            {
                              backgroundColor: newPrefChain === chain ? theme.colors.primary : theme.colors.surface,
                              borderColor: newPrefChain === chain ? theme.colors.primary : theme.colors.border,
                            },
                          ]}
                          onPress={() => setNewPrefChain(chain)}
                        >
                          <Text style={[styles.chainOptionText, { color: newPrefChain === chain ? '#FFFFFF' : theme.colors.text }]}>
                            {chain}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        onPress={() => setShowAddTokenPref(false)}
                        style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
                        disabled={addingTokenPref}
                      >
                        <Text style={styles.modalButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleAddTokenPref}
                        style={[styles.modalButton, { backgroundColor: theme.colors.success }]}
                        disabled={addingTokenPref}
                      >
                        {addingTokenPref ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.modalButtonText}>Add</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  accountItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountAddress: {
    fontSize: 13,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  accountPath: {
    fontSize: 11,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  accountActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editActionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  profileInfo: {
    gap: 16,
  },
  profileRow: {
    gap: 8,
  },
  profileLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  profileValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  globalId: {
    fontSize: 16,
    fontWeight: '600',
  },
  nicknameEdit: {
    flexDirection: 'row',
    gap: 8,
  },
  nicknameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  nicknameDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  nicknameText: {
    fontSize: 14,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  walletChain: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  walletAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  primaryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  prefItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  prefToken: {
    fontSize: 14,
    fontWeight: '600',
  },
  prefChain: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  chainSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chainOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
  },
  chainOptionText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    height: 20,
  },
});
