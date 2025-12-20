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
  Keyboard,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { MainStackParamList } from '../navigation/MainNavigator';
import Card from '../components/common/Card';
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

export default function ProfileScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [tokenPrefs, setTokenPrefs] = useState<TokenPreference[]>([]);

  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Add wallet modal
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletChain, setNewWalletChain] = useState('sepolia');
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [addingWallet, setAddingWallet] = useState(false);
  const walletInputRef = useRef<TextInput>(null);

  // Add token preference modal
  const [showAddTokenPref, setShowAddTokenPref] = useState(false);
  const [newPrefToken, setNewPrefToken] = useState('ETH');
  const [newPrefChain, setNewPrefChain] = useState('sepolia');
  const [addingTokenPref, setAddingTokenPref] = useState(false);

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
      Alert.alert('Error', 'No active wallet found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = await loginWithWallet(activeAccount.address);

      if (!token) {
        Alert.alert('Error', 'Failed to authenticate. Please check your network connection.');
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
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
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
      Alert.alert(
        'Invalid Nickname',
        'Nickname must be 3-20 characters (letters, numbers, underscore only)'
      );
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

      setProfile(prev => prev ? { ...prev, nickname: newNickname } : null);
      setEditingNickname(false);
      Alert.alert('Success', 'Nickname updated successfully');
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

  const handleAddWallet = () => {
    setShowAddWallet(true);
  };

  const handleSaveWallet = async () => {
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

      await addWallet(token, newWalletChain, newWalletAddress.trim(), false);

      // Reload wallets
      const walletsData = await getWallets(token);
      setWallets(walletsData);

      setShowAddWallet(false);
      setNewWalletAddress('');
      Alert.alert('Success', 'Wallet added successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to add wallet');
    } finally {
      setAddingWallet(false);
    }
  };

  const handleAddTokenPreference = () => {
    setShowAddTokenPref(true);
  };

  const handleSaveTokenPref = async () => {
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

      // Reload preferences
      const prefsData = await getTokenPreferences(token);
      setTokenPrefs(prefsData);

      setShowAddTokenPref(false);
      Alert.alert('Success', 'Token preference saved successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save preference');
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

              // Reload wallets
              const walletsData = await getWallets(token);
              setWallets(walletsData);

              Alert.alert('Success', 'Wallet deleted successfully');
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

              // Reload preferences
              const prefsData = await getTokenPreferences(token);
              setTokenPrefs(prefsData);

              Alert.alert('Success', 'Preference deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete preference');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAwareScreen 
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      withSafeArea={false}
    >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Profile & Nickname</Text>
          <View style={{ width: 24 }} />
        </View>

      {/* Avatar & Identity */}
      <Card style={styles.card}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="person" size={40} color={theme.colors.primary} />
          </View>
        </View>

        {/* Nickname */}
        <View style={styles.nicknameSection}>
          {editingNickname ? (
            <View style={styles.nicknameEdit}>
              <TextInput
                style={[
                  styles.nicknameInput,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                value={newNickname}
                onChangeText={setNewNickname}
                placeholder="Enter nickname"
                placeholderTextColor={theme.colors.textSecondary}
                autoFocus
              />
              <View style={styles.nicknameButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingNickname(false);
                    setNewNickname(profile?.nickname || '');
                  }}
                  style={[styles.nicknameButton, { backgroundColor: theme.colors.border }]}
                >
                  <Text style={[styles.nicknameButtonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveNickname}
                  style={[styles.nicknameButton, { backgroundColor: theme.colors.primary }]}
                  disabled={savingNickname}
                >
                  {savingNickname ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.nicknameButtonText, { color: '#FFFFFF' }]}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setEditingNickname(true)}
              style={styles.nicknameDisplay}
            >
              <Text style={[styles.nickname, { color: theme.colors.text }]}>
                @{profile?.nickname || 'set_nickname'}
              </Text>
              <Ionicons name="pencil" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Global ID */}
        <Text style={[styles.globalId, { color: theme.colors.textSecondary }]}>
          {profile?.globalId || 'Loading...'}
        </Text>

        <View style={[styles.hintBox, { backgroundColor: theme.colors.accent + '10' }]}>
          <Ionicons name="information-circle" size={16} color={theme.colors.accent} />
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            Others can send you crypto using @{profile?.nickname || 'nickname'} or your Global ID
          </Text>
        </View>
      </Card>

        {/* Wallets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Wallets & Networks
            </Text>
            <TouchableOpacity onPress={handleAddWallet}>
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {wallets.length === 0 ? (
            <Card style={styles.card}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No wallets added yet
              </Text>
            </Card>
          ) : (
            wallets.map((wallet, index) => (
              <Card key={index} style={styles.card}>
                <View style={styles.walletRow}>
                  <View style={styles.walletInfo}>
                    <View style={styles.walletHeader}>
                      <Text style={[styles.walletChain, { color: theme.colors.text }]}>
                        {wallet.chainId}
                      </Text>
                      {wallet.isPrimary && (
                        <View style={[styles.primaryBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                          <Text style={[styles.primaryText, { color: theme.colors.primary }]}>Primary</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.walletAddress, { color: theme.colors.textSecondary }]}>
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteWallet(wallet.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error || '#FF3B30'} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Token Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Token Preferences
            </Text>
            <TouchableOpacity onPress={handleAddTokenPreference}>
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {tokenPrefs.length === 0 ? (
            <Card style={styles.card}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No preferences set
              </Text>
              <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
                Set preferred networks for receiving specific tokens
              </Text>
            </Card>
          ) : (
            tokenPrefs.map((pref, index) => (
              <Card key={index} style={styles.card}>
                <View style={styles.prefRowContainer}>
                  <View style={styles.prefRow}>
                    <Text style={[styles.prefToken, { color: theme.colors.text }]}>
                      {pref.tokenSymbol}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.prefChain, { color: theme.colors.primary }]}>
                      {pref.preferredChainId}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteTokenPref(pref.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error || '#FF3B30'} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </View>

        <View style={styles.spacer} />

      {/* Add Wallet Modal */}
      <Modal
        visible={showAddWallet}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddWallet(false);
          setNewWalletAddress('');
          Keyboard.dismiss();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlayPressable}
            activeOpacity={1}
            onPress={() => {
              setShowAddWallet(false);
              setNewWalletAddress('');
              Keyboard.dismiss();
            }}
          >
            <View style={styles.modalBottomContainer}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View style={[styles.modalContentBottom, { backgroundColor: theme.colors.surface, maxHeight: '80%' }]}>
                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Wallet</Text>

                    <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Network</Text>
                    <View style={styles.chainSelectGrid}>
                      {['sepolia', 'mainnet', 'holesky'].map(chain => (
                        <TouchableOpacity
                          key={chain}
                          style={[
                            styles.chainSelectButton,
                            {
                              backgroundColor: newWalletChain === chain
                                ? theme.colors.primary + '20'
                                : theme.colors.background,
                              borderColor: newWalletChain === chain
                                ? theme.colors.primary
                                : theme.colors.border,
                            },
                          ]}
                          onPress={() => setNewWalletChain(chain)}
                        >
                          <Text
                            style={[
                              styles.chainSelectText,
                              { color: newWalletChain === chain ? theme.colors.primary : theme.colors.text },
                            ]}
                          >
                            {chain.charAt(0).toUpperCase() + chain.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Wallet Address</Text>
                    <TextInput
                      ref={walletInputRef}
                      style={[
                        styles.modalInput,
                        {
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.background,
                        },
                      ]}
                      value={newWalletAddress}
                      onChangeText={setNewWalletAddress}
                      placeholder="0x..."
                      placeholderTextColor={theme.colors.textSecondary}
                      autoCapitalize="none"
                    />

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                        onPress={() => {
                          setShowAddWallet(false);
                          setNewWalletAddress('');
                          Keyboard.dismiss();
                        }}
                      >
                        <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSaveWallet}
                        disabled={addingWallet}
                      >
                        {addingWallet ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Add</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Token Preference Modal */}
      <Modal
        visible={showAddTokenPref}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddTokenPref(false);
          Keyboard.dismiss();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlayPressable}
            activeOpacity={1}
            onPress={() => {
              setShowAddTokenPref(false);
              Keyboard.dismiss();
            }}
          >
            <View style={styles.modalBottomContainer}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View style={[styles.modalContentBottom, { backgroundColor: theme.colors.surface, maxHeight: '80%' }]}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Token Preference</Text>

                    <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Token</Text>
                    <View style={styles.tokenSelectGrid}>
                      {['ETH', 'USDC', 'USDT', 'DAI'].map(token => (
                        <TouchableOpacity
                          key={token}
                          style={[
                            styles.tokenSelectButton,
                            {
                              backgroundColor: newPrefToken === token
                                ? theme.colors.primary + '20'
                                : theme.colors.background,
                              borderColor: newPrefToken === token
                                ? theme.colors.primary
                                : theme.colors.border,
                            },
                          ]}
                          onPress={() => setNewPrefToken(token)}
                        >
                          <Text
                            style={[
                              styles.tokenSelectText,
                              { color: newPrefToken === token ? theme.colors.primary : theme.colors.text },
                            ]}
                          >
                            {token}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Preferred Network</Text>
                    <View style={styles.chainSelectGrid}>
                      {['sepolia', 'mainnet', 'holesky'].map(chain => (
                        <TouchableOpacity
                          key={chain}
                          style={[
                            styles.chainSelectButton,
                            {
                              backgroundColor: newPrefChain === chain
                                ? theme.colors.primary + '20'
                                : theme.colors.background,
                              borderColor: newPrefChain === chain
                                ? theme.colors.primary
                                : theme.colors.border,
                            },
                          ]}
                          onPress={() => setNewPrefChain(chain)}
                        >
                          <Text
                            style={[
                              styles.chainSelectText,
                              { color: newPrefChain === chain ? theme.colors.primary : theme.colors.text },
                            ]}
                          >
                            {chain.charAt(0).toUpperCase() + chain.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                        onPress={() => {
                          setShowAddTokenPref(false);
                          Keyboard.dismiss();
                        }}
                      >
                        <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSaveTokenPref}
                        disabled={addingTokenPref}
                      >
                        {addingTokenPref ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
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
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nicknameSection: {
    width: '100%',
    marginBottom: 12,
  },
  nicknameDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nickname: {
    fontSize: 24,
    fontWeight: '600',
  },
  nicknameEdit: {
    width: '100%',
  },
  nicknameInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  nicknameButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  nicknameButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nicknameButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  globalId: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  hint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletInfo: {
    flex: 1,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  walletChain: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  primaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  primaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  walletAddress: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  prefRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  prefToken: {
    fontSize: 15,
    fontWeight: '600',
  },
  prefChain: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  spacer: {
    height: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayPressable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
  },
  modalBottomContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalContentBottom: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  chainSelectGrid: {
    gap: 8,
    marginBottom: 12,
  },
  chainSelectButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  chainSelectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tokenSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tokenSelectButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  tokenSelectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
