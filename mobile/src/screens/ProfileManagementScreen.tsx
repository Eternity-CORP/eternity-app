/**
 * ProfileManagementScreen - Manage ONLY the current active account's profile
 *
 * Features:
 * - Edit nickname for current account
 * - View Global ID
 * - Register wallet addresses for different networks
 * - Set token preferences
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
import * as Clipboard from 'expo-clipboard';
import {
  getMyProfile,
  updateNickname,
  getWallets,
  addWallet,
  updateWallet,
  deleteWallet,
  getTokenPreferences,
  setTokenPreference,
  updateTokenPreference,
  deleteTokenPreference,
  UserProfile,
} from '../services/api/identityService';
import { loginWithWallet } from '../services/authService';
import { KeyboardAwareScreen } from '../components/common/KeyboardAwareScreen';

type Props = NativeStackScreenProps<MainStackParamList, 'Profile'>;

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

export default function ProfileManagementScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();

  const scrollViewRef = useRef<ScrollView>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
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

  // Edit wallet modal
  const [showEditWallet, setShowEditWallet] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editWalletChain, setEditWalletChain] = useState('sepolia');
  const [editWalletAddress, setEditWalletAddress] = useState('');
  const [updatingWallet, setUpdatingWallet] = useState(false);

  // Edit token preference modal
  const [showEditTokenPref, setShowEditTokenPref] = useState(false);
  const [editingTokenPref, setEditingTokenPref] = useState<TokenPreference | null>(null);
  const [editPrefToken, setEditPrefToken] = useState('ETH');
  const [editPrefChain, setEditPrefChain] = useState('sepolia');
  const [updatingTokenPref, setUpdatingTokenPref] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

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
      setLoadingProfile(true);
      // Use shorter timeout for profile screen (10 seconds instead of 60)
      const token = await loginWithWallet(activeAccount.address, 10000);

      if (!token) {
        console.warn('[ProfileScreen] No auth token, skipping profile load');
        return;
      }

      const [profileData, walletsData, prefsData] = await Promise.all([
        getMyProfile(token),
        getWallets(token),
        getTokenPreferences(token),
      ]);

      setProfile(profileData);
      setWallets(walletsData);
      setTokenPrefs(prefsData);
      setNewNickname(profileData.nickname || '');
    } catch (error) {
      console.error('[ProfileScreen] Failed to load profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCopyGlobalId = async () => {
    if (profile?.globalId) {
      await Clipboard.setStringAsync(profile.globalId);
      Alert.alert('Copied!', `Global ID "${profile.globalId}" copied to clipboard`);
    }
  };

  const handleCopyNickname = async () => {
    if (profile?.nickname) {
      await Clipboard.setStringAsync(profile.nickname);
      Alert.alert('Copied!', `Nickname "${profile.nickname}" copied to clipboard`);
    }
  };

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
      const token = await loginWithWallet(activeAccount.address, 10000);

      if (!token) {
        Alert.alert('Error', 'Failed to authenticate. Backend may be unavailable.');
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
      const token = await loginWithWallet(activeAccount.address, 10000);

      if (!token) {
        Alert.alert('Error', 'Failed to authenticate. Backend may be unavailable.');
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
      const token = await loginWithWallet(activeAccount.address, 10000);

      if (!token) {
        Alert.alert('Error', 'Failed to authenticate. Backend may be unavailable.');
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
              const token = await loginWithWallet(activeAccount.address, 10000);
              if (!token) {
                Alert.alert('Error', 'Failed to authenticate. Please try again.');
                return;
              }

              await deleteWallet(token, walletId);
              Alert.alert('Success', 'Wallet deleted successfully');
              await loadProfile();
            } catch (error: any) {
              console.error('Failed to delete wallet:', error);
              Alert.alert('Error', error?.response?.data?.message || 'Failed to delete wallet');
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
      'Delete Token Preference',
      'Are you sure you want to delete this token preference?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await loginWithWallet(activeAccount.address, 10000);
              if (!token) {
                Alert.alert('Error', 'Failed to authenticate. Please try again.');
                return;
              }

              await deleteTokenPreference(token, prefId);
              Alert.alert('Success', 'Token preference deleted successfully');
              await loadProfile();
            } catch (error: any) {
              console.error('Failed to delete token preference:', error);
              Alert.alert('Error', error?.response?.data?.message || 'Failed to delete token preference');
            }
          },
        },
      ]
    );
  };

  const handleEditWallet = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setEditWalletChain(wallet.chainId);
    setEditWalletAddress(wallet.address);
    setShowEditWallet(true);
  };

  const handleSaveEditWallet = async () => {
    if (!activeAccount?.address || !editingWallet) {
      Alert.alert('Error', 'No wallet selected for editing');
      return;
    }

    if (!editWalletAddress.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    try {
      setUpdatingWallet(true);
      const token = await loginWithWallet(activeAccount.address, 10000);

      if (!token) {
        Alert.alert('Error', 'Failed to authenticate. Backend may be unavailable.');
        return;
      }

      await updateWallet(token, editingWallet.id, {
        chainId: editWalletChain,
        address: editWalletAddress,
      });

      setShowEditWallet(false);
      setEditingWallet(null);
      Alert.alert('Success', 'Wallet updated successfully');
      await loadProfile();
    } catch (error: any) {
      console.error('Failed to update wallet:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update wallet');
    } finally {
      setUpdatingWallet(false);
    }
  };

  const handleEditTokenPref = (pref: TokenPreference) => {
    setEditingTokenPref(pref);
    setEditPrefToken(pref.tokenSymbol);
    setEditPrefChain(pref.preferredChainId);
    setShowEditTokenPref(true);
  };

  const handleSaveEditTokenPref = async () => {
    if (!activeAccount?.address || !editingTokenPref) {
      Alert.alert('Error', 'No token preference selected for editing');
      return;
    }

    try {
      setUpdatingTokenPref(true);
      const token = await loginWithWallet(activeAccount.address, 10000);

      if (!token) {
        Alert.alert('Error', 'Failed to authenticate. Backend may be unavailable.');
        return;
      }

      await updateTokenPreference(token, editingTokenPref.id, {
        tokenSymbol: editPrefToken,
        preferredChainId: editPrefChain,
      });

      setShowEditTokenPref(false);
      setEditingTokenPref(null);
      Alert.alert('Success', 'Token preference updated successfully');
      await loadProfile();
    } catch (error: any) {
      console.error('Failed to update token preference:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update token preference');
    } finally {
      setUpdatingTokenPref(false);
    }
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Profile</Text>
          {loadingProfile && <ActivityIndicator size="small" color={theme.colors.primary} />}
        </View>
        <TouchableOpacity onPress={loadProfile} style={styles.refreshButton} disabled={loadingProfile}>
          <Ionicons name="refresh" size={20} color={loadingProfile ? theme.colors.textSecondary : theme.colors.primary} />
        </TouchableOpacity>
      </View>

        {/* Current Account Info */}
        <Card style={styles.card}>
          <View style={styles.accountInfo}>
            <Avatar address={activeAccount?.address || ''} size={64} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.accountName, { color: theme.colors.text }]}>{activeAccount?.name || 'Account'}</Text>
              <TouchableOpacity onPress={async () => {
                await Clipboard.setStringAsync(activeAccount?.address || '');
                Alert.alert('Copied!', 'Address copied to clipboard');
              }}>
                <Text style={[styles.accountAddress, { color: theme.colors.textSecondary }]}>
                  {activeAccount?.address.slice(0, 10)}...{activeAccount?.address.slice(-8)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {profile ? (
          <>
            {/* Global Identity */}
            <Card style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Global Identity</Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
                Your identity on the Eternity network
              </Text>

              <View style={styles.profileInfo}>
                <View style={styles.profileRow}>
                  <Text style={[styles.profileLabel, { color: theme.colors.textSecondary }]}>Global ID</Text>
                  <TouchableOpacity
                    onPress={handleCopyGlobalId}
                    style={[styles.profileValue, { backgroundColor: theme.colors.primary + '10' }]}
                  >
                    <Ionicons name="at" size={16} color={theme.colors.primary} />
                    <Text style={[styles.globalId, { color: theme.colors.primary }]}>{profile.globalId}</Text>
                    <Ionicons name="copy-outline" size={14} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.profileRow}>
                  <Text style={[styles.profileLabel, { color: theme.colors.textSecondary }]}>Nickname</Text>
                  {editingNickname ? (
                    <View style={styles.nicknameEdit}>
                      <TextInput
                        style={[
                          styles.nicknameInput,
                          { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                        ]}
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
                    <View style={styles.nicknameDisplay}>
                      <TouchableOpacity onPress={handleCopyNickname} style={{ flex: 1 }}>
                        <Text style={[styles.nicknameText, { color: theme.colors.text }]}>
                          {profile.nickname || 'Not set'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingNickname(true)} style={styles.editButton}>
                        <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
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
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
                Link addresses for different networks
              </Text>

              {wallets.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No wallets registered yet</Text>
              ) : (
                wallets.map((wallet, index) => (
                  <View
                    key={index}
                    style={[styles.walletItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.walletHeader}>
                        <Text style={[styles.walletChain, { color: theme.colors.primary }]}>{wallet.chainId}</Text>
                        {wallet.isPrimary && (
                          <View style={[styles.primaryBadge, { backgroundColor: theme.colors.success }]}>
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={async () => {
                          await Clipboard.setStringAsync(wallet.address);
                          Alert.alert('Copied!', 'Wallet address copied to clipboard');
                        }}
                      >
                        <Text style={[styles.walletAddress, { color: theme.colors.text }]}>
                          {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity
                        onPress={() => handleEditWallet(wallet)}
                        style={styles.editButton}
                      >
                        <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteWallet(wallet.id)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error || '#FF3B30'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
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
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
                Preferred networks for receiving tokens
              </Text>

              {tokenPrefs.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No preferences set</Text>
              ) : (
                tokenPrefs.map((pref, index) => (
                  <View
                    key={index}
                    style={[styles.prefItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={[styles.prefToken, { color: theme.colors.text }]}>{pref.tokenSymbol}</Text>
                      <Ionicons name="arrow-forward" size={16} color={theme.colors.textSecondary} />
                      <Text style={[styles.prefChain, { color: theme.colors.primary }]}>{pref.preferredChainId}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity
                        onPress={() => handleEditTokenPref(pref)}
                        style={styles.editButton}
                      >
                        <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteTokenPref(pref.id)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error || '#FF3B30'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </Card>
          </>
        ) : (
          <Card style={styles.card}>
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>Backend Unavailable</Text>
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                Global profile features require backend connection. You can still use the wallet normally.
              </Text>
              <TouchableOpacity onPress={loadProfile} style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        <View style={styles.spacer} />

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
                {addingWallet ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalButtonText}>Add</Text>}
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

      {/* Edit Wallet Modal */}
      <Modal visible={showEditWallet} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 34 }}
              activeOpacity={1}
              onPress={() => setShowEditWallet(false)}
            >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Wallet</Text>

            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Network</Text>
            <View style={styles.chainSelector}>
              {['sepolia', 'mainnet', 'holesky'].map((chain) => (
                <TouchableOpacity
                  key={chain}
                  style={[
                    styles.chainOption,
                    {
                      backgroundColor: editWalletChain === chain ? theme.colors.primary : theme.colors.surface,
                      borderColor: editWalletChain === chain ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setEditWalletChain(chain)}
                >
                  <Text style={[styles.chainOptionText, { color: editWalletChain === chain ? '#FFFFFF' : theme.colors.text }]}>
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
              value={editWalletAddress}
              onChangeText={setEditWalletAddress}
              placeholder="0x..."
              placeholderTextColor={theme.colors.textSecondary}
              editable={!updatingWallet}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowEditWallet(false)}
                style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
                disabled={updatingWallet}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEditWallet}
                style={[styles.modalButton, { backgroundColor: theme.colors.success }]}
                disabled={updatingWallet}
              >
                {updatingWallet ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
                  </View>
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Token Preference Modal */}
      <Modal visible={showEditTokenPref} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 34 }}
              activeOpacity={1}
              onPress={() => setShowEditTokenPref(false)}
            >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Token Preference</Text>

            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Token</Text>
            <View style={styles.chainSelector}>
              {['ETH', 'USDC', 'USDT', 'DAI'].map((token) => (
                <TouchableOpacity
                  key={token}
                  style={[
                    styles.chainOption,
                    {
                      backgroundColor: editPrefToken === token ? theme.colors.primary : theme.colors.surface,
                      borderColor: editPrefToken === token ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setEditPrefToken(token)}
                >
                  <Text style={[styles.chainOptionText, { color: editPrefToken === token ? '#FFFFFF' : theme.colors.text }]}>
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
                      backgroundColor: editPrefChain === chain ? theme.colors.primary : theme.colors.surface,
                      borderColor: editPrefChain === chain ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setEditPrefChain(chain)}
                >
                  <Text style={[styles.chainOptionText, { color: editPrefChain === chain ? '#FFFFFF' : theme.colors.text }]}>
                    {chain}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowEditTokenPref(false)}
                style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
                disabled={updatingTokenPref}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEditTokenPref}
                style={[styles.modalButton, { backgroundColor: theme.colors.success }]}
                disabled={updatingTokenPref}
              >
                {updatingTokenPref ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Save</Text>
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
  refreshButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountAddress: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    borderRadius: 6,
  },
  globalId: {
    flex: 1,
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
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editActionButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nicknameDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  nicknameText: {
    fontSize: 14,
  },
  editButton: {
    padding: 4,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 6,
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
    borderRadius: 6,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
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
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: 20,
    minHeight: 300,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 6,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  chainOptionText: {
    fontSize: 12,
    fontWeight: '500',
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
