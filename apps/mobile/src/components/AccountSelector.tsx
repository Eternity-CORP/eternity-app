/**
 * AccountSelector Component
 * Bottom sheet for selecting and managing wallet accounts
 * Shows TEST/REAL badges next to each account
 */

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { FontAwesome } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import {
  switchAccount,
  addAccountThunk,
  updateAccountLabel,
  importWalletThunk,
  reorderAccounts,
  type Account,
} from '@/src/store/slices/wallet-slice';
import { saveAccounts } from '@/src/services/wallet-service';
import { formatUsdValue, fetchAllBalances } from '@/src/services/balance-service';
import { getUsernameByAddress } from '@/src/services/username-service';
import { AccountTypeBadge } from '@/src/components/AccountTypeBadge';
import { theme } from '@/src/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Generate unique gradient colors from address (like web3 identicons)
function generateAvatarColors(address: string): [string, string] {
  const hash = address.toLowerCase().replace('0x', '');
  const color1 = '#' + hash.slice(0, 6);
  const r = parseInt(hash.slice(6, 8), 16);
  const g = parseInt(hash.slice(8, 10), 16);
  const b = parseInt(hash.slice(10, 12), 16);
  const color2 = `rgb(${(r + 128) % 256}, ${(g + 64) % 256}, ${(b + 192) % 256})`;
  return [color1, color2];
}

export interface AccountSelectorProps {
  isEditMode: boolean;
  onEditModeChange: (editMode: boolean) => void;
  onClose: () => void;
  onShowAddWalletMenu: () => void;
}

export function AccountSelector({
  isEditMode,
  onEditModeChange,
  onClose,
  onShowAddWalletMenu,
}: AccountSelectorProps) {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);

  const [editingAccountIndex, setEditingAccountIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [accountUsernames, setAccountUsernames] = useState<Record<string, string | null>>({});

  // Fetch balances and usernames on mount
  useEffect(() => {
    const fetchBalances = async () => {
      const balancePromises = wallet.accounts.map(async (account) => {
        try {
          const result = await fetchAllBalances(account.address);
          return { address: account.address, balance: result.totalUsdValue };
        } catch {
          return { address: account.address, balance: 0 };
        }
      });

      const results = await Promise.all(balancePromises);
      const balances: Record<string, number> = {};
      results.forEach(({ address, balance }) => {
        balances[address] = balance;
      });
      setAccountBalances(balances);
    };

    const fetchUsernames = async () => {
      const usernamePromises = wallet.accounts.map(async (account) => {
        try {
          const username = await getUsernameByAddress(account.address);
          return { address: account.address, username };
        } catch {
          return { address: account.address, username: null };
        }
      });

      const results = await Promise.all(usernamePromises);
      const usernames: Record<string, string | null> = {};
      results.forEach(({ address, username }) => {
        usernames[address] = username;
      });
      setAccountUsernames(usernames);
    };

    fetchBalances();
    fetchUsernames();
  }, [wallet.accounts]);

  const handleSwitchAccount = useCallback(
    (address: string) => {
      if (isEditMode) return;
      const index = wallet.accounts.findIndex((a) => a.address === address);
      if (index !== -1) {
        dispatch(switchAccount(index));
        onClose();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [dispatch, isEditMode, onClose, wallet.accounts]
  );

  const handleSaveLabel = useCallback(
    async (accountIndex: number) => {
      const trimmedLabel = editLabel.trim();
      dispatch(updateAccountLabel({ accountIndex, label: trimmedLabel || undefined }));

      const updatedAccounts = wallet.accounts.map((acc) =>
        acc.accountIndex === accountIndex ? { ...acc, label: trimmedLabel || undefined } : acc
      );

      try {
        await saveAccounts(updatedAccounts);
        setEditingAccountIndex(null);
        setEditLabel('');
      } catch {
        Alert.alert('Error', 'Failed to save');
      }
    },
    [dispatch, editLabel, wallet.accounts]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Account[] }) => {
      dispatch(reorderAccounts(data));
      saveAccounts(data);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [dispatch]
  );

  const renderAccountItem = useCallback(
    ({ item: account, drag, isActive }: RenderItemParams<Account>) => {
      const [color1, color2] = generateAvatarColors(account.address);
      const accountIndex = wallet.accounts.findIndex((a) => a.address === account.address);
      const isSelected = accountIndex === wallet.currentAccountIndex;
      const accountBalance = formatUsdValue(accountBalances[account.address] ?? 0);

      // Editing mode for this specific account
      if (editingAccountIndex === account.accountIndex) {
        return (
          <View style={styles.editAccountContainer}>
            <TextInput
              style={styles.editAccountInput}
              value={editLabel}
              onChangeText={setEditLabel}
              placeholder="Account name"
              placeholderTextColor={theme.colors.textTertiary}
              autoFocus
            />
            <View style={styles.editAccountActions}>
              <TouchableOpacity
                style={styles.editAccountCancel}
                onPress={() => {
                  setEditingAccountIndex(null);
                  setEditLabel('');
                }}
              >
                <Text style={styles.editAccountCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editAccountSave}
                onPress={() => handleSaveLabel(account.accountIndex)}
              >
                <Text style={styles.editAccountSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      return (
        <ScaleDecorator>
          <TouchableOpacity
            style={[styles.accountListItem, isActive && styles.accountListItemDragging]}
            onPress={() =>
              isEditMode
                ? (setEditingAccountIndex(account.accountIndex),
                  setEditLabel(account.label || ''))
                : handleSwitchAccount(account.address)
            }
            activeOpacity={0.7}
            disabled={isActive}
          >
            {/* Drag handle - only in edit mode */}
            {isEditMode && (
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={100}
                style={styles.dragHandle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <FontAwesome name="bars" size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            )}

            {/* Gradient avatar based on address */}
            <LinearGradient
              colors={[color1, color2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.accountAvatar}
            />

            <View style={styles.accountListInfo}>
              {/* Account name row with badge */}
              <View style={styles.accountNameRow}>
                <Text style={styles.accountListName}>
                  {account.label || `Account ${account.accountIndex + 1}`}
                </Text>
                <AccountTypeBadge type={account.type} size="small" />
              </View>

              {/* Username if exists */}
              {accountUsernames[account.address] && (
                <Text style={styles.accountUsername}>@{accountUsernames[account.address]}</Text>
              )}

              {/* Balance */}
              <Text style={styles.accountListBalance}>{accountBalance}</Text>
            </View>

            {isEditMode ? (
              <FontAwesome name="pencil" size={16} color={theme.colors.textTertiary} />
            ) : isSelected ? (
              <FontAwesome name="check" size={18} color={theme.colors.accent} />
            ) : null}
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [
      wallet.accounts,
      wallet.currentAccountIndex,
      accountBalances,
      accountUsernames,
      editingAccountIndex,
      editLabel,
      isEditMode,
      handleSaveLabel,
      handleSwitchAccount,
    ]
  );

  return (
    <>
      <DraggableFlatList
        data={wallet.accounts}
        keyExtractor={(item) => item.id}
        onDragEnd={handleDragEnd}
        onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        containerStyle={styles.accountsList}
        renderItem={renderAccountItem}
      />

      {/* Add Wallet Button */}
      <TouchableOpacity style={styles.addWalletButton} onPress={onShowAddWalletMenu}>
        <Text style={styles.addWalletButtonText}>Add Wallet</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  accountsList: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  accountListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  accountListItemDragging: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    padding: theme.spacing.sm,
    marginLeft: -theme.spacing.xs,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountListInfo: {
    flex: 1,
    gap: 2,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  accountListName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  accountUsername: {
    ...theme.typography.caption,
    color: theme.colors.success,
    marginTop: 2,
  },
  accountListBalance: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  // Edit account inline
  editAccountContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  editAccountInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editAccountActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
  },
  editAccountCancel: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  editAccountCancelText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  editAccountSave: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  editAccountSaveText: {
    ...theme.typography.body,
    color: theme.colors.buttonPrimaryText,
    fontWeight: '600',
  },
  // Add Wallet Button
  addWalletButton: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  addWalletButtonText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
});
